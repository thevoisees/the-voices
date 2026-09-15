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

## Live sharing (Supabase) — reports & missing list

**Status:** connected on the live site (`wljtudjcuwcxutsoekqn`). Map reports, missing-person *records*, and found-votes sync across phones.

You do **not** need the SQL Editor for photos if you use Cloudinary (below).

## Missing photos (Cloudinary)

**Cloud name:** `dmhftsl2x`  
**Preset:** `the_voices_missing` (must be **Unsigned**)

1. Cloudinary → **Settings → Upload → Upload presets → Add upload preset**
2. Name `the_voices_missing`, Signing mode **Unsigned**, Save
3. Hard-refresh the site → **About** should show Cloudinary is set

Never put the API **Secret** in the website. See [`docs/CLOUDINARY.md`](docs/CLOUDINARY.md).

## How missing photos are seen

| Piece | Job |
|------|-----|
| **Cloudinary** | Hosts the face image (public URL) |
| **Supabase** | Stores the person record (name, last seen, votes) so every phone shares the list |
| **Map strip** | Shows faces → tap for full details |

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
