# The Ledger — To-Do App

Full stack: **React** (Vite) frontend, **Flask** REST API backend, **PostgreSQL** database.

```
todo-app/
├── backend/            Flask API
├── frontend/            React app (Vite)
└── docker-compose.yml   Optional: spins up just Postgres
```

## 1. Database

**Option A — Docker (easiest):**
```bash
docker compose up -d
```
Starts Postgres on `localhost:5432` with user `ledger_user`, password `ledger_pass`, database `ledger_db` (matches the backend's default config).

**Option B — Local Postgres install:**
```bash
createuser ledger_user -P        # set password to ledger_pass, or your own
createdb ledger_db -O ledger_user
```

## 2. Backend (Flask API)

```bash
cd backend
python -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env              # edit values if you used different credentials

python init_db.py                 # creates tables (see "Schema changes" below re: Flask-Migrate)
python app.py                     # runs on http://localhost:5000
```

Alternatively, run `schema.sql` directly against your database instead of `init_db.py`:
```bash
psql -U ledger_user -d ledger_db -f schema.sql
```

Verify it's running: `curl http://localhost:5000/api/health` → `{"status": "ok"}`

## 3. Frontend (React)

```bash
cd frontend
npm install
cp .env.example .env              # only needed if your API isn't on localhost:5000
npm run dev                       # runs on http://localhost:5173
```

Open `http://localhost:5173`.

## Accounts & login

Each task belongs to the account that created it.

- Passwords are hashed with Werkzeug (`generate_password_hash`) — never stored in plain text.
- Auth uses a JWT **access token** (short-lived, 1 hour by default) plus a **refresh token** (30 days). The frontend stores both in `localStorage`; when an API call gets a 401 because the access token expired, it silently uses the refresh token to get a new one and retries — you only get logged out once the refresh token itself expires or is invalid.
- **Set a real `JWT_SECRET_KEY`** in `backend/.env` before deploying anywhere — the default in `.env.example` is only for local dev.

### Email verification & password reset

New accounts get a verification link; a banner appears in the app until you click it (or hit "Resend link"). Forgot-password works the same way — "Forgot password?" on the sign-in screen sends a reset link.

**No email provider is wired up.** `backend/email_utils.py` just prints the email to the console/log — that's enough to develop and test the whole flow locally. Two ways to get the actual link during development:
1. Watch the Flask process's console output, or
2. With `EXPOSE_AUTH_LINKS_IN_RESPONSE=true` (the default in `.env.example`), the register / resend-verification / request-password-reset API responses also include the link directly (`dev_verify_link` / `dev_reset_link`), and the frontend displays it inline.

Before deploying for real: **set `EXPOSE_AUTH_LINKS_IN_RESPONSE=false`**, and implement `send_email()` in `backend/email_utils.py` using a real provider (Flask-Mail/SMTP, SendGrid, AWS SES, Postmark, Mailgun — the file has notes on each). Also set `FRONTEND_URL` to your deployed frontend's URL so the links in emails point somewhere real.

The frontend routes `/verify-email?token=...` and `/reset-password?token=...` are plain client-side routes (no react-router — just a `pathname` check in `App.jsx`). Vite's dev server serves `index.html` for any path automatically. **If you deploy the built frontend as a static site, configure your host for SPA fallback** (serve `index.html` for unknown paths), or those two links will 404. Netlify/Vercel do this by default for Vite projects; other static hosts may need a `_redirects` or rewrite rule.

## Schema changes / Flask-Migrate

`Flask-Migrate` is wired into `backend/app.py` (`Migrate(app, db)`), but the `migrations/` folder itself isn't included — generate it once in your own environment (it's tied to your installed Alembic/Flask-Migrate version):

```bash
cd backend
flask --app app db init        # once, creates migrations/
flask --app app db migrate -m "initial schema"
flask --app app db upgrade
```

From then on, whenever you change `models.py`, run `flask --app app db migrate -m "..."` then `db upgrade` instead of re-running `init_db.py`. (`init_db.py` and `schema.sql` are still there as a zero-migration quick-start for local dev.)

## Tasks: due dates, tags, drag-to-reorder

- **Due dates** — optional, shown as a badge on each task; overdue open tasks are flagged in rust/red.
- **Tags** — optional, comma-separated in the form (`work, urgent`), shown as small chips. Max 10 tags per task, 50 characters each.
- **Reordering** — drag the ⠿ handle to reorder tasks. This only works while the "All" filter tab is active (custom order applies across your whole list, so reordering a filtered subset would be ambiguous). Order is persisted via `PATCH /api/tasks/reorder` and survives reloads.
- Both the due-date/tags fields in the entry form are tucked behind a "+ due date / tags" toggle to keep quick-adds fast.

## API reference

| Method | Route                          | Auth | Body                                          | Description |
|--------|----------------------------------|------|-------------------------------------------------|--------------|
| POST   | `/api/auth/register`             | —    | `{ email, password }`                            | Create an account, returns tokens |
| POST   | `/api/auth/login`                | —    | `{ email, password }`                            | Log in, returns tokens |
| POST   | `/api/auth/refresh`              | refresh token | —                                       | Exchange a refresh token for a new access token |
| GET    | `/api/auth/me`                   | ✓    | —                                                 | Current user info |
| POST   | `/api/auth/resend-verification`  | ✓    | —                                                 | Resend the verification email |
| POST   | `/api/auth/verify-email`         | —    | `{ token }`                                      | Confirm email verification |
| POST   | `/api/auth/request-password-reset` | —  | `{ email }`                                      | Send a reset link (always 200, doesn't reveal if email exists) |
| POST   | `/api/auth/reset-password`       | —    | `{ token, password }`                            | Set a new password |
| GET    | `/api/tasks`                     | ✓    | —                                                 | List your tasks (`?status=all\|active\|done`) |
| POST   | `/api/tasks`                     | ✓    | `{ text, priority, due_date?, tags? }`            | Create a task |
| PATCH  | `/api/tasks/<id>`                | ✓    | any of `{ text, priority, done, due_date, tags }` | Update a task |
| PATCH  | `/api/tasks/reorder`             | ✓    | `{ order: [id, id, ...] }`                       | Set custom task order |
| DELETE | `/api/tasks/<id>`                | ✓    | —                                                 | Delete a task |

`priority` is `low`/`medium`/`high`. `due_date` is `YYYY-MM-DD` or `null`. `tags` is an array of strings (max 10, 50 chars each). Routes marked ✓ require `Authorization: Bearer <access_token>`; the refresh route requires `Authorization: Bearer <refresh_token>` instead.

## Deploying

- **Backend:** any host that runs Python (Render, Railway, Fly.io, a VPS with gunicorn). Set `DATABASE_URL`, `CORS_ORIGINS`, `JWT_SECRET_KEY`, `FRONTEND_URL`, and `EXPOSE_AUTH_LINKS_IN_RESPONSE=false` as environment variables. Run with `gunicorn app:app`, not the Flask dev server. Run migrations (`flask db upgrade`) as part of your deploy step.
- **Frontend:** `npm run build` produces a static `dist/` folder — deploy to Vercel, Netlify, or any static host with SPA fallback enabled (see the email-verification section above). Set `VITE_API_URL` before building.
- **Database:** any managed Postgres (Supabase, Neon, RDS, Railway).

## Still worth adding

- Real email sending (see `email_utils.py`)
- Rate limiting on auth endpoints (login, register, password reset)
- Refresh-token revocation/rotation (a logout currently just discards local tokens — the refresh token stays technically valid until it expires)
