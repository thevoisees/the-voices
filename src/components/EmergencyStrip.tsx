import { useState } from 'react'
import { useI18n } from '../i18n'

export function EmergencyStrip() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)

  return (
    <div className={`emergency-strip ${open ? 'is-open' : ''}`} role="region" aria-label={t.emergency.title}>
      <div className="emergency-head">
        <div className="emergency-title-block">
          <strong className="emergency-title">{t.emergency.title}</strong>
          <span className="emergency-lead">{t.emergency.lead}</span>
        </div>
        <button
          type="button"
          className="emergency-toggle"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? t.emergency.showLess : t.emergency.showMore}
        </button>
      </div>

      <div className="emergency-links">
        <a className="emergency-pill" href="tel:10111">
          <span className="emergency-pill-label">{t.emergency.police}</span>
          <span className="emergency-pill-num">10111</span>
        </a>
        <a className="emergency-pill" href="tel:112">
          <span className="emergency-pill-label">{t.emergency.mobileEmergency}</span>
          <span className="emergency-pill-num">112</span>
        </a>
        <a className="emergency-pill" href="tel:0800428428">
          <span className="emergency-pill-label">{t.emergency.gbv}</span>
          <span className="emergency-pill-num">0800 428 428</span>
        </a>
        <a className="emergency-pill" href="tel:116">
          <span className="emergency-pill-label">{t.emergency.childline}</span>
          <span className="emergency-pill-num">116</span>
        </a>

        {open ? (
          <>
            <a className="emergency-pill" href="tel:10177">
              <span className="emergency-pill-label">{t.emergency.ambulance}</span>
              <span className="emergency-pill-num">10177</span>
            </a>
            <a className="emergency-pill" href="tel:0861322322">
              <span className="emergency-pill-label">{t.emergency.lifeline}</span>
              <span className="emergency-pill-num">0861 322 322</span>
            </a>
            <a className="emergency-pill" href="tel:0800150150">
              <span className="emergency-pill-label">{t.emergency.stopGbv}</span>
              <span className="emergency-pill-num">0800 150 150</span>
            </a>
            <a className="emergency-pill" href="tel:0800055555">
              <span className="emergency-pill-label">{t.emergency.suicide}</span>
              <span className="emergency-pill-num">0800 567 567</span>
            </a>
          </>
        ) : null}
      </div>
    </div>
  )
}
