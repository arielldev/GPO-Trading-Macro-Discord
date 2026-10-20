mod bot;
mod config;
mod discord;
mod health;
mod state;

use bot::BotStatus;
use config::{Account, Config, DiscordUser, Server};
use discord::{ChannelInfo, GuildSummary, InviteInfo};
use health::HealthReport;
use state::{now_ms, AppState};
use std::collections::HashMap;
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use tauri::{AppHandle, Manager, State, WindowEvent};

fn account(state: &AppState, account_id: &str) -> Result<Account, String> {
    state
        .config
        .lock()
        .unwrap()
        .accounts
        .iter()
        .find(|a| a.id == account_id)
        .cloned()
        .ok_or_else(|| "Account not found".to_string())
}

#[tauri::command]
fn load_config(state: State<'_, AppState>) -> Config {
    state.config.lock().unwrap().clone()
}

#[tauri::command]
fn save_config(state: State<'_, AppState>, config: Config) -> Result<(), String> {
    config::save(&state.config_path, &config)?;
    *state.config.lock().unwrap() = config;
    Ok(())
}

#[tauri::command]
async fn discord_me(state: State<'_, AppState>, token: String) -> Result<DiscordUser, String> {
    Ok(discord::me(&state.http, token.trim()).await?)
}

#[tauri::command]
async fn discord_guilds(state: State<'_, AppState>, token: String) -> Result<Vec<GuildSummary>, String> {
    Ok(discord::guilds(&state.http, &token).await?)
}

#[tauri::command]
async fn discord_guild(state: State<'_, AppState>, token: String, guild_id: String) -> Result<Server, String> {
    Ok(discord::guild(&state.http, &token, guild_id.trim(), now_ms()).await?)
}

#[tauri::command]
async fn discord_guild_channels(
    state: State<'_, AppState>,
    token: String,
    guild_id: String,
) -> Result<Vec<ChannelInfo>, String> {
    let mut channels = discord::guild_channels(&state.http, &token, &guild_id).await?;
    channels.retain(|c| matches!(c.kind, 0 | 4 | 5));
    channels.sort_by_key(|c| c.position);
    Ok(channels)
}

#[tauri::command]
async fn discord_channel(state: State<'_, AppState>, token: String, channel_id: String) -> Result<ChannelInfo, String> {
    Ok(discord::channel(&state.http, &token, channel_id.trim()).await?)
}

#[tauri::command]
async fn discord_invite(state: State<'_, AppState>, code: String) -> Result<InviteInfo, String> {
    Ok(discord::invite(&state.http, &code).await?)
}

#[tauri::command]
async fn check_health(state: State<'_, AppState>, account_id: String) -> Result<HealthReport, String> {
    let acc = account(&state, &account_id)?;
    let (servers, minimal) = {
        let config = state.config.lock().unwrap();
        (config.servers.clone(), config.minimal)
    };
    Ok(health::check(&state.http, &acc, &servers, minimal).await)
}

#[tauri::command]
fn start_bot(app: AppHandle, state: State<'_, AppState>, account_id: String) -> Result<(), String> {
    let acc = account(&state, &account_id)?;
    let mut bots = state.bots.lock().unwrap();
    if bots.get(&account_id).is_some_and(|b| b.status().running) {
        return Err("Bot is already running".into());
    }
    let handle = bot::start(app.clone(), &acc);
    bots.insert(account_id, handle);
    Ok(())
}

#[tauri::command]
fn stop_bot(state: State<'_, AppState>, account_id: String) {
    if let Some(handle) = state.bots.lock().unwrap().get(&account_id) {
        handle.halt();
    }
}

#[tauri::command]
fn bot_statuses(state: State<'_, AppState>) -> HashMap<String, BotStatus> {
    state.bots.lock().unwrap().iter().map(|(id, h)| (id.clone(), h.status())).collect()
}

#[tauri::command]
fn restart_app(app: AppHandle) {
    app.restart();
}

const MINIMAL_BROWSER_ARGS: &str = "--disable-features=msWebOOUI,msPdfOOUI,msSmartScreenProtection --disable-gpu --renderer-process-limit=1 --disable-background-networking --disable-component-update --disable-domain-reliability";

#[cfg(windows)]
fn set_memory_level(webview: &tauri::WebviewWindow, low: bool) {
    use webview2_com::Microsoft::Web::WebView2::Win32::{
        ICoreWebView2_19, COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_LOW, COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_NORMAL,
    };
    use windows_core::Interface;
    let _ = webview.with_webview(move |wv| unsafe {
        let Ok(core) = wv.controller().CoreWebView2() else { return };
        let Ok(core) = core.cast::<ICoreWebView2_19>() else { return };
        let level = if low { COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_LOW } else { COREWEBVIEW2_MEMORY_USAGE_TARGET_LEVEL_NORMAL };
        let _ = core.SetMemoryUsageTargetLevel(level);
    });
}

#[cfg(not(windows))]
fn set_memory_level(_webview: &tauri::WebviewWindow, _low: bool) {}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let dir = app.path().app_config_dir()?;
            std::fs::create_dir_all(&dir)?;
            let config_path = dir.join("config.json");
            let config = config::load(&config_path);
            let minimal = config.minimal;
            app.manage(AppState {
                config: Mutex::new(config),
                config_path,
                http: reqwest::Client::new(),
                bots: Mutex::new(HashMap::new()),
                low_memory: AtomicBool::new(false),
            });
            let window = app.config().app.windows.iter().find(|w| w.label == "main").cloned().ok_or("missing main window config")?;
            let mut builder = tauri::WebviewWindowBuilder::from_config(app.handle(), &window)?;
            if minimal {
                builder = builder.additional_browser_args(MINIMAL_BROWSER_ARGS);
            }
            builder.build()?;
            Ok(())
        })
        .on_window_event(|window, event| {
            if !matches!(event, WindowEvent::Resized(_)) {
                return;
            }
            let state = window.state::<AppState>();
            let low = state.config.lock().unwrap().minimal && window.is_minimized().unwrap_or(false);
            if state.low_memory.swap(low, Ordering::SeqCst) != low {
                if let Some(webview) = window.app_handle().get_webview_window(window.label()) {
                    set_memory_level(&webview, low);
                }
            }
        })
        .invoke_handler(tauri::generate_handler![
            load_config,
            save_config,
            discord_me,
            discord_guilds,
            discord_guild,
            discord_guild_channels,
            discord_channel,
            discord_invite,
            check_health,
            start_bot,
            stop_bot,
            bot_statuses,
            restart_app
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
