use crate::config::{DiscordUser, Emoji, Server};
use base64::{engine::general_purpose::STANDARD, Engine};
use reqwest::{header::HeaderMap, Client, StatusCode};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use std::fmt;

const API: &str = "https://discord.com/api/v9";
const USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

pub enum ApiError {
    RateLimited(f64),
    Status(StatusCode, String),
    Network(String),
}

impl ApiError {
    pub fn is_missing(&self) -> bool {
        matches!(self, ApiError::Status(s, _) if *s == StatusCode::NOT_FOUND || *s == StatusCode::FORBIDDEN)
    }
}

impl fmt::Display for ApiError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            ApiError::RateLimited(s) => write!(f, "Rate limited, retry after {s:.1}s"),
            ApiError::Status(StatusCode::UNAUTHORIZED, _) => write!(f, "Invalid or expired token"),
            ApiError::Status(StatusCode::FORBIDDEN, _) => write!(f, "Missing access"),
            ApiError::Status(StatusCode::NOT_FOUND, _) => write!(f, "Not found"),
            ApiError::Status(s, body) => write!(f, "Discord API error {}: {}", s.as_u16(), body),
            ApiError::Network(e) => write!(f, "Network error: {e}"),
        }
    }
}

impl From<ApiError> for String {
    fn from(e: ApiError) -> Self {
        e.to_string()
    }
}

#[derive(Deserialize)]
struct RawEmoji {
    id: Option<String>,
    name: Option<String>,
    #[serde(default)]
    animated: bool,
}

#[derive(Deserialize)]
struct RawGuild {
    id: String,
    name: String,
    icon: Option<String>,
    #[serde(default)]
    emojis: Vec<RawEmoji>,
}

#[derive(Deserialize)]
struct RateLimitBody {
    retry_after: f64,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct GuildSummary {
    pub id: String,
    pub name: String,
    pub icon: Option<String>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all(serialize = "camelCase"))]
pub struct ChannelInfo {
    pub id: String,
    #[serde(default)]
    pub name: Option<String>,
    #[serde(rename(deserialize = "type"))]
    pub kind: u8,
    #[serde(default)]
    pub guild_id: Option<String>,
    #[serde(default)]
    pub parent_id: Option<String>,
    #[serde(default)]
    pub position: i64,
    #[serde(default)]
    pub rate_limit_per_user: u64,
}

fn headers(token: &str) -> HeaderMap {
    let super_properties = STANDARD.encode(
        serde_json::json!({
            "os": "Windows",
            "browser": "Chrome",
            "device": "",
            "system_locale": "en-US",
            "browser_user_agent": USER_AGENT,
            "browser_version": "120.0.0.0",
            "os_version": "10",
            "referrer": "",
            "referring_domain": "",
            "referrer_current": "",
            "referring_domain_current": "",
            "release_channel": "stable",
            "client_build_number": 261053,
            "client_event_source": null
        })
        .to_string(),
    );
    let pairs = [
        ("Authorization", token),
        ("User-Agent", USER_AGENT),
        ("X-Super-Properties", super_properties.as_str()),
        ("X-Discord-Locale", "en-US"),
        ("X-Debug-Options", "bugReporterEnabled"),
        ("Accept", "*/*"),
        ("Accept-Language", "en-US,en;q=0.9"),
        ("Referer", "https://discord.com/channels/@me"),
        ("Origin", "https://discord.com"),
        ("Sec-Ch-Ua", "\"Not_A Brand\";v=\"8\", \"Chromium\";v=\"120\", \"Google Chrome\";v=\"120\""),
        ("Sec-Ch-Ua-Mobile", "?0"),
        ("Sec-Ch-Ua-Platform", "\"Windows\""),
        ("Sec-Fetch-Dest", "empty"),
        ("Sec-Fetch-Mode", "cors"),
        ("Sec-Fetch-Site", "same-origin"),
    ];
    let mut map = HeaderMap::new();
    for (k, v) in pairs {
        if let Ok(value) = v.parse() {
            map.insert(k, value);
        }
    }
    map
}

async fn check(res: reqwest::Response) -> Result<reqwest::Response, ApiError> {
    let status = res.status();
    if status.is_success() {
        return Ok(res);
    }
    let body = res.text().await.unwrap_or_default();
    if status == StatusCode::TOO_MANY_REQUESTS {
        let retry = serde_json::from_str::<RateLimitBody>(&body).map(|b| b.retry_after).unwrap_or(60.0);
        return Err(ApiError::RateLimited(retry));
    }
    Err(ApiError::Status(status, body))
}

async fn get<T: DeserializeOwned>(http: &Client, token: &str, path: &str) -> Result<T, ApiError> {
    let res = http
        .get(format!("{API}{path}"))
        .headers(headers(token))
        .send()
        .await
        .map_err(|e| ApiError::Network(e.to_string()))?;
    check(res).await?.json().await.map_err(|e| ApiError::Network(e.to_string()))
}

pub async fn me(http: &Client, token: &str) -> Result<DiscordUser, ApiError> {
    get(http, token, "/users/@me").await
}

pub async fn guilds(http: &Client, token: &str) -> Result<Vec<GuildSummary>, ApiError> {
    get(http, token, "/users/@me/guilds").await
}

fn emojis(raw: Vec<RawEmoji>) -> Vec<Emoji> {
    raw.into_iter().filter_map(|e| Some(Emoji { id: e.id?, name: e.name?, animated: e.animated })).collect()
}

pub async fn guild(http: &Client, token: &str, guild_id: &str, now: u64) -> Result<Server, ApiError> {
    let raw: RawGuild = get(http, token, &format!("/guilds/{guild_id}")).await?;
    Ok(Server { id: raw.id, name: raw.name, icon: raw.icon, emojis: emojis(raw.emojis), synced_at: now })
}

pub async fn guild_emojis(http: &Client, token: &str, server: &Server, now: u64) -> Result<Server, ApiError> {
    let raw: Vec<RawEmoji> = get(http, token, &format!("/guilds/{}/emojis", server.id)).await?;
    Ok(Server { emojis: emojis(raw), synced_at: now, ..server.clone() })
}

pub async fn guild_channels(http: &Client, token: &str, guild_id: &str) -> Result<Vec<ChannelInfo>, ApiError> {
    get(http, token, &format!("/guilds/{guild_id}/channels")).await
}

pub async fn channel(http: &Client, token: &str, channel_id: &str) -> Result<ChannelInfo, ApiError> {
    get(http, token, &format!("/channels/{channel_id}")).await
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct InviteInfo {
    pub guild_id: String,
    pub name: String,
    pub icon: Option<String>,
    pub members: u64,
    pub online: u64,
}

#[derive(Deserialize)]
struct RawInvite {
    guild: GuildSummary,
    #[serde(default)]
    approximate_member_count: u64,
    #[serde(default)]
    approximate_presence_count: u64,
}

pub async fn invite(http: &Client, code: &str) -> Result<InviteInfo, ApiError> {
    let res = http
        .get(format!("{API}/invites/{code}?with_counts=true"))
        .send()
        .await
        .map_err(|e| ApiError::Network(e.to_string()))?;
    let raw: RawInvite = check(res).await?.json().await.map_err(|e| ApiError::Network(e.to_string()))?;
    Ok(InviteInfo {
        guild_id: raw.guild.id,
        name: raw.guild.name,
        icon: raw.guild.icon,
        members: raw.approximate_member_count,
        online: raw.approximate_presence_count,
    })
}

pub async fn trigger_typing(http: &Client, token: &str, channel_id: &str) {
    let _ = http
        .post(format!("{API}/channels/{channel_id}/typing"))
        .headers(headers(token))
        .send()
        .await;
}

pub async fn send_message(http: &Client, token: &str, channel_id: &str, content: &str) -> Result<(), ApiError> {
    let res = http
        .post(format!("{API}/channels/{channel_id}/messages"))
        .headers(headers(token))
        .json(&serde_json::json!({ "content": content }))
        .send()
        .await
        .map_err(|e| ApiError::Network(e.to_string()))?;
    check(res).await.map(|_| ())
}

pub async fn emoji_exists(http: &Client, emoji_id: &str) -> Option<bool> {
    let res = http
        .head(format!("https://cdn.discordapp.com/emojis/{emoji_id}.webp"))
        .send()
        .await
        .ok()?;
    match res.status() {
        s if s.is_success() => Some(true),
        StatusCode::NOT_FOUND => Some(false),
        _ => None,
    }
}
