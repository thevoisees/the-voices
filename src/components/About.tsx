import { useI18n } from '../i18n'
import { cloudinaryConfigured } from '../lib/cloudinary'
import { supabaseConfigured } from '../lib/supabase'

export function About() {
  const { t } = useI18n()
  return (
    <div className="page-scroll">
      <article className="panel about">
        <h1>{t.about.title}</h1>
        <p>{t.about.body1}</p>
        <p>{t.about.body2}</p>

        <h2>{t.about.sharingTitle}</h2>
        <p className={supabaseConfigured ? 'banner success' : 'banner warn'}>
          {supabaseConfigured ? t.about.sharingOn : t.about.sharingOff}
        </p>
        <p className="hint">{t.about.sharingHow}</p>

        <h2>{t.about.photosTitle}</h2>
        <p className={cloudinaryConfigured ? 'banner success' : 'banner warn'}>
          {cloudinaryConfigured ? t.about.cloudinaryOn : t.about.cloudinaryOff}
        </p>
        <p>{t.about.photosBody}</p>
        <ol className="about-steps">
          {t.about.photosSteps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>

        <h2>{t.about.hardNos}</h2>
        <ul>
          {t.about.nos.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
        <p className="hint">{t.about.role}</p>
      </article>
    </div>
  )
}
