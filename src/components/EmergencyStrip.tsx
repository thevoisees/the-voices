import { useState } from 'react'
import { useI18n } from '../i18n'

const PRIMARY = [
  { href: 'tel:10111', labelKey: 'police' as const, num: '10111' },
  { href: 'tel:112', labelKey: 'mobileEmergency' as const, num: '112' },
  { href: 'tel:0800428428', labelKey: 'gbv' as const, num: '0800 428 428' },
  { href: 'tel:116', labelKey: 'childline' as const, num: '116' },
]

const EXTRA = [
  { href: 'tel:10177', labelKey: 'ambulance' as const, num: '10177' },
  { href: 'tel:0861322322', labelKey: 'lifeline' as const, num: '0861 322 322' },
  { href: 'tel:0800150150', labelKey: 'stopGbv' as const, num: '0800 150 150' },
  { href: 'tel:0800567567', labelKey: 'suicide' as const, num: '0800 567 567' },
]

export function EmergencyStrip() {
  const { t } = useI18n()
  const [open, setOpen] = useState(false)

  return (
    <div className={`emergency-strip ${open ? 'is-open' : ''}`} role="region" aria-label={t.emergency.title}>
      <div className="emergency-row">
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

      <div className="emergency-chips">
        {PRIMARY.map((l) => (
          <a key={l.href} className="emergency-chip" href={l.href}>
            <span className="emergency-chip-label">{t.emergency[l.labelKey]}</span>
            <span className="emergency-chip-num">{l.num}</span>
          </a>
        ))}
        {open
          ? EXTRA.map((l) => (
              <a key={l.href} className="emergency-chip" href={l.href}>
                <span className="emergency-chip-label">{t.emergency[l.labelKey]}</span>
                <span className="emergency-chip-num">{l.num}</span>
              </a>
            ))
          : null}
      </div>
    </div>
  )
}
