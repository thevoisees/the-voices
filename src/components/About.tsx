import { useI18n } from '../i18n'

export function About() {
  const { t } = useI18n()
  return (
    <div className="page-scroll">
      <article className="panel about">
        <h1>{t.about.title}</h1>
        <p>{t.about.body1}</p>
        <p>{t.about.body2}</p>

        <h2>{t.about.missingTitle}</h2>
        <p>{t.about.missingBody}</p>

        <h2>{t.about.hardNos}</h2>
        <ul>
          {t.about.nos.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
        <p className="hint">{t.about.solidarity}</p>
      </article>
    </div>
  )
}
