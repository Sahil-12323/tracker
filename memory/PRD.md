# JobTrackr AI PRD

## Problem Statement
Build a production-ready iOS and Android mobile app plus backend named **JobTrackr AI** that reduces manual job tracking by detecting applications from Gmail, mobile share text, and screenshots/OCR, then organizing them in a polished Kanban workflow.

## Architecture
- **Mobile frontend:** Expo SDK 54, React Native, Expo Router entry, reusable mobile components, local notifications, image picker, AsyncStorage token persistence.
- **Backend:** FastAPI, MongoDB via Motor, JWT bearer auth, Pydantic response models, Gmail OAuth hooks, Grok-compatible parsing endpoint with secure server-side key usage.
- **Database:** MongoDB collections for users, applications, detections, Gmail tokens, OAuth states, and user sessions. Custom UUID-style IDs are exposed; Mongo `_id` is excluded from API responses.
- **Integrations:** Email/password auth implemented. Emergent Google session exchange endpoint implemented. Gmail OAuth and Grok parsing are config-gated until real credentials are added.

## User Personas
- **Active job seeker:** Tracks many applications and needs a clear pipeline with reminders.
- **Career switcher:** Uses multiple resume versions and wants analytics on what works.
- **Privacy-conscious professional:** Wants detection from allowed sources only, with confirmation before saving.

## Core Requirements
- Authentication: email/password and Google social login.
- Kanban board: Applied, Screening, Interview, Offer, Rejected.
- Application form: company, role, job link, status, applied date, notes, resume version, follow-up date.
- Smart detection: confirm Add/Edit/Ignore from email/share/screenshot parsing.
- Gmail OAuth: connect, fetch matching emails, parse application confirmations.
- Screenshot flow: select screenshot, capture OCR text/pasted text, parse with AI/fallback.
- Reminders: schedule local follow-up notifications.
- Analytics: status totals, offer success rate, resume version usage, upcoming follow-ups.

## Implemented — 2026-04-27
- Built FastAPI + MongoDB backend with secure auth, application CRUD, status moves, analytics, reminders, detections, Gmail config/connect/sync endpoints, and Grok-compatible parsing with rule fallback when no key exists.
- Built premium mobile UI: auth screen, Kanban board, add application bottom sheet, smart detection screen/bottom sheet, analytics dashboard, and profile/Gmail settings.
- Added Expo permissions for screenshots and notifications, Android share/deep-link intent filters, and base64 in-app SVG visual assets.
- Added `/app/auth_testing.md` and maintained `/app/memory/test_credentials.md` for test handoff.
- Backend regression tests pass: `8 passed` via `/app/backend/tests/test_jobtrackr_api.py`.
- Local mobile web E2E passed for signup, add application, Kanban rendering, and detection popup using a local API proxy.

## Implemented — 2026-04-27 Update
- Added Gmail OAuth credentials to backend config; `/api/gmail/config` now reports Gmail OAuth as configured and returns the callback URI.
- Added Grok key to backend config and hardened parsing fallback behavior. Current xAI response rejects the provided key as incorrect, so Grok calls fall back safely to the rule parser.
- Redesigned app as dark-first premium UI with glowing blue primary buttons, dark glass cards, dark sheets/modals, and dark analytics/profile screens.
- Added 3-slide animated onboarding carousel with base64 artwork, floating icon/heading effects, feature explanations, dots, and entry CTA.
- Fixed Smart Detection popup layout so Add/Edit/Ignore actions remain visible and tappable on 390x844 mobile viewport.
- Added frontend API base fallback support for both `EXPO_PUBLIC_BACKEND_URL` and `EXPO_BACKEND_URL`.

## Implemented — 2026-04-27 UI Reference Update
- Matched uploaded mobile UI reference with a dark pipeline dashboard: horizontal status summary cards, glowing add button, add-action popover, vertical application list rows, status pill, move chips, and AI auto-import card.
- Added stronger onboarding floating text effects: large ambient background labels plus word-by-word animated headline reveal/breathing motion.
- Converted the add menu to a modal overlay so action taps do not pass through to underlying cards.
- Verified public-preview QA: onboarding, auth transition, pipeline dashboard, add menu, manual save, application row rendering, detection navigation, and backend regressions all passed.

## Implemented — 2026-04-27 Streak/Grok Update
- Updated backend Grok API key from the newly supplied value. xAI still rejects the key as invalid, so detection continues to use fallback parsing safely.
- Added animated pipeline streak effect on the destination status card when a job is moved between stages.
- Verified stage movement UI: moving a job to Interview updates counts, switches the selected section, and shows the colored streak animation on the Interview status card.

## Implemented — 2026-04-27 Grok Key Retest
- Updated backend Grok API key from the latest supplied value and retested detection parsing.
- xAI still rejects the key as invalid, so detection continues to use fallback parsing safely.

## Current Known Constraints
- Public Expo preview is currently unavailable due supervisor/ngrok tunnel startup failures; local UI and backend tests pass.
- Gmail sync requires real `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `/app/backend/.env`.
- Grok extraction requires a valid `GROK_API_KEY`; the latest supplied key is still rejected by xAI as invalid, so the app uses a privacy-safe rule parser and clearly reports that state.
- Full native iOS share extension support may require a native extension; Android share intent and deep link capture are configured.

## Prioritized Backlog
### P0
- Restore public Expo preview tunnel availability and rerun full public UI E2E.
- Add real Gmail OAuth credentials and validate the end-to-end Gmail detection flow.
- Add real Grok key and validate JSON extraction quality for messy emails and OCR text.

### P1
- Add edit/delete UI for existing application cards.
- Improve drag-and-drop gestures with a dedicated native drag interaction.
- Add secure token encryption with SecureStore for native builds.
- Add push notification token registration for server-triggered reminders.

### P2
- Add advanced analytics trends over time.
- Add resume-version recommendations based on interview/offer rates.
- Add Chrome extension as a future companion capture source.

## Next Tasks
1. Provide Gmail OAuth credentials and add the reported redirect URI to Google Cloud Console.
2. Provide Grok API key to enable AI parsing beyond fallback extraction.
3. Re-run public preview UI tests once the Expo tunnel is reachable.