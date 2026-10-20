use crate::config::{Account, Channel};
use crate::discord::{self, ApiError};
use crate::state::{now_ms, AppState};
use rand::{seq::IndexedRandom, Rng};
use serde::Serialize;
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter, Manager};
use tokio::sync::watch;

const LONG_COOLDOWN_THRESHOLD: u64 = 1200;

#[derive(Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct ChannelRun {
    pub next_ready: u64,
    pub post_count: u32,
    pub last_error: Option<String>,
}

#[derive(Serialize, Clone, Default)]
#[serde(rename_all = "camelCase")]
pub struct RunState {
    pub channels: HashMap<String, ChannelRun>,
    pub total_posts: u32,
    pub started_at: u64,
    pub ends_at: Option<u64>,
    pub break_until: Option<u64>,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct BotStatus {
    pub running: bool,
    #[serde(flatten)]
    pub state: RunState,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct LogEvent {
    pub account_id: String,
    pub ts: u64,
    pub level: &'static str,
    pub text: String,
    pub channel_id: Option<String>,
    pub content: Option<String>,
}

#[derive(Clone)]
pub struct BotHandle {
    pub running: Arc<AtomicBool>,
    pub stop: Arc<watch::Sender<bool>>,
    pub state: Arc<Mutex<RunState>>,
}

impl BotHandle {
    pub fn halt(&self) {
        self.running.store(false, Ordering::SeqCst);
        self.stop.send_replace(true);
    }

    pub fn status(&self) -> BotStatus {
        BotStatus { running: self.running.load(Ordering::SeqCst), state: self.state.lock().unwrap().clone() }
    }
}

pub fn emit_log(app: &AppHandle, account_id: &str, level: &'static str, text: impl Into<String>) {
    emit(app, LogEvent { account_id: account_id.into(), ts: now_ms(), level, text: text.into(), channel_id: None, content: None });
}

fn emit(app: &AppHandle, event: LogEvent) {
    let _ = app.emit("bot-log", event);
}

fn changed(app: &AppHandle, account_id: &str) {
    let _ = app.emit("bot-state", account_id);
}

fn label(ch: &Channel) -> String {
    if ch.name.is_empty() { ch.id.clone() } else { format!("#{}", ch.name) }
}

fn random_break_threshold(total: u32) -> u32 {
    total + rand::rng().random_range(15..=25)
}

fn add_variation(message: &str) -> String {
    let trimmed = message.trim();
    let mut rng = rand::rng();
    if rng.random::<f64>() <= 0.7 {
        return trimmed.to_string();
    }
    match rng.random_range(0..3) {
        0 => trimmed.to_string(),
        1 => format!("{trimmed} "),
        _ => format!(" {trimmed}"),
    }
}

fn typing_delay(message: &str) -> f64 {
    let base = 1.5 + message.chars().count() as f64 / 100.0;
    (base + rand::rng().random_range(-0.3..0.5)).clamp(1.5, 4.0)
}

async fn nap(bot: &BotHandle, secs: f64) {
    let mut stop = bot.stop.subscribe();
    if *stop.borrow_and_update() {
        return;
    }
    tokio::select! {
        _ = tokio::time::sleep(Duration::from_secs_f64(secs.max(0.0))) => {}
        _ = stop.changed() => {}
    }
}

fn snapshot(app: &AppHandle, account_id: &str) -> Option<Account> {
    let state = app.state::<AppState>();
    let config = state.config.lock().unwrap();
    config.accounts.iter().find(|a| a.id == account_id).cloned()
}

pub fn start(app: AppHandle, account: &Account) -> BotHandle {
    let now = now_ms();
    let settings = &account.settings;
    let ends_at = (settings.timer_enabled && settings.timer_minutes > 0).then(|| now + settings.timer_minutes * 60_000);
    let handle = BotHandle {
        running: Arc::new(AtomicBool::new(true)),
        stop: Arc::new(watch::channel(false).0),
        state: Arc::new(Mutex::new(RunState { started_at: now, ends_at, ..Default::default() })),
    };
    if ends_at.is_some() {
        emit_log(&app, &account.id, "info", format!("⏱ Timer set for {} min", settings.timer_minutes));
    }
    emit_log(&app, &account.id, "success", "Bot started");
    let task = handle.clone();
    let account_id = account.id.clone();
    tauri::async_runtime::spawn(async move {
        changed(&app, &account_id);
        run_loop(&app, &account_id, &task).await;
        task.running.store(false, Ordering::SeqCst);
        emit_log(&app, &account_id, "info", "Bot stopped");
        changed(&app, &account_id);
    });
    handle
}

async fn run_loop(app: &AppHandle, account_id: &str, bot: &BotHandle) {
    let mut posts_until_break = random_break_threshold(0);
    let mut idle_logged = false;

    while bot.running.load(Ordering::SeqCst) {
        let Some(account) = snapshot(app, account_id) else {
            emit_log(app, account_id, "warn", "Account removed, stopping");
            return;
        };
        let settings = &account.settings;
        let now = now_ms();

        if bot.state.lock().unwrap().ends_at.is_some_and(|end| now >= end) {
            emit_log(app, account_id, "info", "⏱ Timer expired, stopping");
            return;
        }

        let total = bot.state.lock().unwrap().total_posts;
        if settings.breaks_enabled && total >= posts_until_break {
            let duration = rand::rng().random_range(60.0..150.0);
            emit_log(app, account_id, "info", format!("☕ Taking a break for {:.1} min", duration / 60.0));
            let remaining = {
                let mut st = bot.state.lock().unwrap();
                st.break_until = Some(now + (duration * 1000.0) as u64);
                st.ends_at.map(|end| end.saturating_sub(now))
            };
            changed(app, account_id);
            nap(bot, duration).await;
            {
                let mut st = bot.state.lock().unwrap();
                st.break_until = None;
                if let Some(rem) = remaining {
                    st.ends_at = Some(now_ms() + rem);
                }
            }
            posts_until_break = random_break_threshold(total);
            changed(app, account_id);
            emit_log(app, account_id, "info", "Break over, resuming");
            continue;
        }

        let enabled: Vec<Channel> =
            account.channels.into_iter().filter(|c| c.enabled && !c.messages.is_empty()).collect();
        if enabled.is_empty() {
            if !idle_logged {
                emit_log(app, account_id, "warn", "No enabled channels with messages. Waiting…");
                idle_logged = true;
            }
            nap(bot, 5.0).await;
            continue;
        }
        idle_logged = false;

        let ready: Vec<&Channel> = {
            let mut st = bot.state.lock().unwrap();
            st.channels.retain(|id, _| enabled.iter().any(|c| &c.id == id));
            enabled
                .iter()
                .filter(|c| st.channels.entry(c.id.clone()).or_default().next_ready <= now)
                .collect()
        };
        let (long, normal): (Vec<&Channel>, Vec<&Channel>) =
            ready.into_iter().partition(|c| c.cooldown >= LONG_COOLDOWN_THRESHOLD);
        if !long.is_empty() {
            emit_log(app, account_id, "info", "⚡ Long-cooldown batch ready, prioritizing");
        }
        let batch = if long.is_empty() { normal } else { long };

        if !batch.is_empty() {
            for (idx, ch) in batch.iter().enumerate() {
                if !bot.running.load(Ordering::SeqCst) {
                    break;
                }
                post(app, account_id, &account.token, settings.anti_detection, settings.channel_variance, bot, ch).await;
                if idx + 1 < batch.len() {
                    let delay = if settings.anti_detection {
                        let v = settings.between_variance;
                        (settings.between_cooldown + rand::rng().random_range(-v..=v)).max(1.0)
                    } else {
                        settings.between_cooldown
                    };
                    emit_log(app, account_id, "info", format!("Waiting {delay:.1}s before next channel"));
                    nap(bot, delay).await;
                }
            }
            continue;
        }

        let next = {
            let st = bot.state.lock().unwrap();
            enabled.iter().filter_map(|c| st.channels.get(&c.id)).map(|r| r.next_ready).min().unwrap_or(now)
        };
        let wait = (next.saturating_sub(now_ms()) as f64 / 1000.0).max(0.5);
        emit_log(app, account_id, "info", format!("Cooldown: {wait:.1}s until next channel"));
        nap(bot, wait).await;
    }
}

async fn post(
    app: &AppHandle,
    account_id: &str,
    token: &str,
    anti_detection: bool,
    channel_variance: f64,
    bot: &BotHandle,
    ch: &Channel,
) {
    let state = app.state::<AppState>();
    let http = state.http.clone();
    let minimal = state.config.lock().unwrap().minimal;
    let picked = ch.messages.choose(&mut rand::rng()).cloned().unwrap_or_default();
    let content = add_variation(&picked);

    if !minimal {
        discord::trigger_typing(&http, token, &ch.id).await;
        tokio::time::sleep(Duration::from_secs_f64(typing_delay(&content))).await;
    }

    let result = discord::send_message(&http, token, &ch.id, &content).await;
    let now = now_ms();
    let mut st = bot.state.lock().unwrap();
    let run = st.channels.entry(ch.id.clone()).or_default();

    match result {
        Ok(()) => {
            let jitter = if anti_detection { rand::rng().random_range(0.0..=channel_variance.max(0.0)) } else { 0.0 };
            run.next_ready = now + ((ch.cooldown.max(ch.slowmode) as f64 + jitter) * 1000.0) as u64;
            run.post_count += 1;
            run.last_error = None;
            let count = run.post_count;
            let next_in = (run.next_ready - now) as f64 / 1000.0;
            st.total_posts += 1;
            let total = st.total_posts;
            drop(st);
            emit(app, LogEvent {
                account_id: account_id.into(),
                ts: now,
                level: "sent",
                text: format!("Posted to {} (#{count}, total {total}) · next in {next_in:.1}s", label(ch)),
                channel_id: Some(ch.id.clone()),
                content: Some(picked),
            });
        }
        Err(ApiError::RateLimited(retry)) => {
            run.next_ready = now + (retry * 1000.0) as u64;
            run.last_error = Some(format!("Rate limited ({retry:.0}s)"));
            drop(st);
            emit_log(app, account_id, "warn", format!("Rate limited on {}, retry after {retry:.1}s", label(ch)));
        }
        Err(e) => {
            let backoff = (ch.cooldown as f64 * 0.1).clamp(15.0, 60.0);
            run.next_ready = now + (backoff * 1000.0) as u64;
            run.last_error = Some(e.to_string());
            drop(st);
            emit_log(app, account_id, "error", format!("Failed to post to {}: {e}", label(ch)));
        }
    }
    changed(app, account_id);
}
