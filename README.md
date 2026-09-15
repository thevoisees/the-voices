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

## Missing persons photos (GitHub)

Photos are meant to live in this repo under `public/missing/photos/`, listed in `public/missing/people.json`.

1. In the app: **Missing → Report missing** → add photo + details.
2. Open the person → **Download files for GitHub** (JSON + JPG).
3. Merge into the repo:

```bash
node scripts/add-missing-person.mjs ~/Downloads/{id}.json ~/Downloads/{id}.jpg
git add public/missing && git commit -m "Add missing person photo" && git push
```

After GitHub Pages deploys, everyone sees the photo on the map strip.

**Found (alive / deceased):** ten separate device confirmations for the same outcome flip the status. With Supabase connected, votes sync across phones; otherwise they stay on-device until published.

## Live shared pins (Supabase)

1. Create a free [Supabase](https://supabase.com) project.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL Editor.
3. Copy `.env.example` → `.env` and set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.
4. Restart `npm run dev`.

## Hard rules

- No names, surnames, nicknames, faces, plates, schools, workplaces on **anonymous** map reports
- Missing board: name + photo only to help find someone — not to name alleged perpetrators
- No apology videos / “confirm this perpetrator”
- Child-related public posts: count only + Childline 116 / FCS
- Possible remains: call 10111 first; map shows area + time only
