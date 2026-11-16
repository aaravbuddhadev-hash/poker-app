# Riverline on the Apple App Store: release plan

Audited on 16 November 2026 against the code in this repository and Apple's
requirements as of that date. Apple changes its rules often, so the facts marked
**(check)** should be re-confirmed on Apple's site on the day you act on them.

## Progress

**Phase A code work: done (16 Nov 2026), except the parts that need Xcode.**
- ✅ **C1 Capacitor:** Capacitor 8 and the `ios/` project (Swift Package Manager), plus `npm run ios:sync` and `npm run ios:open`.
- ✅ **C2 Native sharing:** CSV export and Year in Review images open the share sheet in the app (`src/native/native.ts`).
- ✅ **C3 Fonts:** bundled in the app; no requests to Google.
- ✅ **C4 Icon and launch:**
  - opaque 1024 px icon;
  - branded launch screen;
  - display name "Riverline", version 1.0.0 (build 1);
  - portrait only; iPhone only (so no iPad screenshots are needed).
- ✅ **C5 Privacy manifest:** `ios/App/App/PrivacyInfo.xcprivacy`, matching section 5.
- ✅ **C6 Durable storage:** saved data is mirrored to native storage and restored at launch.
- ✅ **C7 Native touches:**
  - haptics (saving, quiz answers, card picks, puzzle lock-in, badges);
  - status bar follows the theme;
  - launch-screen hand-off;
  - sync on resume.

  *Not done (optional):* a daily-puzzle reminder notification.
- ✅ **C8 Legal pages:** `public/privacy.html`, `terms.html` and `support.html`, linked from Profile. **Your review is still needed (Y6).** They go live with the next `npm run deploy`.
- ✅ **C9 Gambling help:** "Play responsibly" card on Profile; help line also on the terms and support pages.
- ✅ **C10 Export compliance:** `ITSAppUsesNonExemptEncryption = NO`.
- ⏳ **Needs Xcode:** first Simulator build and full test pass, then C11 (screenshots).
- ⏳ **Needs your decision:** C12 (backend plan), Y3 (bundle ID; currently `io.github.aaravbuddhadev.riverline`) and Y5 (support email; the pages use GitHub Issues for now).

**Building the iOS app:** run `npm run ios:sync` after any web change, then `npm run ios:open` to open it in Xcode.

Work through the phases in order. Each item is tagged:

- **Claude** = I can do it in the code.
- **You** = needs your Apple account, money, identity, a legal agreement or a decision.
- **Blocking** = Apple will not accept the app without it. **Recommended** = strongly advised.

---

## 1. Audit: where the app stands today

| Question | Finding |
| --- | --- |
| Stack | React 19 + TypeScript + Vite, Tailwind, Motion, Recharts. Supabase (Postgres + Auth) as the backend. |
| What it is | A **web app** (installable, with a web manifest), hosted on GitHub Pages. It is not a native iOS app. |
| Can it be submitted as is? | **No.** Apple only accepts apps built in Xcode. The web code has to be packaged inside a native iOS shell. |
| Best way to package it | **Capacitor** (see section 2). It reuses 100% of the existing code, design and backend. |
| Backend ready for production? | Mostly. Row-level security is on every table and verified (a stranger with the public key reads nothing and can't delete accounts). Two gaps: the **free Supabase plan pauses after about a week without activity**, and **password-reset emails** go through Supabase's built-in sender, which is heavily rate-limited. |
| Authentication | Works: sign-up, sign-in, sign-out, password reset and in-app account deletion were all tested against the real project. Sessions persist across launches. |
| Data persistence | Works on the web, and is synced to the cloud when signed in (tested between two "devices"). On iOS, data for people who aren't signed in lives in the web view's storage, which iOS can clear under storage pressure; see item C6. |
| Security | No secret keys in the app. Only the public Supabase URL and the publishable key are bundled, and they're safe by design because of row-level security. `.env.local` is git-ignored. |
| Privacy | No analytics, no ads, no tracking, no third-party SDKs besides Supabase. **One leak:** fonts load from Google Fonts, which sends each visitor's IP address to Google; see item C3. |
| Policy risks | No wagering, no real-money balances, no payments, nothing that facilitates betting. The main questions are the **age rating** and Apple's **"minimum functionality"** rule for apps built from web code. Both are covered in section 4. |
| Things that break inside an iOS app | **CSV export** and **Year in Review "Save image"** use browser downloads, which do nothing in an iOS app's web view. Both need the native share sheet; see item C2. |

**This Mac:** macOS 27.2, but **Xcode is not installed** (only the command-line tools). Xcode is required.

---

## 2. Recommended approach: Capacitor

[Capacitor](https://capacitorjs.com) wraps the existing built web app (the same `dist/` folder) in a
native iOS project. The app's files are bundled *inside* the app, not loaded from the website, so
it opens instantly and works offline. Native features (share sheet, haptics, notifications) are
added through small plugins.

- **Do you need a Mac?** Yes, and you have one.
- **Do you need Xcode?** Yes. It's free from the Mac App Store, but very large (allow an hour and 15+ GB).
  Since 28 April 2026, App Store uploads must be built with **Xcode 26 or later** on the iOS 26 SDK **(check)**.
  The current Capacitor (version 8) needs Xcode 26 as well.
- **Do you need an Apple Developer account?** Only for a real iPhone, TestFlight and the App Store.
  The iOS Simulator works without one, so we can build and test before you pay.
- **Changes to the existing app?** Small and additive: a new `ios/` folder, a `capacitor.config.ts`
  file, and a few code paths that use native features when running inside the iOS app.
- **Can the web version keep running?** Yes. The same code builds both; `npm run deploy` keeps
  updating the website.

Alternatives considered: React Native or Expo would mean **rewriting every screen**. A native Swift
rewrite would mean rewriting everything. Neither is justified here.

---

## 3. Checklist

### Already complete

- [x] Core features work and are tested (179 automated tests; poker maths checked by exhaustive tests).
- [x] Accounts, cloud sync and **in-app account deletion**. Apple requires apps that let you create
      an account to also let you delete it from inside the app (Guideline 5.1.1(v)).
- [x] Database security (row-level security on every table, verified from outside).
- [x] No secret keys in the client; environment variables handled correctly.
- [x] Phone layouts: checked at iPhone width with no sideways overflow, touch targets enlarged,
      and safe-area padding (`viewport-fit=cover` + `env(safe-area-inset-*)`) already in place.
- [x] Loading states, crash recovery screen, network-failure handling, offline-friendly sync.
- [x] Accessibility: every screen passes an automated axe audit in light and dark themes.
- [x] Reduced-motion support for all animations.
- [x] Branding: 1024×1024 app icon artwork and a 1290×2796 splash image already exist in `branding/final/png`.
- [x] No real-money features, no in-app purchases, no ads.
- [x] Sign in with Apple is **not required**: Apple only requires it when an app offers sign-in
      with another company's account (Google, Facebook…). Riverline uses email and password only.

### Needs fixing or building (Claude)

| # | Item | Why | Priority |
| --- | --- | --- | --- |
| C1 | Add Capacitor and generate the iOS project | Apple only accepts Xcode-built apps | **Blocking** |
| C2 | Native share sheet for CSV export and Year in Review images | Browser downloads do nothing inside an iOS app | **Blocking** (otherwise broken features get the app rejected under Guideline 2.1) |
| C3 | Bundle the fonts in the app instead of loading them from Google | Works offline; no IP address sent to Google; simpler privacy disclosure | **Blocking** for an honest privacy label |
| C4 | App icon without transparency, launch screen, display name, version/build numbers | App Store Connect rejects icons that have an alpha channel | **Blocking** |
| C5 | Privacy manifest (`PrivacyInfo.xcprivacy`) | Required since 2024 for apps and SDKs that use certain iOS APIs; missing entries block upload | **Blocking** |
| C6 | Keep guest data in native storage, not just the web view's | iOS may clear web-view storage when the device runs low on space | Recommended |
| C7 | Native touches: haptics, status bar styling, splash hand-off, optional daily-puzzle reminder | Reduces the risk of a Guideline 4.2 ("minimum functionality") rejection for web-based apps | Recommended |
| C8 | Privacy policy, terms and support pages hosted on the website | App Store Connect requires a privacy policy URL and a support URL | **Blocking** |
| C9 | A responsible-gambling note with a help line in Settings and the session form | Lowers the risk in review for a gambling-adjacent app, and is good practice | Recommended |
| C10 | `ITSAppUsesNonExemptEncryption = NO` in Info.plist | Riverline only uses standard HTTPS, which is exempt; this skips a question on every upload | Recommended |
| C11 | App Store screenshots (6.9-inch iPhone) from the simulator | Required for the listing | **Blocking** |
| C12 | Production backend: keep-alive or paid plan; custom email sender | Users and App Review must never hit a paused backend; password-reset emails must arrive | **Blocking** for the backend; email sender recommended |

### Actions you must complete

| # | Item | Where | Cost | Priority |
| --- | --- | --- | --- | --- |
| Y1 | Install **Xcode** | Mac App Store → search "Xcode" → Get | Free | **Blocking** |
| Y2 | Enroll in the **Apple Developer Program** | developer.apple.com/programs/enroll | **$99 per year** **(check)** | **Blocking** |
| Y3 | Choose a **bundle ID** and confirm the app name "Riverline" in App Store Connect | App Store Connect | Free | **Blocking** |
| Y4 | Decide how to keep the backend awake (section 6) | Supabase | $0 or $25/month | **Blocking** |
| Y5 | A **support email address** to publish (consider a new one rather than your personal address) | Any email provider | Free | **Blocking** |
| Y6 | Review and approve the privacy policy and terms I draft | This repository | Free | **Blocking** |
| Y7 | Create a **demo account** for App Review and enter it in App Store Connect | The app + App Store Connect | Free | **Blocking** |
| Y8 | Answer the age-rating, privacy and export-compliance questions in App Store Connect (I'll give you every answer) | App Store Connect | Free | **Blocking** |
| Y9 | Test on your own iPhone and with TestFlight testers, then approve the release candidate | TestFlight | Free | **Blocking** |
| Y10 | Press **Submit for Review**, then choose when to release | App Store Connect | Free | **Blocking** |

---

## 4. App Store policy review

**Gambling (Guideline 5.3).** Apple's gambling rules govern apps where money is wagered, or where
contests and lotteries are run. Riverline takes no bets, holds no balances, pays nothing out and
links to no gambling operator. It records results people type in themselves and teaches the game.
Apple does not allow "gambling aids" such as card counters, and Riverline's odds calculator does
**not** count as one: it's an educational tool for hands you enter, with no live play.
Keep it that way: no live-game helpers, no links to poker sites, no affiliate offers.

**Age rating.** Apple's current scale is 4+, 9+, 13+, 16+ and 18+, set from a questionnaire
**(check the questionnaire on the day)**.
- Riverline has no casino-style gameplay. Its fictional poker tables involve no betting, chips or
  balance, so "Simulated Gambling" can honestly be answered as **None**.
- **My recommendation is to set the rating to 18+ anyway.** The app's main purpose is recording
  real-money poker results, so it's for adults who gamble legally. A higher rating than the
  questionnaire suggests can't count against you; a lower one can.

**Recording money results.** This is personal record-keeping, like a spending log. It isn't
financial advice, banking or trading, and needs no licence. Keep the wording neutral ("net result",
"session"), never promote gambling, and don't describe the app as a way to "win more".

**Educational content.** The rules, glossary, quizzes and puzzles help with Guideline 4.2, because
they're substantial content that works offline inside the app.

**User-generated content.** Notes are private to their owner and never shown to other people, so
Apple's moderation rules for user-generated content (Guideline 1.2) don't apply.

**Accounts.** Accounts are optional, and deletion happens inside the app, both as Apple requires.

**Privacy.** See section 5. No tracking means **no App Tracking Transparency prompt** is needed.

**The real risk: Guideline 4.2, "Minimum Functionality".** Apple rejects apps that feel like a
website in a wrapper. Riverline is better placed than most:
- its content is bundled and works offline;
- it has real interactive tools (the odds engine runs on the device);
- with C2 and C7 it uses native sharing, haptics and (optionally) notifications.

Even so, this is the rejection we're most likely to see. If it happens, the reply to App Review
should list the native features and offline capabilities. I'll draft that reply if we need it.

---

## 5. Privacy: what Riverline actually collects

From reading the code and the database schema:

| Data | When | Where it goes | Linked to the person? | Used for |
| --- | --- | --- | --- | --- |
| Email address | Only if you create an account | Supabase Auth | Yes | Signing in, password reset |
| Account ID (random) | Only with an account | Supabase | Yes | Keeping each person's rows separate |
| Session records: date, net result, optional start/end amounts, duration, game type, notes | Stored on the device; uploaded only with an account | Supabase `sessions` table | Yes | The app's core features and sync |
| Learning progress: lessons, quiz attempts, puzzle answers, announced badges | Stored on the device; uploaded only with an account | Supabase `progress` table | Yes | Sync |
| IP address | Every network request to Supabase (and to Google Fonts until C3 is done) | Supabase's servers | Not used for tracking | Delivering the service |

**Not collected:** location, contacts, photos, device identifiers, analytics, advertising IDs,
crash reports, payment details. Data saved on the device without an account never leaves it.

**App Store privacy label (my proposed answers; you enter them in Y8):**
- Data used to track you: **None**.
- Data linked to you, for App Functionality only:
  - **Contact Info → Email Address**
  - **Identifiers → User ID**
  - **Financial Info → Other Financial Info**: the recorded session amounts. Declaring these errs on
    the side of disclosure.
  - **User Content → Other User Content**: notes and learning progress.

**Where the documents live:** `public/privacy.html`, `public/terms.html` and `public/support.html`,
so they're published with the website at `https://aaravbuddhadev-hash.github.io/poker-app/privacy.html`
and so on. They'll also be linked from the Profile page.

**Retention and deletion:** data is kept until the person deletes it. Deleting a session removes it
from every device (a deletion marker stays in the database so other devices learn about it).
"Delete account" permanently removes the account and all of its rows straight away. Signing out
removes the account's copy from that device.

---

## 6. Production backend decisions (Y4, C12)

**Pausing.** On the free plan, Supabase pauses a project after about a week of low activity, and a
paused project rejects every sign-in until someone restores it by hand. A reviewer or new user
hitting that would see sign-in fail. Options:
1. **Supabase Pro, about $25 a month (check):** never pauses, includes backups. The most reliable option.
2. **Free plan plus a keep-alive ping** every few days. Free and usually enough for a small app,
   but not officially guaranteed.
3. **Stay as is and restore by hand** when warned. Not recommended once the app is public.

**Email.** Password-reset emails currently go through Supabase's built-in sender, which only sends a
handful of emails per hour across the whole project. For a public app, connect a real email
sender (several have free tiers) under Authentication → Emails → SMTP. You'll need an account
with that provider. Email confirmation can stay off.

---

## 7. Phases

### Phase A: Build the iOS app (Claude, after your go-ahead), then test it in the Simulator (needs Xcode)
C1–C7, C9 and C10, then run the app in the iOS Simulator and test every feature.

### Phase B: Your Apple account (You)
1. Make sure your Apple Account has **two-factor authentication** on
   (iPhone: Settings → your name → Sign-In & Security).
2. Go to **developer.apple.com/programs/enroll** → **Start your enrollment** → sign in.
3. Choose **Individual / Sole Proprietor**.
   - Your **legal name is shown publicly** as the seller on the App Store.
   - Apple requires you to be the **age of majority** where you live (18 in most places). If you
     aren't, a parent or guardian must enroll instead, and the app is published under their name.
   - Organisations need a D-U-N-S number, which only makes sense if you form a company.
4. Verify your identity when asked (often with your iPhone and a photo ID), accept the
   **Apple Developer Program License Agreement**, and pay **$99** **(check the current price)**.
   Individual enrollments are often approved within a day or two.
5. Once approved, sign in to **appstoreconnect.apple.com** and accept the agreements in
   **Business** (the Free Apps agreement is enough; Riverline is free).

### Phase C: Signing and the App Store Connect record (You, with my instructions)
- In Xcode → Settings → Accounts, add your Apple ID. Xcode then creates the signing
  certificates for you ("Automatically manage signing").
- **Bundle ID:** permanent and unique, in reverse-domain form, for example
  `io.github.aaravbuddhadev.riverline`. I'll set it in the project once you choose.
- App Store Connect → Apps → **+ New App**:
  - Platform: iOS
  - Name: Riverline (if it's taken, try "Riverline: Poker Tracker")
  - Primary language: English (U.S.)
  - Bundle ID: as above
  - SKU: riverline-ios
- **Capabilities:** none are needed beyond the default. Push notifications are only needed if we add
  remote notifications; a local daily-puzzle reminder doesn't need them.

### Phase D: TestFlight (You and Claude)
- **How it works:** Xcode → Product → **Archive** → **Distribute App** → **App Store Connect** uploads a build.
  Within about 30 minutes it appears in App Store Connect → TestFlight.
- **Internal testers:** people on your App Store Connect team, up to 100. No review needed;
  they can test straight away.
- **External testers:** anyone you invite by email or public link, up to 10,000. The first build
  needs a short **beta app review** (usually under a day).
- Testers install Apple's **TestFlight** app and can send screenshots with feedback. Crashes show up in
  App Store Connect → TestFlight → Crashes, and in Xcode → Window → Organizer → Crashes.

**Test checklist (run it on a real iPhone):**
- [ ] First launch: splash, then Home, with no white flash. Status bar readable in dark and light themes.
- [ ] Demo mode on and off. Your own data is untouched.
- [ ] Add, edit and delete a session (simple, then start/end amounts). Totals and charts update.
- [ ] History filters and sorting, calendar, analytics charts.
- [ ] Odds calculator: pick cards on a phone, add players, exact odds appear.
- [ ] Daily puzzle: predict, lock in, explanation, deal run-outs; streak updates the next day.
- [ ] Rules lessons: step through a deal (cards flip), mark complete → achievement celebration.
- [ ] Quizzes: each category, missed questions go to review.
- [ ] Year in Review: plays, the summary card shares via the share sheet, amounts hidden by default.
- [ ] Export CSV via the share sheet (save to Files, open in Numbers).
- [ ] Create an account, sign out, sign in, then sign in on a second device: data syncs both ways.
- [ ] Airplane mode: add a session (saved), turn the network back on, it syncs.
- [ ] Forgot password email arrives and the reset works.
- [ ] Delete account: confirm the data is gone and you're signed out.
- [ ] Rotate the phone, use large Dynamic Type text, try VoiceOver on the main screens.
- [ ] Kill and relaunch the app: still signed in, data intact.

### Phase E: Store listing and submission (You, with my drafts)
- **Category:** Primary **Sports**, Secondary **Education**. Avoid "Games" and "Casino": Riverline isn't a game.
- **Age rating:** questionnaire as in section 4, then set **18+**.
- **Price:** Free. **Availability:** start with your own country; real-money poker laws vary by
  country and the app is about real-money poker.
- **Screenshots:** 6.9-inch iPhone. I'll generate them from the Simulator.
- **Description, subtitle and keywords:** drafted in section 8.
- **App Review notes:** "Riverline is a personal record-keeping and education app. It does not
  offer, facilitate or link to real-money gambling. All poker hands in the app are fictional.
  Demo account: (email) / (password). The app is fully usable without an account; tap 'Explore
  with demo data' on the Home screen."
- **Export compliance:** "None of the algorithms mentioned above" (HTTPS only).
- **Submit:** choose the build → **Add for Review** → **Submit**. Reviews usually take 1–3 days.
  Choose **Manually release** so nothing goes live until you press the button.
- **If it's rejected:** the message appears in App Store Connect → App Review. Reply there or
  fix and upload a new build (with a higher build number). Most rejections are fixable in a day.

**I will not submit or publish anything.** Every step that sends the app to Apple is yours to press.

---

## 8. Draft store listing

**Subtitle (30 chars max):** Poker session tracker & coach

**Description:**
> Riverline keeps a clear record of your poker sessions and helps you understand the game.
>
> TRACK YOUR SESSIONS
> Record each session's result in seconds, or enter your starting and ending amounts and let
> Riverline do the maths. See your lifetime net, trends over time, monthly totals, a calendar
> heatmap and your personal records.
>
> LEARN TEXAS HOLD'EM
> Nine short interactive lessons, from the deck to showdown, a searchable glossary of 53 terms,
> and all ten hand rankings with real examples.
>
> SHARPEN YOUR INSTINCTS
> A new probability puzzle every day, exact odds for any hands you enter, and quizzes in six
> categories that get harder as you improve. Earn badges for learning, never for results.
>
> YOUR YEAR IN REVIEW
> A short animated story of your year that you can share, with money amounts hidden by default.
>
> PRIVATE BY DESIGN
> Use it without an account and everything stays on your iPhone. Create a free account to sync
> across devices. No ads, no tracking.
>
> Riverline is for personal record-keeping and education. It does not offer real-money gambling.
> If gambling is causing you problems, call or text 1-800-GAMBLER (US).

**Keywords (100 chars, comma-separated, no spaces):**
`poker,tracker,bankroll,holdem,odds,calculator,sessions,hand,rankings,quiz,statistics,learn,results`

**Promotional text:** "New: a daily probability puzzle with exact answers."

---

## 9. After release: every update

1. Make and test the change: `npm test`, then try it in the Simulator.
2. Bump the version in Xcode (General → Identity):
   - **Version** for what users see (1.0.0 → 1.0.1 for fixes, 1.1.0 for features).
   - **Build** must go up on every upload (1, 2, 3…).
3. `npm run build && npx cap sync ios`, then Xcode → Product → **Archive** → Distribute → App Store Connect.
4. Check the new build in TestFlight first.
5. App Store Connect → **+ Version**, fill in "What's New", choose the build, submit.
6. `npm run deploy` keeps the website in step.
7. Watch Organizer → Crashes and App Store Connect → Ratings & Reviews for a few days.
8. Keep Supabase healthy: plan status, backups, and the warning emails it sends.
9. Once a year: renew the $99 membership. **If it lapses, the app is removed from sale.**

Database changes go in a new file in `supabase/migrations/`. Never edit one that has already been run.
