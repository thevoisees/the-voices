# The Voices

Anonymous place-based incident map for South Africa. **No names.** Places, times, categories, and patterns.

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

## Live shared pins (Supabase)

1. Create a free [Supabase](https://supabase.com) project.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL Editor.
3. Copy `.env.example` → `.env` and set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.
4. Restart `npm run dev`.

## Hard rules

- No names, surnames, nicknames, faces, plates, schools, workplaces
- No apology videos / “confirm this person”
- Child-related public posts: count only + Childline 116 / FCS
- Possible remains: call 10111 first; map shows area + time only
