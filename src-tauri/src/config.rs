use serde::{Deserialize, Serialize};
use std::{fs, path::Path};

#[derive(Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct Config {
    pub accounts: Vec<Account>,
    pub servers: Vec<Server>,
    pub anonymous: bool,
    pub minimal: bool,
}

#[derive(Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct Account {
    pub id: String,
    pub name: String,
    pub token: String,
    pub user: Option<DiscordUser>,
    pub settings: Settings,
    pub channels: Vec<Channel>,
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase", default)]
pub struct Settings {
    pub between_cooldown: f64,
    pub between_variance: f64,
    pub channel_variance: f64,
    pub anti_detection: bool,
    pub breaks_enabled: bool,
    pub timer_enabled: bool,
    pub timer_minutes: u64,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            between_cooldown: 5.0,
            between_variance: 3.0,
            channel_variance: 10.0,
            anti_detection: true,
            breaks_enabled: true,
            timer_enabled: false,
            timer_minutes: 60,
        }
    }
}

#[derive(Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase", default)]
pub struct Channel {
    pub id: String,
    pub name: String,
    pub guild_id: Option<String>,
    pub guild_name: Option<String>,
    pub messages: Vec<String>,
    pub cooldown: u64,
    pub slowmode: u64,
    pub enabled: bool,
}

impl Default for Channel {
    fn default() -> Self {
        Self {
            id: String::new(),
            name: String::new(),
            guild_id: None,
            guild_name: None,
            messages: Vec::new(),
            cooldown: 30,
            slowmode: 0,
            enabled: true,
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct Server {
    pub id: String,
    pub name: String,
    pub icon: Option<String>,
    pub emojis: Vec<Emoji>,
    pub synced_at: u64,
}

#[derive(Serialize, Deserialize, Clone, Default, PartialEq)]
#[serde(rename_all = "camelCase", default)]
pub struct Emoji {
    pub id: String,
    pub name: String,
    pub animated: bool,
}

impl Emoji {
    pub fn tag(&self) -> String {
        format!("<{}:{}:{}>", if self.animated { "a" } else { "" }, self.name, self.id)
    }
}

#[derive(Serialize, Deserialize, Clone, Default)]
#[serde(rename_all = "camelCase", default)]
pub struct DiscordUser {
    pub id: String,
    pub username: String,
    #[serde(alias = "global_name")]
    pub global_name: Option<String>,
    pub avatar: Option<String>,
}

pub fn load(path: &Path) -> Config {
    fs::read_to_string(path)
        .ok()
        .and_then(|raw| serde_json::from_str(&raw).ok())
        .unwrap_or_default()
}

pub fn save(path: &Path, config: &Config) -> Result<(), String> {
    let raw = serde_json::to_string_pretty(config).map_err(|e| e.to_string())?;
    let tmp = path.with_extension("json.tmp");
    fs::write(&tmp, raw).map_err(|e| e.to_string())?;
    fs::rename(&tmp, path).map_err(|e| e.to_string())
}
