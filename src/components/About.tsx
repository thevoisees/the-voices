import { useI18n } from '../i18n'
import { supabaseConfigured } from '../lib/supabase'

export function About() {
  const { t } = useI18n()
  return (
    <div className="page-scroll">
      <article className="panel about">
        <h1>{t.about.title}</h1>
        <p>{t.about.body1}</p>
        <p>{t.about.body2}</p>
        <h2>{t.about.hardNos}</h2>
        <ul>
          {t.about.nos.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
        <p className="hint">{t.about.role}</p>
        <p className="hint">
          Live shared pins:{' '}
          {supabaseConfigured
            ? 'Supabase connected'
            : 'local-only mode (set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for live sharing)'}
        </p>
      </article>
    </div>
  )
}
