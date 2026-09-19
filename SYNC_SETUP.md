# Connecting shared sync (Supabase)

By default this app stores everything in the browser it's opened in — each
device has its own separate data. Following these steps turns that into one
shared workspace: your dashboard, a shop attendant's phone, whatever device
opens the app URL — all see and edit the same live data.

This takes about 5 minutes and Supabase's free tier is enough for this app.

## 1. Create a Supabase project

1. Go to https://supabase.com and sign up (free).
2. Click **New project**. Pick any name/region/password (the password is
   for the database itself — you won't need it day-to-day).
3. Wait ~1 minute for the project to finish provisioning.

## 2. Run the schema

1. In your new project, open **SQL Editor** (left sidebar) → **New query**.
2. Open `supabase/schema.sql` from this project, copy its full contents,
   paste into the SQL editor, and click **Run**.
3. You should see "Success. No rows returned."

## 3. Get your connection details

1. Go to **Project Settings** (gear icon) → **API**.
2. Copy the **Project URL** (looks like `https://xxxxx.supabase.co`).
3. Copy the **anon / public** key (a long string starting with `eyJ...`).

## 4. Add them to your deployment

**On Netlify:**
1. Site settings → **Environment variables** → **Add a variable**.
2. Add `VITE_SUPABASE_URL` with the Project URL.
3. Add `VITE_SUPABASE_ANON_KEY` with the anon key.
4. Redeploy the site (Deploys → Trigger deploy) so the build picks them up.

**For local development:**
1. Copy `.env.example` to `.env` in the project root.
2. Fill in the same two values.
3. Restart `npm run dev`.

## 5. Create your first account

Open the app — you should now see a **Sign In / Create Account** screen
(this only appears once Supabase is connected; skip this step if you
haven't done steps 1–4 yet).

1. Click **Create Account**, fill in your name, email, and a password
   (6+ characters), and submit.
2. If your Supabase project has email confirmation turned on (it is by
   default), you'll be told to check your email before you can log in —
   click the confirmation link, then come back and sign in.
3. To add a second person (e.g. a shop attendant), either have them use
   **Create Account** themselves, or — safer — turn off public sign-ups
   once your team is set up: in Supabase, **Authentication → Sign In /
   Providers → Email → turn off "Allow new users to sign up"**, then add
   people yourself via **Authentication → Users → Invite user**.
4. The very first person to ever sign in becomes the **Owner** automatically.
   Everyone after that becomes **Staff** and needs to be approved before
   they can get in — go to **Settings → Team** as the owner to approve them
   and set their role. Staff can record sales, view stock levels, restock
   items, and record debtor payments, but can't see cost prices or profit
   figures, can't delete records, and can't reach Settings, Expenses,
   Reports, or the Activity Log.

## 6. Confirm it worked

Once logged in, go to **Settings**. You should see a green **"Synced
across devices"** card instead of the amber **"Working locally only"** one.
The sidebar also shows a small green "Synced" dot under the business name,
and "Signed in as [your name]" with a Log Out button at the bottom.

Open the same URL on a second device, log in with the same account (or a
second account you created) — changes made on one should appear on the
other within a second or two, no refresh needed.

## Notes on how this works

- All data lives in one table (`workspace_data`) as a handful of rows —
  one per data type (inventory, sales, notes, expenses, restock history,
  customers, team, activity log, settings). Each row holds the whole list
  as JSON, matching how the app already worked with local storage — this
  just moves where the last-saved copy lives.
- Accounts are handled by Supabase's own auth system — logging in is
  required before the app will read or write any data at all (enforced by
  the database itself, not just the app's UI). Everyone who logs in shares
  the *same* data — there's no per-user split, just a login gate plus roles.
- If you set this up earlier and already ran an older version of
  `schema.sql` (before accounts existed), re-run the current version — it's
  safe to run again, and it replaces the old "anyone can access" policy
  with one that requires being logged in.
- **Roles are a UI convenience, not a database security boundary.** Any
  logged-in user — owner or staff — can technically read/write anything by
  calling Supabase's API directly instead of using the app. What roles
  actually do is keep the interface honest people see scoped to their job
  (a shop attendant isn't shown margins, can't delete sales, can't reach
  Settings) — see the note at the bottom of `schema.sql` for the full
  explanation. If that stops being good enough, the next step would be
  moving role checks into the database policy itself.
- When two devices save around the same moment, changes are merged
  record-by-record rather than one save wiping out the other's — see the
  comment above `mergeThreeWay` in `src/lib/storage.ts` for exactly what
  this does and doesn't handle (it correctly keeps both sides' additions
  and respects real deletions, but if the *same* record is edited
  differently by two people at once, one edit wins rather than both being
  combined).
- If the two env vars aren't set, none of this activates — no login
  screen, no Supabase calls — and the app behaves exactly as before (local
  browser storage only, open access). Nothing breaks if you skip this
  setup.

