<div align="center">

# 🪐 Orbit

### Plan your day. Focus deeply. Capture every idea — completely offline.

Tasks, habits, a Pomodoro timer and a notebook in one app.<br>
Everything is stored privately on your phone. No account, no cloud, no internet needed.

[![Download APK](https://img.shields.io/badge/Download-Android%20APK-3DDC84?style=for-the-badge&logo=android&logoColor=white)](https://github.com/oussamatght/orbit-planner/releases/latest)

![Expo SDK](https://img.shields.io/badge/Expo%20SDK-58-000020?logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React%20Native-Android%20%26%20iOS-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![SQLite](https://img.shields.io/badge/Storage-SQLite%20offline-003B57?logo=sqlite&logoColor=white)
![Languages](https://img.shields.io/badge/Languages-EN%20%7C%20FR%20%7C%20AR-F59E0B)

</div>

---

## Table of contents

- [Download](#-download)
- [Why Orbit](#-why-orbit)
- [Features](#-features)
- [Tech stack](#-tech-stack)
- [Getting started](#-getting-started)
- [Build an APK](#-build-an-apk)
- [Languages and right-to-left](#-languages-and-right-to-left)
- [Quality checks](#-quality-checks)
- [Architecture](#-architecture)
- [Known limitations](#-known-limitations)
- [Author](#-author)

---

## 📲 Download

| Platform | Download |
|---|---|
| **Android** (APK) | **[⬇️ Download the latest APK](https://github.com/oussamatght/orbit-planner/releases/latest)** |

### Install on Android

1. Open the link above on your phone and download the `.apk` file listed under **Assets**.
2. Open the downloaded file.
3. If Android asks, allow **Install unknown apps** for your browser or file manager.
4. Tap **Install**, then open **Orbit**.

> The APK is shared directly from GitHub and not through the Play Store, so Android may show a
> warning the first time. Tap **Install anyway** to continue.

**iOS:** there is no ready-made build. You can run the app from source with Expo Go — see
[Getting started](#-getting-started).

---

## ✨ Why Orbit

- **100% offline and private.** There is no backend, no account and no network dependency. Your data
  stays on your device unless you export a backup yourself.
- **Everything in one place.** Tasks, calendar, habits, focus sessions, notes and statistics share one
  fast, consistent interface.
- **Built for speed.** Quick Add keeps the sheet open for fast capture, and swipe gestures complete
  or delete tasks with an **Undo** toast.
- **Speaks your language.** English, Français and العربية with a full right-to-left layout.
- **Safe backups.** Export and import your data as JSON, with automatic safety copies before
  anything is replaced.

---

## 🧩 Features

| Area | Highlights |
|---|---|
| **Today** | Greeting, progress ring, completed / remaining / focus time, priorities, overdue (reschedule all), today, upcoming, habits strip, projects |
| **Tasks** | Title, description, notes, due and start date, start/end time, 4 priorities, project, category, tags, status, subtasks, multiple reminders, recurrence (daily/weekly/monthly/yearly/custom with weekdays), dependencies ("blocked by"), duplicate, archive |
| **Quick Add** | Floating + button opens a bottom sheet with inline pickers for date, time, priority, project, tags, reminders and repeat. It stays open for fast capture |
| **Inbox** | Inline capture, search, one-tap "schedule" |
| **My Tasks** | Filters (all/today/upcoming/overdue/high/unscheduled/completed/archived), 5 sorts, full-text search (title, notes, subtasks, #tags), long-press bulk actions (complete, priority, move, date, delete), manual reordering, archive completed |
| **Gestures** | Swipe right = complete, swipe left = delete, both with **Undo** toasts |
| **Calendar** | Day timeline (now-line, overlap layout, tap an hour to add), week strip, month grid with dots, 60-day agenda. Long-press any task to reschedule |
| **Projects** | Name, description, icon, color, progress ring, created date, archive |
| **Habits** | Daily / specific weekdays / N× per week, daily targets (e.g. 8 glasses), reminders, streaks, best streak, 30-day rate, week and month progress, 12-week heatmap (tap to back-fill) |
| **Focus** | Pomodoro with custom durations, long-break cycle, link to a task, end-of-session notification, history, daily goal. The timer survives backgrounding and app restarts |
| **Notebook** | Notebooks (Ideas, Study…), pin, color, archive, search, checklists (`- [ ]`, tap to tick), word count, autosave, turn a note into a task |
| **Statistics** | KPI tiles, last 7 days, 12 weeks / 6 months, focus per day, open tasks by priority, habit consistency, project progress |
| **Settings** | Light / Dark / System theme, English / Français / العربية (RTL), first day of week, notification toggles (permission-aware), default priority and reminder, reminder time, haptics, focus durations, **export/import JSON backup**, clear data (double confirm), about |

---

## 🛠 Tech stack

| Layer | Technology |
|---|---|
| Framework | React Native with Expo SDK 58 |
| Navigation | Expo Router (file-based routes) |
| Language | TypeScript (strict) |
| Storage | SQLite via `expo-sqlite` (WAL mode, foreign keys, versioned migrations) |
| State | Zustand stores with optimistic updates and rollback |
| Animation and gestures | Reanimated, Gesture Handler |
| Graphics | `react-native-svg`, `expo-linear-gradient` |
| Notifications | `expo-notifications` (local only) |
| Files and sharing | `expo-file-system`, `expo-sharing`, `expo-document-picker` |
| Testing | Jest, including real-SQLite persistence tests |

---

## 🚀 Getting started

```bash
npm install
npx expo start            # scan the QR code with Expo Go
npx expo start --android  # Android emulator / device
npx expo start --ios      # iOS simulator (macOS)
```

**Expo Go:** every native module the app uses ships with Expo Go (expo-sqlite, expo-notifications in
local mode, haptics, file-system, sharing, document-picker, reanimated, gesture-handler, svg,
linear-gradient). Local notifications work in Expo Go. Only *push* notifications need a development
build, and this app doesn't use push.

For a development build:

```bash
npx expo run:android      # or: npx expo run:ios
npx eas-cli@latest build --profile development
```

---

## 📦 Build an APK

```bash
npx eas-cli@latest build --platform android --profile preview     # installable APK
npx eas-cli@latest build --platform android --profile production  # Play Store bundle (.aab)
```

Build profiles live in `eas.json`.

To build under your own Expo account, remove `extra.eas.projectId` from `app.json`, then run
`npx eas-cli@latest init` to link your own project.

---

## 🌍 Languages and right-to-left

English, Français and **العربية**. On first launch the app follows the device language. Arabic uses the
**Cairo** font (Plus Jakarta Sans has no Arabic glyphs) and a right-to-left layout. Switching to or from
Arabic flips the direction and restarts the app (`reloadAppAsync`). Expo Go resets RTL preferences, so
check the right-to-left layout in an APK or development build.

---

## ✅ Quality checks

```bash
npm run typecheck   # tsc --noEmit (strict)
npm run lint        # expo lint (incl. React Compiler rules)
npm test            # Jest: logic, routes, and real-SQLite persistence tests
npx expo-doctor
```

`src/__tests__/persistence.test.ts` runs the real migrations, repositories and Zustand stores
against Node's built-in SQLite (`node:sqlite`, Node ≥ 22). It covers restarts, cascades, recurrence,
undo, dependencies and backup round-trips.

---

## 🏗 Architecture

```
src/
  app/            Expo Router screens: (tabs)/, tasks/, projects/, habits/, notes/, focus/, statistics/, settings/
  components/     ui/ (design system), tasks/, calendar/, habits/, projects/, notes/, charts/, navigation/
  database/       database.ts (single connection, WAL, FKs), migrations/ (PRAGMA user_version), schema.ts, repositories/
  store/          Zustand stores: task, project (+categories/tags), habit, focus, note, settings, ui
  services/       notificationService, backupService (+backupValidation), taskActions, habitActions, statisticsService, bootstrap
  utils/          date, recurrence, taskFilters, habitStats, noteContent, format, haptics
  theme/          tokens, light/dark palettes, ThemeProvider
  i18n/           en.ts, fr.ts, ar.ts (typed: a missing key fails to compile)
```

- **Data flow:** screens → `services/*Actions` (toasts, haptics, undo) → stores (optimistic update and
  rollback) → repositories → SQLite. Business rules live in stores, utils and services, not in screens.
- **Migrations:** append a new entry to `database/migrations/index.ts`. Each one runs in a
  transaction. A database from a newer app version is refused rather than modified.
- **Backups:** importing validates every table column by column against a whitelist, drops dangling
  references, and writes an automatic safety copy of the current data
  (`documents/backups/auto-*.json`, last 5 kept) before replacing anything. Clearing data does the same.
- **Notifications** use deterministic identifiers (`task-<reminderId>`, `habit-<id>-<n>`, `focus-timer`).
  They're rescheduled on every task change and cancelled on delete, complete or archive.

---

## 🚧 Known limitations

- Reordering uses move-up/down buttons (manual sort in My Tasks), not drag-and-drop.
- iOS allows at most 64 pending local notifications per app.

---

## 👤 Author

**Oussama Taright** — full-stack developer and computer science student at USTHB.

- GitHub: [oussamatght](https://github.com/oussamatght)
- Portfolio: [portfolio-mauve-iota-15.vercel.app](https://portfolio-mauve-iota-15.vercel.app/)

If you like Orbit, a ⭐ on the repository is always appreciated.
#   o r b i t - p l a n n e r  
 