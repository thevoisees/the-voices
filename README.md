# The Voices

Anonymous place-based incident map for South Africa. Anonymous map pins stay **nameless**. The **Missing persons** board (map photo strip) is the only place that may show a name and photo — to help find someone.

## Live links

- **App (phone-friendly):** https://thevoisees.github.io/the-voices/
- **Code:** https://github.com/thevoisees/the-voices

Opens with a black-and-white intro. Press **Say something** to enter the map.

Seed data is only the publicly reported **Kempton Park / Ekurhuleni** dump-site points (no victim names, no demo incidents).

## Quick start

```bash
npm install
npm run dev
```

Without Supabase, new reports stay in **this browser**. Seeds still show the Kempton Park case pins.

## Live sharing (Supabase) — required for everyone to see new reports & photos

Right now the live site is **local-only** until keys are set. Do this once:

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** → paste the full contents of [`supabase/schema.sql`](supabase/schema.sql) → **Run** (tables + `missing-photos` bucket).
3. **Project Settings → API** → copy **Project URL** and **anon public** key.
4. From this repo:

```bash
node scripts/configure-supabase.mjs "https://YOURPROJECT.supabase.co" "YOUR_ANON_KEY"
```

That writes `.env` (local) and GitHub secrets (Pages). Then push any commit so Actions rebuilds:

```bash
git commit --allow-empty -m "chore: rebuild Pages with Supabase" && git push
```

5. Open the app → **About**. You should see a green **Supabase is connected** banner.

## How missing photos are seen

| Mode | What happens |
|------|----------------|
| **Supabase on** | Upload → photo goes to public Storage → **every phone** sees the face on the map strip and in the list within seconds. |
| **Supabase off** | Photo stays on **that phone only** until you **Download files for GitHub** and commit into `public/missing/photos/` + `people.json`, then Pages deploys. |

Map strip = faces still missing. Tap a face → full name, last seen, description, found votes.

## Missing persons archive on GitHub (optional)

```bash
node scripts/add-missing-person.mjs ~/Downloads/{id}.json ~/Downloads/{id}.jpg
git add public/missing && git commit -m "Add missing person photo" && git push
```

**Found (alive / deceased):** ten separate device confirmations for the same outcome flip the status. With Supabase, votes sync across phones.

## Quick start

```bash
npm install
npm run dev
```

Without Supabase, new reports stay in **this browser**. Seeds still show the Kempton Park case pins.

## Hard rules

- No names, surnames, nicknames, faces, plates, schools, workplaces on **anonymous** map reports
- Missing board: name + photo only to help find someone — not to name alleged perpetrators
- No apology videos / “confirm this perpetrator”
- Child-related public posts: count only + Childline 116 / FCS
- Possible remains: call 10111 first; map shows area + time only
