use crate::bot::BotHandle;
use crate::config::Config;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::AtomicBool;
use std::sync::Mutex;
use std::time::{SystemTime, UNIX_EPOCH};

pub struct AppState {
    pub config: Mutex<Config>,
    pub config_path: PathBuf,
    pub http: reqwest::Client,
    pub bots: Mutex<HashMap<String, BotHandle>>,
    pub low_memory: AtomicBool,
}

pub fn now_ms() -> u64 {
    SystemTime::now().duration_since(UNIX_EPOCH).map(|d| d.as_millis() as u64).unwrap_or(0)
}
