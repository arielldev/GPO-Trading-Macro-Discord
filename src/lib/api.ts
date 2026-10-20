import { invoke } from "@tauri-apps/api/core";
import type { BotStatus, ChannelInfo, Config, DiscordUser, GuildSummary, HealthReport, InviteInfo, Server } from "./types";

export const api = {
  loadConfig: () => invoke<Config>("load_config"),
  saveConfig: (config: Config) => invoke<void>("save_config", { config }),
  me: (token: string) => invoke<DiscordUser>("discord_me", { token }),
  guilds: (token: string) => invoke<GuildSummary[]>("discord_guilds", { token }),
  guild: (token: string, guildId: string) => invoke<Server>("discord_guild", { token, guildId }),
  guildChannels: (token: string, guildId: string) => invoke<ChannelInfo[]>("discord_guild_channels", { token, guildId }),
  channel: (token: string, channelId: string) => invoke<ChannelInfo>("discord_channel", { token, channelId }),
  invite: (code: string) => invoke<InviteInfo>("discord_invite", { code }),
  checkHealth: (accountId: string) => invoke<HealthReport>("check_health", { accountId }),
  startBot: (accountId: string) => invoke<void>("start_bot", { accountId }),
  stopBot: (accountId: string) => invoke<void>("stop_bot", { accountId }),
  botStatuses: () => invoke<Record<string, BotStatus>>("bot_statuses"),
  restartApp: () => invoke<void>("restart_app"),
};

export function errorText(e: unknown): string {
  return typeof e === "string" ? e : e instanceof Error ? e.message : "Something went wrong";
}
