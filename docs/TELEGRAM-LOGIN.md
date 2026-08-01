# Telegram Login / Sign-up (with phone)

This site supports **Sign in with Telegram**, including a request for the user’s **verified phone number** (user must approve).

> Browser automation could not complete the click-through on [hadafak-ehab.com](https://hadafak-ehab.com) from this environment. The integration follows Telegram’s official Login / OIDC docs (same pattern modern course sites use).

## What the student sees

1. Open **Login** or **Register**
2. Tap **الدخول / التسجيل عبر تيليجرام**
3. Telegram opens → confirm identity
4. Approve sharing **phone number** (when `TELEGRAM_CLIENT_ID` is set)
5. Account is created (or linked) on your backend
6. If the account is not activated yet → “contact admin” (same as normal signup)

## BotFather setup (required)

1. Open [@BotFather](https://t.me/BotFather) → create a bot (or pick an existing one).
2. Set a clear name + logo (students see this on the consent screen).
3. Open **BotFather mini app** → **Bot Settings → Web Login**:
   - Add allowed URLs for your **frontend** (e.g. `https://your-app.vercel.app`)
   - Add callback / origin URLs as Telegram shows
   - Copy **Client ID** (and Client Secret if shown)
4. Also send `/setdomain` to BotFather and set your production domain (classic widget).
5. Put secrets on **Render** (backend) — never in the frontend repo:

```env
TELEGRAM_BOT_TOKEN=123456:AA...
TELEGRAM_BOT_USERNAME=YourBotUsername
TELEGRAM_CLIENT_ID=123456789
TELEGRAM_CLIENT_SECRET=...   # optional for widget/id_token path; keep for full OIDC
```

6. Redeploy backend so migration `0023_user_telegram_fields` runs.
7. Hard-refresh the site. The Telegram button appears when `TELEGRAM_CLIENT_ID` or bot token is configured.

## Phone number permission

| Mode | Env | Phone |
|------|-----|--------|
| **OIDC Login library** (`Telegram.Login.auth` + `scope: profile, phone`) | `TELEGRAM_CLIENT_ID` | Yes, if user consents |
| Classic widget only | `TELEGRAM_BOT_TOKEN` + `TELEGRAM_BOT_USERNAME` | **No** (Telegram does not send phone) |

Use **Web Login / Client ID** if you need phone numbers in Admin Users.

## API

- `GET /api/auth/telegram/config/` — public flags + `client_id` / bot username  
- `POST /api/auth/telegram/` — body `{ "id_token": "..." }` or classic widget fields  

Verified users are stored with `telegram_id`, `telegram_username`, and `phone` when provided.

## Troubleshooting

- Button missing → backend env not set / deploy not finished  
- “bot domain invalid” → domain not linked in BotFather Web Login / `/setdomain`  
- Popup closes with no result → avoid `Cross-Origin-Opener-Policy: same-origin` (use `same-origin-allow-popups` if needed)  
- No phone saved → user denied phone scope, or only classic widget is configured  
