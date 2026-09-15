# Cloudinary setup for The Voices (missing photos)

Never put the **API Secret** in the website. The browser only needs:

- cloud name: `dmhftsl2x`
- unsigned upload preset: `the_voices_missing`

## Create the unsigned preset (2 minutes)

1. Open [Cloudinary Console](https://console.cloudinary.com/) → your cloud **dmhftsl2x**
2. Go to **Settings** (gear) → **Upload** → **Upload presets**
3. Click **Add upload preset**
4. Set:
   - **Preset name:** `the_voices_missing`
   - **Signing mode:** **Unsigned**
   - **Folder:** `the-voices/missing` (optional)
5. **Save**

That’s it. The app + GitHub secrets already use this name.

## Security

If your API secret was visible in a screenshot or chat, rotate it in Cloudinary (**API Keys** → regenerate). The website does not need the secret.
