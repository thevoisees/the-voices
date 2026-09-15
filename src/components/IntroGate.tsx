import { useEffect, useState } from 'react'
import { useI18n } from '../i18n'

const INTRO_IMAGES = [
  './intro/voices-intro-woman-1.png',
  './intro/voices-intro-woman-2.png',
  './intro/voices-intro-woman-3.png',
  './intro/voices-intro-woman-4.png',
  './intro/voices-intro-child-1.png',
  './intro/voices-intro-child-2.png',
]

type Props = {
  onEnter: () => void
}

export function IntroGate({ onEnter }: Props) {
  const { t } = useI18n()
  const [index, setIndex] = useState(0)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % INTRO_IMAGES.length)
    }, 4200)
    return () => window.clearInterval(id)
  }, [])

  function enter() {
    setLeaving(true)
    window.setTimeout(onEnter, 700)
  }

  return (
    <div className={`intro-gate ${leaving ? 'leaving' : ''}`} role="dialog" aria-label={t.appName}>
      <div className="intro-slides" aria-hidden>
        {INTRO_IMAGES.map((src, i) => (
          <div
            key={src}
            className={`intro-slide ${i === index ? 'active' : ''}`}
            style={{ backgroundImage: `url(${src})` }}
          />
        ))}
        <div className="intro-veil" />
      </div>

      <div className="intro-content">
        <p className="intro-eyebrow">{t.intro.eyebrow}</p>
        <h1 className="intro-brand">{t.appName}</h1>
        <p className="intro-line">{t.intro.line}</p>
        <button type="button" className="intro-cta" onClick={enter}>
          {t.intro.saySomething}
        </button>
        <p className="intro-sub">{t.intro.sub}</p>
      </div>
    </div>
  )
}
