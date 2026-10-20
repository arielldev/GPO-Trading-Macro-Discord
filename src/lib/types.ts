export interface Emoji {
  id: string;
  name: string;
  animated: boolean;
}

export interface Server {
  id: string;
  name: string;
  icon: string | null;
  emojis: Emoji[];
  syncedAt: number;
}

export interface DiscordUser {
  id: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
}

export interface Settings {
  betweenCooldown: number;
  betweenVariance: number;
  channelVariance: number;
  antiDetection: boolean;
  breaksEnabled: boolean;
  timerEnabled: boolean;
  timerMinutes: number;
}

export interface Channel {
  id: string;
  name: string;
  guildId: string | null;
  guildName: string | null;
  messages: string[];
  cooldown: number;
  slowmode: number;
  enabled: boolean;
}

export interface Account {
  id: string;
  name: string;
  token: string;
  user: DiscordUser | null;
  settings: Settings;
  channels: Channel[];
}

export interface Config {
  accounts: Account[];
  servers: Server[];
  anonymous: boolean;
  minimal: boolean;
}

export interface GuildSummary {
  id: string;
  name: string;
  icon: string | null;
}

export interface ChannelInfo {
  id: string;
  name: string | null;
  kind: number;
  guildId: string | null;
  parentId: string | null;
  position: number;
  rateLimitPerUser: number;
}

export interface InviteInfo {
  guildId: string;
  name: string;
  icon: string | null;
  members: number;
  online: number;
}

export interface ChannelRun {
  nextReady: number;
  postCount: number;
  lastError: string | null;
}

export interface BotStatus {
  running: boolean;
  channels: Record<string, ChannelRun>;
  totalPosts: number;
  startedAt: number;
  endsAt: number | null;
  breakUntil: number | null;
}

export type LogLevel = "info" | "success" | "warn" | "error" | "sent";

export interface LogEvent {
  accountId: string;
  ts: number;
  level: LogLevel;
  text: string;
  channelId: string | null;
  content: string | null;
}

export type EmojiIssueKind = "renamed" | "replaced" | "deleted";

export interface EmojiIssue {
  kind: EmojiIssueKind;
  emojiId: string;
  oldTag: string;
  oldName: string;
  newTag: string | null;
  newName: string | null;
  serverName: string | null;
  channelIds: string[];
}

export interface HealthReport {
  emojiIssues: EmojiIssue[];
  channelIssues: { channelId: string; channelName: string; error: string }[];
  channelUpdates: { channelId: string; name: string; slowmode: number }[];
  serverErrors: { serverId: string; serverName: string; error: string }[];
  servers: Server[];
  checkedEmojis: number;
  unverified: number;
}

export interface EmojiFix {
  oldTag: string;
  newTag: string | null;
}

export const DEFAULT_SETTINGS: Settings = {
  betweenCooldown: 5,
  betweenVariance: 3,
  channelVariance: 10,
  antiDetection: true,
  breaksEnabled: true,
  timerEnabled: false,
  timerMinutes: 60,
};
