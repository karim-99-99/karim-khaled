# Why the Site Feels Slow Between Pages — and How to Make It Faster

## Is it because of Neon?

**No.** Using **Neon** as the database (instead of Render PostgreSQL) is not the cause of slowness. Neon is fast; the slowdown comes from **Render’s free tier**, not from the database.

---

## Main cause: Render free tier cold start

On the **free plan**, Render **stops (sleeps)** your backend after about **15 minutes** of no requests. When someone visits the site or moves to a page that calls the API:

1. The **first request** goes to Render.
2. Render **wakes the service** (cold start).
3. That first request can take **30–60+ seconds**.
4. After that, requests are fast until the service sleeps again.

So when you “move from one page to another”, the first page that needs the backend (e.g. courses, admin, login) triggers that cold start and the site feels very slow. Later navigations are fast until the backend sleeps again.

---

## What we did in the project

1. **Health endpoint**  
   Backend exposes `GET /api/health/` (no auth, no DB). Use it for keep-alive pings.

2. **Frontend wakes backend on load**  
   When the app loads and `VITE_API_URL` is set, the frontend pings `/api/health/` in the background. That way the backend starts waking as soon as the user opens the site, so by the time they navigate, it may already be up.

3. **Lazy-loaded routes**  
   Pages are loaded on demand (React.lazy), so navigation doesn’t wait for every page to load at once.

---

## Best fix: keep the backend warm with a cron job

So that the backend **doesn’t sleep** (or sleeps less often), ping it regularly from outside:

1. Use a **free cron / uptime** service, for example:
   - [cron-job.org](https://cron-job.org)
   - [UptimeRobot](https://uptimerobot.com)

2. Set a request every **10–14 minutes** to your backend **health** URL, for example:
   ```text
   https://YOUR-RENDER-SERVICE.onrender.com/api/health/
   ```
   Replace `YOUR-RENDER-SERVICE` with your real Render backend URL.

3. Result: Render gets a request often enough that it stays (or often stays) awake, so the **first** request from a user is much faster.

---

## Other tips

- **Region:** If you use Neon, create the Neon project in the **same region** as your Render service (e.g. Frankfurt) to keep database latency low. See `CONNECT-BACKEND-TO-NEON.md`.
- **Paid plan:** On a paid Render plan, the service doesn’t sleep, so cold starts go away.

---

## Summary

| Cause              | Effect                         | What to do                          |
|--------------------|--------------------------------|-------------------------------------|
| Render cold start  | First request 30–60+ s slow    | Cron ping `/api/health/` every ~14 min |
| Neon               | Not the cause of slowness     | Optional: same region as Render     |
| Frontend           | Already pings health on load  | No change needed                    |

So: **the site is slow mainly because Render puts the backend to sleep; keeping it warm with a cron job to `/api/health/` makes the site feel much faster between pages.**
