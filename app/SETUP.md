# Setting up the shared family space

About 30 minutes, once. Everything here is on free tiers. You'll create:

1. A **Supabase** project. It holds the family plan, handles sign-in, and runs the AI reader.
2. A **Vercel** (or Cloudflare Pages) site. It hosts the app at a web address you open on your phones.

Without these steps the app still works in **local mode**: one device, nothing leaves it.

---

## 1. Create the Supabase project

1. Sign up at https://supabase.com and click **New project**. Pick a region near you and save the database password in your password manager.
2. Open **Project Settings → API Keys** and note:
   - the **Project URL** (`https://abcd1234.supabase.co`)
   - the **anon** or **publishable** key. It's safe to put in the browser; row-level security protects the data.
   - Do **not** copy the `service_role` / secret key anywhere. The server function gets it automatically.

## 2. Create the database tables and security rules

On your computer, from the repo:

```bash
cd app
npx supabase login
npx supabase link --project-ref abcd1234      # the part before .supabase.co
npx supabase db push                           # applies supabase/migrations/*
```

This creates the tables, turns on row-level security, and adds the invite functions.
To check the security rules yourself (needs local Postgres, no Docker): `supabase/tests/run-local.sh`.

## 3. Turn on email sign-in

In Supabase, go to **Authentication → URL Configuration**:

- **Site URL:** your app's address from step 5, e.g. `https://family-huddle.vercel.app`
- **Redirect URLs:** add `https://family-huddle.vercel.app/**` and `http://localhost:5173/**`

Email sign-in links are on by default. Supabase's built-in email sender only allows a few emails an hour,
which is plenty for two parents. If you outgrow it, add your own SMTP under **Authentication → Emails**.

*Sign in with Apple* is optional and needs a paid Apple Developer account. Set up the Apple provider in
**Authentication → Providers**, then set `VITE_ENABLE_APPLE_SIGNIN=true`.

## 4. Turn on the AI reader (server side)

1. Create an API key at https://console.anthropic.com. **Set a monthly spend limit** under Billing → Limits.
2. Store it as a secret and deploy the function:

```bash
npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-... ALLOWED_ORIGIN=https://family-huddle.vercel.app
npx supabase functions deploy extract
```

The function only runs for signed-in family members, checks file type and size, and is capped at
40 reads per family per day. Change the cap with `npx supabase secrets set AI_DAILY_LIMIT=60`.

## 5. Put the app online

**Vercel** (simplest):

1. https://vercel.com → **Add New → Project** → import `mac3leven/hello-world`.
2. **Root Directory:** `app` (Vercel detects Vite).
3. **Environment Variables:** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` from step 1.
4. Deploy. `vercel.json` adds the security headers (CSP, HSTS, and so on).

**Cloudflare Pages** works the same way: root `app`, build command `npm run build`, output `dist`, same two variables.
`public/_headers` provides the security headers there.

## 6. On each iPhone

1. Open the site in **Safari** and sign in with your email.
2. Tap **Share → Add to Home Screen**. It opens full-screen like an app and keeps working offline.

## 7. Invite your partner

**Family → Invite your partner → Share invite.** Each code works once and expires after 7 days.
Your partner opens the link, signs in with their own email, taps **Join**, and sees the same plan.

---

## How the security works

| Concern | How it's handled |
| --- | --- |
| Seeing another family's data | Row-level security on every table. Access requires being in the family (`is_family_member`). Covered by `supabase/tests/rls_test.sql`. |
| Joining without permission | Only through `accept_invite`: single-use, 7-day expiry, 64-bit random codes. One family per account. |
| API key exposure | The Anthropic key lives only in Supabase secrets. The browser never sees it. |
| Runaway AI costs | Daily cap per family, enforced on the server before calling Claude. Plus your Anthropic spend limit. |
| Malicious documents | Type and size checks. The model's output is treated as untrusted and re-validated field by field. The prompt tells the model to treat documents as data, not instructions. |
| Signed-out access | `anon` has no table privileges at all. |
| Browser hardening | CSP, HSTS, nosniff, frame-ancestors 'none', and a restricted Permissions-Policy. |
| Secrets in git | `.env*` is git-ignored; `.env.example` holds placeholders only. |

## Local development against your project

```bash
cp .env.example .env.local   # fill in the URL + anon key
npm run dev
```
