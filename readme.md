# Content-Engine – Developer Handbook
*(Next.js 14 API + Supabase + Vercel Cron)*

This service fetches trending articles once per **broad field**, maps them to user-specific suggestions, and lets creators promote chosen items into their personal **knowledge library**.

---

## 🔗 Stack
| Layer | Tech |
|-------|------|
| Runtime | Next.js 14 route handlers on Vercel |
| DB/Auth | Supabase (Postgres + RLS) |
| Cron | Vercel Cron (serverless) |
| External | NewsAPI (replace / extend as needed) |

---

## 1 · Scheduled Cron Routes

| Path | Schedule | Purpose | Success JSON |
|------|----------|---------|--------------|
| `/api/fetch-trending` | `0 * * * *` (hourly) | • For **each unique `broad_field`** in `profiles` <br/>• Pull fresh articles from NewsAPI (`from=lastFetched`) <br/>• `upsert` rows into `trending_articles_cache` | `{saved,n,skipped}` |
| `/api/map-cache-to-users` | `5 * * * *` (hourly) | • For every user <br/>• Filter cached articles that match their `niche / sub_niche / keywords` <br/>• Insert into `article_suggestions` (`unique (user_id,article_url)`) | `{suggested,n,skipped}` |
| `/api/purge-cache` | `0 2 * * *` (daily 02:00 UTC) | • Delete `trending_articles_cache` older than 24 h <br/>• Delete `article_suggestions` older than 48 h | `{purged_cache, purged_suggestions}` |

All cron routes use a **service-role** Supabase key (bypass RLS).

---

## 2 · User-Triggered API Routes

| Method & Path | Auth | Action |
|---------------|------|--------|
| `POST /api/accept-suggestion?id=UUID` | `auth.uid()` | → Copy selected suggestion to `knowledge_library` then delete suggestion. |
| `DELETE /api/decline-suggestion?id=UUID` | `auth.uid()` | → Remove suggestion row (user declines). |

Both use the **anon** Supabase key and rely on RLS (`user_id = auth.uid()`).

---

## 3 · Optional Supabase Edge Functions

| Edge Function | Trigger | What to move out of Vercel |
|---------------|---------|----------------------------|
| `clean_cache` | Daily | Purge old cache/suggestion rows inside Supabase (less egress). |
| `match_cache_to_user` | Hourly | Run the heavy per-user loop in-DB for speed. |
| `auto_publish` | Every 10-15 min | Post `posts.status='scheduled'` to LinkedIn/X using stored OAuth and mark `published`. |

(Deno runtime, same logic as API handlers.)

---

## 4 · Table Reference (simplified)

| Table | Key Fields | Notes |
|-------|------------|-------|
| `profiles` | `id (auth.users.id)` | Stores niche, keywords, tone. |
| `trending_articles_cache` | `(broad_field, article_url)` unique | Hour-hour shared cache. |
| `article_suggestions` | `(user_id, article_url)` unique | User must “Add” or “Dismiss”. |
| `knowledge_library` | `(user_id, article_url)` unique | Accepted articles only. |
| `posts` | status enum | Draft → scheduled → published. |
| `platform_connections` | `(user_id, platform)` | OAuth tokens for auto-posting. |

---

## 5 · Error & Quota Handling

* **NewsAPI free plan:** 100 req/day → keep `broad_field` count small or upgrade.  
* Use `onConflict` UPSERT to silence duplicate-key errors.  
* Log to Sentry/Logtail inside each cron route.  
* Exponential back-off if external API returns 429 / 5xx.

---

## 6 · Local Dev

```bash
# clone repo
pnpm install
# run Next.js API locally
pnpm dev

# invoke cron routes manually
curl http://localhost:3000/api/fetch-trending