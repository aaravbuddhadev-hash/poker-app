<p align="center">
  <img src="branding/final/png/riverline-social-card-1200x630.png" alt="Riverline: Every session, one line." width="720" />
</p>

# Riverline · Poker Companion

**Live app: [aaravbuddhadev-hash.github.io/poker-app](https://aaravbuddhadev-hash.github.io/poker-app/)**. It runs in any browser, with nothing to install. Your data stays on your own device. Tap "Explore with demo data" to look around first.

A poker companion web app for **recording your own session results** and **learning Texas Hold'em**. Track your lifetime net, see your trends in charts, and (coming soon) practice probability with a daily puzzle on a virtual poker table.

Riverline is for personal recordkeeping and education only. It never handles money, wagers or payments.

Brand guide, logos and icons: [`branding/BRAND.md`](branding/BRAND.md).

## What works today

- **Session tracker**: add, edit and delete sessions. Enter a net result directly, or record start and end amounts and let the app calculate the net. Optional duration, game type and notes.
- **Dashboard**: an animated lifetime net, 8 key stats, and a cumulative results chart (7D / 30D / 90D / Year / All).
- **History**: search notes, filter by date range, game type and result, and sort four ways.
- **Calendar**: a month view colored by daily result, where you can add a session for any day.
- **Analytics**: personal records, cumulative and monthly charts, an outcome donut, a GitHub-style yearly heatmap, and a game type comparison.
- **Daily puzzle**: a new probability challenge every day, generated from the UTC date, so everyone gets the same puzzle and refreshing never changes it.
  - It rotates through preflop, flop and turn situations with two or three players, filtered so no hand is a lock.
  - You predict each player's share of the pot with linked sliders, then see the exact answer, your accuracy, a plain-English explanation (including the exact river cards that change the winner), and can deal out random run-outs on an animated table.
  - It tracks your streak, average accuracy, best prediction and history.
- **Year in Review**: a Spotify Wrapped–style story of your year.
  - Seven animated full-screen slides: your year, the numbers (animated net result), most active month, session history, biggest session, learning progress, and a one-screen summary.
  - Slides auto-advance with pause, tap and keyboard navigation, and replay. The current year is labeled "year to date", and previous years are one tap away.
  - Save the summary card as a PNG or share it. A privacy setting (on by default) leaves every money amount off exported cards.
  - Slides without enough data are skipped rather than filled with made-up numbers.
- **Quizzes**: six categories (hand rankings, who wins, tie-breakers, rules, terminology, probability) at three difficulty levels, plus a five-question quick quiz.
  - Question styles: multiple choice, dealt showdowns on the table, picking the strongest hand or the winning river card, and number answers.
  - Hand questions are dealt fresh each time; the evaluator and equity engine compute every answer and explanation, and tests re-check 126 generated quizzes.
  - Missed questions go to a review list until you answer them correctly.
- **Achievements**: ten learning badges (lessons, quizzes, puzzles, streaks), shown on Profile with progress bars. Unlocking one plays a short celebration: the medal turns gold with a burst of sparks. None are tied to session results or money.
- **Poker table**: a reusable oval table with 2–6 seats, a dealer button, a dealing animation, and winning-hand highlights. Cards are two-sided and turn over in 3D when revealed (the flop turns one card at a time). Every animation respects the system's reduced-motion setting.
- **Rules guide**: nine short lessons, from the deck to showdown, kickers and outs. Mark lessons complete; progress is saved and shown on Learn and Profile. Interactive examples include a deal you can step through street by street, a six-seat table that shows how the button and blinds move, showdowns you reveal, and an outs calculator.
- **Glossary**: 53 terms with examples and cross-linked related terms. Search covers names, aliases ("UTG", "OESD") and definitions, and lessons link straight to each entry.
- **Hand rankings**: all ten hands with real card examples, tie-break rules and how often each occurs.
- **Odds calculator**: pick hands for 2–6 players and any board. It gives exact win/split odds by checking every possible remaining board (heads-up preflop is all 1,712,304), names each player's current hand, and explains the winner at showdown. It runs in a Web Worker so the page stays responsive.
- **Accounts and cloud sync** (optional): sign up with email and password to back up your sessions and learning progress and use them on several devices.
  - Works offline: changes save on the device first and upload when you're back online, with a status line showing what's waiting.
  - Edits from two devices are merged: the later edit of a session wins, and deletes sync too.
  - Data saved before signing in is added to the account only when you choose.
  - Sign out removes the account's data from the device; delete account removes it everywhere.
- **Demo mode**: fictional, clearly labeled data, stored separately from your real records.
- **Settings**: currency, dark and light themes, CSV export, and delete all.
- Responsive layout: bottom navigation on phones and a sidebar on desktop.

## Tech stack

| Area | Choice | Why |
| --- | --- | --- |
| UI | React 19 + TypeScript (strict) | Typed, component-based UI |
| Build | Vite | Fast dev server and builds |
| Styling | Tailwind CSS v4 with CSS-variable theme tokens | One palette drives light and dark themes |
| Charts | Recharts | Interactive, accessible SVG charts |
| Animation | Motion | Sheet, toast and hero transitions |
| Tests | Vitest | Fast unit tests for all calculation logic |

## Design decisions

- **Money is stored as integer cents.** Amounts are parsed from the typed digits, never by multiplying floats, so totals can't drift (`0.1 + 0.2` problems are impossible). Formatting to a currency happens only for display.
- **The poker engine is exact and verified.** Cards are integers, and a bit-mask hand evaluator scores any 5–7 cards. The tests prove it by:
  - counting all 2,598,960 five-card hands and matching the textbook total for every category (including exactly 4 royal flushes);
  - agreeing with a separate, deliberately simple evaluator on 20,000 random 7-card hands;
  - matching odds scenarios small enough to count by hand.
  Odds are never hard-coded or sampled.
- **Calculation logic is pure and separate from the UI.** `src/domain/analytics.ts` has no React or storage code, so every number on screen is unit-tested.
- **One source for the brand.** The logo, icons and social card are generated from a single definition of the mark and palette (`branding/tools`), so every asset matches.
- **Storage sits behind an interface.** `SessionRepository` has a device-only version for guests and a synced version for accounts, and no screen knows which one it's using.
- **Offline-first sync with last-writer-wins.** Signed-in data is saved on the device first, with a list of changes still to upload. Deletes are kept as tombstones so other devices learn about them. The database refuses to let an older edit overwrite a newer one, so it doesn't matter which device uploads first. Learning progress merges per item (the latest change per lesson, every quiz attempt, the first answer to each daily puzzle), and the tests check the merge gives the same result in either order.
- **Security lives in the database.** Every table uses Postgres row-level security, so the browser's public key can only reach the signed-in user's own rows. The schema is in [`supabase/migrations`](supabase/migrations).
- **Guests download nothing extra.** The Supabase client is loaded only when someone signs in.
- **Screens load on demand.** Each screen, and the chart library, is a separate download fetched when first needed (then prefetched in the background), which halved the first download.
- **Accessibility is checked, not assumed.** Every screen passes an automated axe audit in both themes, controls meet touch-target sizes on phones, and cards have text alternatives for screen readers.
- **Screens load on demand.** Each screen, and the chart library, is a separate download fetched when first needed (then prefetched in the background), which halved the first download.
- **Accessibility is checked, not assumed.** Every screen passes an automated axe audit in both themes, controls meet touch-target sizes on phones, and cards and charts have text alternatives for screen readers.
- **Stored data is validated when it's read back**, so a corrupt record is skipped instead of crashing the app.
- **CSV export guards against formula injection** in spreadsheet apps.

## Project structure

```
src/
  lib/          money (cents), dates, CSV: pure helpers
  domain/       session validation and analytics: pure, unit-tested
  poker/        cards, hand evaluator, exact equity engine, hand-ranking content
  learn/        lessons, glossary and probability math; every example is checked by tests
  puzzle/       daily puzzle generator (seeded by UTC date), scoring, streaks, explanations
  quiz/         question bank, engine-based question generators, quiz building and stats
  achievements/ achievement definitions computed from learning progress
  recap/        Year in Review stats, privacy-aware summary lines, canvas card export
  data/         storage interface, device and synced implementations, demo data
  sync/         session sync and progress merging: pure, unit-tested
  cloud/        Supabase client and table access
  state/        React providers: settings, sessions, toast, add/edit form
  components/   UI building blocks, charts, heatmap, calendar, app shell
  pages/        Home, Sessions, Profile, and the upcoming feature pages
```

## Getting started

```bash
git clone https://github.com/aaravbuddhadev-hash/poker-app.git
cd poker-app
npm install
npm run dev
```

Then open http://localhost:5173.

### Accounts (optional)

The app runs fine without a backend: everything stays on the device. To switch on accounts and sync:

1. Create a free project at [supabase.com](https://supabase.com).
2. In its SQL editor, run [`supabase/migrations/20261116000000_accounts_and_sync.sql`](supabase/migrations/20261116000000_accounts_and_sync.sql).
3. Copy `.env.example` to `.env.local` and fill in the project URL and publishable key (Project Settings → API).
4. Under Authentication → URL Configuration, add your site's address (for example `http://localhost:5173/`) to the redirect URLs, so confirmation and password-reset links come back to the app.

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm test` | Run the unit tests |
| `npm run build` | Type-check and build for production |
| `npm run lint` | Lint with oxlint |
| `npm run deploy` | Test, build and publish to GitHub Pages |
| `npm run deploy` | Test, build and publish to GitHub Pages |

## Roadmap

- [x] Phase 1: Architecture plan and branding concepts
- [x] Phase 2: Session tracker, dashboard, history, local storage
- [x] Phase 3: Analytics (cumulative, monthly, outcomes, heatmap, game types)
- [x] Phase 4: Hand rankings, rules guide, glossary
- [x] Phase 5: Hand evaluator, exact equity engine, hand comparison tool, animated poker table
- [x] Phase 6: Daily probability puzzle
- [x] Phase 7: Knowledge quizzes and achievements
- [x] Phase 8: Year in Review
- [x] Phase 9: Final branding: Riverline name, Breakout Spade logo, icons, splash
- [ ] Phase 10: ~~Deployment (GitHub Pages)~~ ✓, ~~accounts and cloud sync~~ ✓, polish
