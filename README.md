# Trading And Shi - Automation to send Trades and Shi

![Logo](images/logo.webp)

[![Discord](https://img.shields.io/badge/Discord-Join%20Server-7289da?style=for-the-badge&logo=discord&logoColor=white)](https://discord.gg/unPZxXAtfb)

## What is This?

A utility application that automates message distribution across Discord channels. The bot interfaces with Discord's API to post predefined messages at scheduled intervals with configurable timing. Designed as an educational tool for understanding API interactions and message scheduling.

---

## ⚠️ CRITICAL DISCLAIMER

**Read this before proceeding:**

This application interacts with Discord in ways that may violate their Community Guidelines. While the technical functionality is straightforward, Discord's Terms of Service restrict automated posting and certain types of account activity.

**Your responsibility:**

- You choose whether to use this tool
- Any account consequences are on you
- We provide no guarantees or support for account safety
- This is provided "as-is" for informational purposes

If you're not comfortable with account risk, please don't use this.

---

## Quick Setup

### Prerequisites

- [Node.js](https://nodejs.org) 20+
- [Rust](https://rustup.rs) (stable) and the [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your OS
- A Discord account (preferably a test account)

### Installation

```bash
npm install
```

### Run

```bash
npm run tauri dev
```

### Build an installer

```bash
npm run tauri build
```

The installer is written to `src-tauri/target/release/bundle/`.

Settings are stored in `config.json` inside the app's config folder (`%APPDATA%\com.arielldev.tradingandshi` on Windows).

---

## Getting Started

### Step 1: Add an Account

1. Click the **+** in the left rail
2. Paste your token (open discord.com, press `F12` → **Network**, send a message, open the `messages` request and copy the `Authorization` header)
3. Confirm the profile card and name the account

### Step 2: Build Your Emoji Library

1. Click the logo at the top of the rail to open the **Emoji Library**
2. Click **Add a Server** and pick any server you're in — every emoji in it is pulled in automatically
3. Use **Sync** (or **Sync all servers**) to refresh. Renamed, re-uploaded and deleted emojis are listed, and **Update messages** fixes any scheduled messages that use them

### Step 3: Add Channels

1. Open an account and click **Add Channel**
2. Pick a server, then a text channel (or paste a channel ID)
3. The channel's slowmode is detected automatically and used as the cooldown (change it if you like), then choose whether to pull that server's emojis into your library

### Step 4: Build Macros

- Click emojis in the palette under the chat to add them to a macro sequence — filter by server or search
- Drag pills to reorder them (or focus a pill and use ← →), and click ✕ to remove one
- Click **Add to loop**. The channel's Loop card shows the interval, a live countdown to the next post, and the macros it cycles through (one is picked at random each time)
- Hover a macro in the Loop card to **Edit** or **Delete** it

### Step 5: Start

1. Press ▶ in the user panel at the bottom of the channel list
2. Before starting, the app re-checks every emoji and channel you use:
   - **Renamed** emojis (e.g. `:hello:` → `:h:`) are updated
   - **Re-uploaded** emojis (same name, new ID) are swapped to the new one
   - **Deleted** emojis are removed from messages
   - Deleted or inaccessible channels can be disabled
   - Channel renames and slowmode changes are picked up, and cooldowns below the new slowmode are raised
3. Watch countdowns in the channel list, sent messages in the chat, and details in the **Activity** panel
4. Press ■ to stop

---

## Features

- 💬 **Discord-style UI**: Account rail, channel list, chat view and composer
- 😀 **Emoji Library**: Pull all emojis from a server in one click
- 🧩 **Macro Builder**: Click emojis to build drag-and-drop sequences
- 🐢 **Slowmode detection**: Cooldowns follow each channel's slowmode automatically
- 🩺 **Pre-start checks**: Detects renamed, re-uploaded and deleted emojis and broken channels
- 🔄 **Multi-Account & Multi-Channel**: Run several accounts at once
- 🔁 **Loops**: Each channel loops through its macros, picking one at random each time
- ⏱️ **Flexible Timing**: Cooldowns, between-channel delays, variance, breaks and auto-stop timer
- 📊 **Live Activity**: Countdowns and a real-time log
- ℹ️ **About & Community**: Live Discord member count, links to the server and other projects (ⓘ at the bottom of the rail)

---

## Common Issues

### Connection Fails

- Verify you copied the complete token
- Ensure Discord is still logged in
- Try refreshing your token using the browser method above

### Messages Not Sending

- Double-check Channel IDs (get fresh ones if unsure)
- Confirm you have posting permissions in target channels
- Check if Discord is applying rate-limits

### Token Issues

- Discord tokens can expire
- Use the browser method again to get a fresh one

---

## Community & Support

**Have questions or want to connect?**

- 🔗 **Discord Server**: [Join Our Community](#) _(link available to verified members)_
- 📧 **Support**: Contact through repository issues
- 🐛 **Bug Reports**: Use GitHub issues for technical problems

---

## Technical Notes

- Messages are posted via Discord's official API endpoint
- Timing randomization is applied to reduce detection likelihood
- Your token and data never leave your system
- Application can be stopped/started at any time

---

## Final Thoughts

This tool exists in a gray area. Use good judgment. Discord changes their enforcement regularly, and the risks of using account automation vary. We're not encouraging or discouraging—just providing the capability.

**What you do with it is entirely your call.**
