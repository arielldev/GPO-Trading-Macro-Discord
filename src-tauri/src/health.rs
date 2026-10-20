use crate::config::{Account, Emoji, Server};
use crate::discord::{self, ChannelInfo};
use crate::state::now_ms;
use regex::Regex;
use reqwest::Client;
use serde::Serialize;
use std::collections::{BTreeMap, HashMap, HashSet};
use std::sync::LazyLock;

static EMOJI_TAG: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"<(a?):(\w+):(\d+)>").unwrap());

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EmojiIssue {
    pub kind: &'static str,
    pub emoji_id: String,
    pub old_tag: String,
    pub old_name: String,
    pub new_tag: Option<String>,
    pub new_name: Option<String>,
    pub server_name: Option<String>,
    pub channel_ids: Vec<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChannelIssue {
    pub channel_id: String,
    pub channel_name: String,
    pub error: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ChannelUpdate {
    pub channel_id: String,
    pub name: String,
    pub slowmode: u64,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerError {
    pub server_id: String,
    pub server_name: String,
    pub error: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthReport {
    pub emoji_issues: Vec<EmojiIssue>,
    pub channel_issues: Vec<ChannelIssue>,
    pub channel_updates: Vec<ChannelUpdate>,
    pub server_errors: Vec<ServerError>,
    pub servers: Vec<Server>,
    pub checked_emojis: usize,
    pub unverified: usize,
}

struct UsedTag {
    id: String,
    name: String,
    animated: bool,
    channel_ids: Vec<String>,
}

fn used_tags(account: &Account) -> BTreeMap<String, UsedTag> {
    let mut used: BTreeMap<String, UsedTag> = BTreeMap::new();
    for ch in &account.channels {
        for msg in &ch.messages {
            for cap in EMOJI_TAG.captures_iter(msg) {
                let entry = used.entry(cap[0].to_string()).or_insert_with(|| UsedTag {
                    id: cap[3].to_string(),
                    name: cap[2].to_string(),
                    animated: !cap[1].is_empty(),
                    channel_ids: Vec::new(),
                });
                if !entry.channel_ids.contains(&ch.id) {
                    entry.channel_ids.push(ch.id.clone());
                }
            }
        }
    }
    used
}

fn find_by_name<'a>(servers: &'a [Server], name: &str, prefer: Option<&str>) -> Option<(&'a Emoji, &'a Server)> {
    let matches = servers.iter().flat_map(|s| s.emojis.iter().filter(|e| e.name == name).map(move |e| (e, s)));
    let all: Vec<_> = matches.collect();
    all.iter().find(|(_, s)| Some(s.id.as_str()) == prefer).or(all.first()).copied()
}

pub async fn check(http: &Client, account: &Account, saved: &[Server], minimal: bool) -> HealthReport {
    let now = now_ms();
    let mut servers = Vec::with_capacity(saved.len());
    let mut server_errors = Vec::new();
    let mut reachable = HashSet::new();

    for server in saved {
        let fetched = if minimal {
            discord::guild_emojis(http, &account.token, server, now).await
        } else {
            discord::guild(http, &account.token, &server.id, now).await
        };
        match fetched {
            Ok(fresh) => {
                reachable.insert(fresh.id.clone());
                servers.push(fresh);
            }
            Err(e) => {
                server_errors.push(ServerError {
                    server_id: server.id.clone(),
                    server_name: server.name.clone(),
                    error: e.to_string(),
                });
                servers.push(server.clone());
            }
        }
    }

    let fresh_index: HashMap<&str, (&Emoji, &Server)> = servers
        .iter()
        .filter(|s| reachable.contains(&s.id))
        .flat_map(|s| s.emojis.iter().map(move |e| (e.id.as_str(), (e, s))))
        .collect();
    let old_index: HashMap<&str, &Server> =
        saved.iter().flat_map(|s| s.emojis.iter().map(move |e| (e.id.as_str(), s))).collect();
    let fresh_servers: Vec<Server> = servers.iter().filter(|s| reachable.contains(&s.id)).cloned().collect();

    let used = used_tags(account);
    let mut emoji_issues = Vec::new();
    let mut unverified = 0;

    for (tag, u) in &used {
        if let Some((emoji, server)) = fresh_index.get(u.id.as_str()) {
            if emoji.name != u.name || emoji.animated != u.animated {
                emoji_issues.push(EmojiIssue {
                    kind: "renamed",
                    emoji_id: u.id.clone(),
                    old_tag: tag.clone(),
                    old_name: u.name.clone(),
                    new_tag: Some(emoji.tag()),
                    new_name: Some(emoji.name.clone()),
                    server_name: Some(server.name.clone()),
                    channel_ids: u.channel_ids.clone(),
                });
            }
            continue;
        }

        let origin = old_index.get(u.id.as_str()).copied();
        let deleted = match origin {
            Some(s) if reachable.contains(&s.id) => true,
            Some(_) => false,
            None => discord::emoji_exists(http, &u.id).await == Some(false),
        };
        if !deleted {
            unverified += 1;
            continue;
        }

        let replacement = find_by_name(&fresh_servers, &u.name, origin.map(|s| s.id.as_str()));
        emoji_issues.push(EmojiIssue {
            kind: if replacement.is_some() { "replaced" } else { "deleted" },
            emoji_id: u.id.clone(),
            old_tag: tag.clone(),
            old_name: u.name.clone(),
            new_tag: replacement.map(|(e, _)| e.tag()),
            new_name: replacement.map(|(e, _)| e.name.clone()),
            server_name: replacement.map(|(_, s)| s.name.clone()).or(origin.map(|s| s.name.clone())),
            channel_ids: u.channel_ids.clone(),
        });
    }

    let mut listed: HashMap<String, Option<ChannelInfo>> = HashMap::new();
    if minimal {
        let mut by_guild: HashMap<&str, usize> = HashMap::new();
        for ch in &account.channels {
            if let Some(g) = ch.guild_id.as_deref() {
                *by_guild.entry(g).or_default() += 1;
            }
        }
        for (guild_id, _) in by_guild.into_iter().filter(|(_, n)| *n > 1) {
            let Ok(list) = discord::guild_channels(http, &account.token, guild_id).await else { continue };
            for ch in account.channels.iter().filter(|c| c.guild_id.as_deref() == Some(guild_id)) {
                listed.insert(ch.id.clone(), list.iter().find(|c| c.id == ch.id).cloned());
            }
        }
    }

    let mut channel_issues = Vec::new();
    let mut channel_updates = Vec::new();
    for ch in &account.channels {
        let result = match listed.remove(&ch.id) {
            Some(Some(info)) => Ok(info),
            Some(None) => Err("Channel was deleted or you lost access".to_string()),
            None => discord::channel(http, &account.token, &ch.id).await.map_err(|e| {
                if e.is_missing() { "Channel was deleted or you lost access".into() } else { e.to_string() }
            }),
        };
        match result {
            Ok(info) => {
                let name = info.name.unwrap_or_else(|| ch.name.clone());
                if name != ch.name || info.rate_limit_per_user != ch.slowmode {
                    channel_updates.push(ChannelUpdate {
                        channel_id: ch.id.clone(),
                        name,
                        slowmode: info.rate_limit_per_user,
                    });
                }
            }
            Err(error) => channel_issues.push(ChannelIssue { channel_id: ch.id.clone(), channel_name: ch.name.clone(), error }),
        }
    }

    HealthReport {
        emoji_issues,
        channel_issues,
        channel_updates,
        server_errors,
        servers,
        checked_emojis: used.len(),
        unverified,
    }
}
