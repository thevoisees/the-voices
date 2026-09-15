# The Voices

Anonymous place-based incident map for South Africa. **No names.** Places, times, categories, and patterns — so women and children can see where reports cluster.

Opens with a black-and-white intro. Press **Say something** to enter the map.

## Quick start

```bash
npm install
npm run dev
```

Without Supabase, reports and petitions stay in **this browser**. Seed pins around Kempton Park / R21 still appear.

## Live shared pins (Supabase)

1. Create a free [Supabase](https://supabase.com) project.
2. Run [`supabase/schema.sql`](supabase/schema.sql) in the SQL Editor.
3. Copy `.env.example` → `.env` and set `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.
4. Restart `npm run dev`.

Hide leaked rows: Table Editor → `reports` → `hidden = true`.

## Private notebook

Entries stay on the user’s device only. The Voices never receives that text. Users can download a PDF themselves.

## GitHub Pages

```bash
npm run build
```

Deploy `dist/`. Workflow: [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

## Hard rules

- No names, surnames, nicknames, faces, plates, schools, workplaces
- No apology videos / “confirm this person”
- Child-related public posts: count only + Childline 116 / FCS
- Possible remains: call 10111 first; map shows area + time only
