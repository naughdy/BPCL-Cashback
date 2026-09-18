# Hosting & SMS Setup Guide

This covers the parts that need your own accounts, payment method, and
business details — an AI can't sign up for these on your behalf, but
everything on the *code* side is already done (see the config files this
guide references).

---
## Part A — Database (Neon, free, doesn't expire)

1. Go to **neon.tech**, sign up (GitHub login is fastest).
2. Create a new project — name it `bpcl-cashback`, pick a region close to
   India (ap-southeast-1 / Singapore is typically closest).
3. Neon gives you a connection string immediately, looks like:
   ```
   postgresql://neondb_owner:AbC123@ep-something-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   ```
   Copy this — you'll paste it as `DATABASE_URL` in Part B.
4. Neon's free tier: 0.5 GB storage, autosuspends when idle (wakes up
   automatically on the next query, ~1 second delay) — genuinely free,
   no expiry, no credit card required.

---
## Part B — Backend (Render, free to start)

1. Push this repo to a GitHub repository (if you haven't already).
2. Go to **render.com**, sign up, connect your GitHub account.
3. Dashboard → **New** → **Blueprint** → select your repo. Render reads
   `render.yaml` (already in the repo root) and shows you the service it's
   about to create.
4. Render will ask you to fill in a few values it deliberately left blank:
   - `DATABASE_URL` → paste the Neon connection string from Part A
   - `CORS_ORIGIN` → leave blank for now, come back and set it after
     Part C (needs your admin-web URL)
   - `JWT_SECRET` is auto-generated for you, no action needed
5. Click **Apply**. First deploy takes a few minutes (building the Docker
   image, running migrations).
6. Once live, note your backend URL — something like
   `https://bpcl-cashback-backend.onrender.com`.
7. **Seed the database** (one-time): Render dashboard → your service →
   **Shell** tab → run:
   ```bash
   npm run seed
   ```
   (This gives you the dev admin login — change that password immediately
   in a real deployment; the seed script is meant for first setup only.)

**Cold starts**: on Render's free plan, the backend spins down after 15
minutes idle and takes ~30–60s to wake on the next request — noticeable
the first time someone opens the app after a gap. If that's a problem for
real operator use, upgrade the one service to the $7/mo "Starter" plan
(edit `plan: free` → `plan: starter` in `render.yaml`, or change it in the
dashboard) — everything else about the setup stays identical.

---
## Part C — Admin web (Cloudflare Pages, free)

1. Go to **dash.cloudflare.com**, sign up (no credit card needed for
   Pages).
2. **Workers & Pages** → **Create** → **Pages** → **Connect to Git** →
   select your repo.
3. Build settings:
   - **Root directory**: `admin-web`
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
4. Add one environment variable: `VITE_API_BASE_URL` = your Render backend
   URL from Part B, with `/api` on the end, e.g.
   `https://bpcl-cashback-backend.onrender.com/api`
5. Deploy. Cloudflare gives you a URL like
   `https://bpcl-cashback.pages.dev` (you can attach a custom domain later,
   free, under the same project).
6. **Go back to Render** (Part B) and set `CORS_ORIGIN` to this exact
   Cloudflare Pages URL, so the backend accepts requests from it.

The `admin-web/public/_redirects` file already in the repo handles
client-side routing (so refreshing `/customers/abc123` doesn't 404) —
nothing to configure there.

---
## Part D — Mobile app's backend URL

Once Part B is live, update `mobile/src/config.ts`:
```ts
export const API_BASE_URL = 'https://bpcl-cashback-backend.onrender.com/api';
```
Rebuild the app. (For real distribution to fuel-station devices, you'd
eventually want this to come from a build-time env var per environment —
see the comment already in that file — but a hardcoded production URL is
fine to start.)

---
## Part E — Real SMS OTP (MSG91)

The code already supports this — `OTP_PROVIDER=MSG91` switches from the
mock (console-log) delivery to real SMS via `backend/src/services/otp/transports/msg91Transport.ts`.
What you need to do:

1. **Sign up** at **msg91.com**.
2. **DLT registration** (mandatory in India for any transactional SMS):
   - MSG91's dashboard has a guided DLT registration flow under
     **DLT** in the sidebar.
   - You'll need: business PAN, GST number (or a declaration if
     unregistered), and an authorized signatory's Aadhaar-linked mobile
     for OTP verification during registration.
   - Register a **Sender ID** (6 letters, e.g. `BPCLCB`) — this is what
     shows as the sender on the customer's phone.
   - Register a **template** for the OTP message, e.g.:
     > Your OTP for BPCL Cashback is {#var#}. Valid for 5 minutes. Do not
     > share this code with anyone.
     Approval usually takes a few hours to 1–2 days.
3. Once approved, in MSG91's dashboard:
   - Go to **Flow** (sometimes called "Campaigns" in newer UI) and create
     a Flow using your approved template — note the **Flow (Template) ID**.
   - Go to **Settings → API** and copy your **Auth Key**.
4. Back in Render (Part B), add these environment variables to your
   backend service:
   ```
   OTP_PROVIDER=MSG91
   MSG91_AUTH_KEY=<your auth key>
   MSG91_TEMPLATE_ID=<your flow/template ID>
   MSG91_SENDER_ID=<your 6-char sender ID>
   ```
5. Redeploy (Render redeploys automatically when you save new env vars).

**Cost**: MSG91 transactional SMS in India is typically ~₹0.15–0.20 per
SMS, pay-as-you-go, no fixed monthly fee — top up their wallet with
whatever amount you expect to use. Verify current rates in their pricing
page before budgeting, since these change.

---
## Part F — WhatsApp (optional, notification step only)

Your flow already has WhatsApp behind a swappable interface
(`backend/src/services/whatsapp/whatsapp.service.ts`, currently
`MockWhatsAppService`). This one is more involved to set up for real
(Meta Business verification, template approval) and isn't required for
the app to function — the redemption flow works end-to-end with the mock.
Do this once you're past initial testing:

1. Create a **Meta Business Account** at business.facebook.com.
2. In **Meta for Developers** (developers.facebook.com), create an app,
   add the **WhatsApp** product.
3. Get a dedicated phone number onto WhatsApp Business (can't be a number
   already active on regular WhatsApp).
4. Submit your business for verification (can take days).
5. Submit a message template for approval (category: Utility) — e.g. a
   redemption confirmation notification.
6. Once approved, implement a real `IWhatsAppService` the same way MSG91
   was implemented for OTP: a new file under `backend/src/services/whatsapp/`
   that calls Meta's Cloud API (`graph.facebook.com/v.../messages`)
   instead of the mock, swapped in via an env-driven factory exactly like
   `backend/src/services/otp/index.ts`. Ask for this when you're ready —
   it's the same pattern already built for OTP.

---
## Quick reference — monthly cost at this configuration

| Piece | Provider | Cost |
|---|---|---|
| Postgres | Neon | $0 |
| Backend API | Render (free plan) | $0 (or $7/mo to remove cold starts) |
| Admin web | Cloudflare Pages | $0 |
| SMS OTP | MSG91 | Pay-per-SMS, no fixed fee (~₹0.15–0.20/SMS) |
| WhatsApp | Meta direct | Free allowance, then per-conversation (optional, not required to launch) |

Everything above was verified against each provider's current published
terms as of this setup — always double-check the provider's own pricing
page before committing, since free-tier terms change without much notice.
