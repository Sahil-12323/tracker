# JobTrackr AI Auth Testing Playbook

1. Register a test user via `POST /api/auth/register` with email, name, and an 8+ character password.
2. Use the returned bearer token for protected calls such as `/api/auth/me`, `/api/applications`, `/api/detections/parse`, and `/api/analytics`.
3. Google social login is handled by the backend endpoint `/api/auth/google/session`, which exchanges an Emergent OAuth `session_id` server-side.
4. Gmail OAuth is separate from sign-in and requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `/app/backend/.env`; use `/api/gmail/config` to read the exact redirect URI.
5. All MongoDB reads must exclude `_id`; API responses should expose custom `user_id`, `app_*`, and `det_*` IDs only.