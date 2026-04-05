# Celestial Calendar

**A Foundry VTT module for tracking moon phases, conjunctions, eclipses, and celestial events in fantasy worlds.**

[![Foundry v11](https://img.shields.io/badge/Foundry-v11%2B-brightgreen)](https://foundryvtt.com)
[![Foundry v12](https://img.shields.io/badge/Foundry-v12-brightgreen)](https://foundryvtt.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

> Created by **[Tonyb29](https://github.com/Tonyb29)**

---

## What It Does

Celestial Calendar adds an in-game **Night Sky panel** to your Foundry world. Open it from the Journal sidebar (moon button) to see:

- **Live night sky SVG** — all moons rendered with accurate phase shading and a deterministic star field
- **Moon cards** — phase name, illumination percentage, and orbit length for each moon
- **Tonight's events** — conjunctions, eclipses, oppositions, full moons, and new moons auto-detected from the current date
- **Boons & Pitfalls** — narrative gameplay effects for the current celestial event, ready to read aloud or post in chat
- **Day navigator** — jump ±1/±7 days or skip directly to the next/previous celestial event
- **Year event count** — at a glance, how many events are in the current campaign year

Ships with the **Eldoria** world calendar (two moons: Luna 30d silver + Selene 50d blue). Use your own world by pasting a custom calendar JSON in Module Settings.

---

## Installation

### One-Click (Recommended)

1. In Foundry → **Add-on Modules**, click **Install Module**
2. Paste this manifest URL and click **Install**:
   ```
   https://raw.githubusercontent.com/Tonyb29/Celestial-Calendar/main/module.json
   ```

### Manual

1. Download the latest `.zip` from [Releases](https://github.com/Tonyb29/Celestial-Calendar/releases)
2. Extract the folder into your Foundry modules directory:
   - **Windows:** `%localappdata%\FoundryVTT\Data\modules\`
   - **Mac:** `~/Library/Application Support/FoundryVTT/Data/modules/`
   - **Linux / self-hosted:** `~/foundryuserdata/Data/modules/`
3. In Foundry → **Add-on Modules**, click **Refresh** and enable **Celestial Calendar**

---

## Usage

1. Enable the module in your world
2. Click the **🌙 moon button** in the Journal sidebar to open the Night Sky panel
3. Navigate using the day controls or jump directly between celestial events
4. Set the current campaign day in **Game Settings → Module Settings → Celestial Calendar → Current Campaign Day**

---

## Custom World Calendars

Celestial Calendar ships with Eldoria as the default world. To use your own:

1. Open the **[DnD Parser Toolkit](https://github.com/Tonyb29/Tonyb29)** and navigate to the **✦ Celestial** tab
2. In **Settings**, configure your world name, moons (orbit lengths, sizes, colors), and event boons/pitfalls
3. Click **Copy JSON** to copy your calendar configuration
4. In Foundry → **Game Settings → Module Settings → Celestial Calendar**, paste the JSON into the **Custom Calendar JSON** field and save

Your custom moons, events, and narrative effects will appear immediately.

---

## Simple Calendar Integration

Install [Simple Calendar](https://foundryvtt.com/packages/foundryvtt-simple-calendar) for automatic date sync. When active, the Night Sky panel updates whenever the in-game date changes — no manual day setting required.

Use **Simple Calendar Day Offset** in Module Settings to align campaign days if your Simple Calendar year starts at a different offset.

---

## Celestial Events

| Event | Condition | Default Eldoria Timing |
|---|---|---|
| **Full Moon** | Moon near peak illumination | Luna: every 30d · Selene: every 50d |
| **New Moon** | Moon near zero illumination | Luna: every 30d · Selene: every 50d |
| **Conjunction** | All moons aligned (same phase) | Every 75d |
| **Opposition** | Two moons on opposite sides | Every 75d (offset from conjunction) |
| **Lunar Eclipse** | Full-moon conjunction — planet's shadow across all moons | Every 150d |

All timings are computed mathematically from orbital periods — no hardcoded event list. Works for any number of moons with any orbit lengths.

---

## What's Coming

Celestial Calendar is actively developed as part of a larger DM toolkit. Planned features include:

- **Foundry Journal Export** — generate journal entries for every celestial event in the current year, ready to drop into your campaign timeline
- **In-game Chat Announcements** — post tonight's events and boons/pitfalls to the chat log automatically at session start or midnight rollover
- **GM Screen Widget** — a compact always-visible overlay showing current moon phases without opening the full panel
- **AI Sky Descriptions** — poetic read-aloud descriptions of tonight's sky, generated via Claude AI (requires API key in Module Settings)
- **Multi-calendar Support** — maintain separate calendars for different planes, realms, or campaign arcs and switch between them mid-session
- **Solar Eclipse Tracking** — daytime eclipse events for worlds where the sun's geometry matters
- **Foundry Package Listing** — full submission to the official Foundry VTT package registry for one-click discovery

---

## Compatibility

| Foundry Version | Status |
|---|---|
| v12 | Verified |
| v11 | Compatible |
| v10 | Untested |

---

## Bug Reports & Feature Requests

Open an issue at [github.com/Tonyb29/Celestial-Calendar/issues](https://github.com/Tonyb29/Celestial-Calendar/issues).

---

## License

MIT — free to use, modify, and distribute. Attribution appreciated.

---

*Part of the [DnD Parser Toolkit](https://github.com/Tonyb29/Tonyb29) — a suite of tools for building Foundry VTT worlds faster.*
