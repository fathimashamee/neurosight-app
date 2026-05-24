import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../api'
import i18n from '../i18n'

const LANG_CYCLE = ['en', 'si', 'ta']
const LANG_LABEL = { en: 'EN', si: 'සිං', ta: 'தமிழ்' }

function getGreeting(t) {
  const h = new Date().getHours()
  if (h < 12) return t('home.morning')
  if (h < 17) return t('home.afternoon')
  return t('home.evening')
}

function tumourPill(type) {
  const lo = (type || '').toLowerCase()
  if (!type || type === 'Not Classified') return { bg: 'rgba(255,255,255,0.12)', text: 'rgba(255,255,255,0.8)' }
  if (lo.includes('no tumor') || lo.includes('no tumour')) return { bg: 'rgba(16,185,129,0.22)', text: '#d1fae5' }
  return { bg: 'rgba(239,68,68,0.2)', text: '#fecaca' }
}

function levelStyle(level) {
  if (level === 'GREEN')    return { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', dot: '#22c55e' }
  if (level === 'AMBER')    return { color: '#d97706', bg: '#fffbeb', border: '#fde68a', dot: '#f59e0b' }
  if (level === 'RED')      return { color: '#dc2626', bg: '#fff7ed', border: '#fed7aa', dot: '#ef4444' }
  if (level === 'CRITICAL') return { color: '#9f1239', bg: '#fff1f2', border: '#fecdd3', dot: '#e11d48' }
  return { color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', dot: '#94a3b8' }
}

export default function Home() {
  const navigate    = useNavigate()
  const { t }       = useTranslation()
  const patient     = JSON.parse(localStorage.getItem('mobile_patient')   || '{}')
  const caretaker   = JSON.parse(localStorage.getItem('mobile_caretaker') || '{}')
  const role        = localStorage.getItem('mobile_role') || 'patient'
  const isCaretaker = role === 'caretaker'
  const tc          = tumourPill(patient.tumour_type)
  const setupDone   = !!localStorage.getItem(`setup_done_${patient.hospital_id}`)
  const currentLang = localStorage.getItem('language') || 'en'

  const [checkin, setCheckin] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mobile_latest_checkin') || 'null') } catch { return null }
  })

  useEffect(() => {
    if (!checkin) {
      api('/mobile/checkins/latest')
        .then(d => {
          if (d) {
            setCheckin(d)
            localStorage.setItem('mobile_latest_checkin', JSON.stringify(d))
          }
        })
        .catch(() => {})
    }
  }, [])

  function cycleLang() {
    const next = LANG_CYCLE[(LANG_CYCLE.indexOf(currentLang) + 1) % LANG_CYCLE.length]
    localStorage.setItem('language', next)
    i18n.changeLanguage(next)
  }

  function signOut() {
    localStorage.removeItem('mobile_token')
    localStorage.removeItem('mobile_patient')
    localStorage.removeItem('mobile_role')
    localStorage.removeItem('mobile_caretaker')
    localStorage.removeItem('mobile_latest_checkin')
    navigate('/login')
  }

  const actions = [
    { key: 'report',    icon: ReportIcon,    route: '/report',    color: '#eff6ff', iconColor: '#1d4ed8', border: '#bfdbfe' },
    { key: 'checkin',   icon: CheckinIcon,   route: '/checkin',   color: '#f0fdf4', iconColor: '#16a34a', border: '#bbf7d0' },
    { key: 'chat',      icon: ChatIcon,      route: '/chat',      color: '#fdf4ff', iconColor: '#9333ea', border: '#f3e8ff' },
    { key: 'education', icon: EducationIcon, route: '/education', color: '#fff7ed', iconColor: '#ea580c', border: '#fed7aa' },
    { key: 'symptom',   icon: SymptomIcon,   route: '/symptom',   color: '#fef2f2', iconColor: '#be185d', border: '#fecdd3' },
    { key: 'emergency', icon: EmergencyIcon, route: '/emergency', color: '#fff1f2', iconColor: '#e11d48', border: '#fecdd3' },
  ]

  const ls = checkin ? levelStyle(checkin.level) : null

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
        .action-card { transition: transform 0.15s ease; }
        .action-card:active { transform: scale(0.95); }
        .lang-btn:active { opacity: 0.75; }
      `}</style>

      {/* ── Header ─────────────────────────────────────────────────── */}
      <div style={{ background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)', padding: '48px 20px 24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -20, left: -20, width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', pointerEvents: 'none' }} />

        {/* Top row: name + language toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
          <div style={{ animation: 'fadeUp 0.4s ease both' }}>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginBottom: 2 }}>{getGreeting(t)}</div>
            <div style={{ fontSize: 21, fontWeight: 800, color: '#fff', lineHeight: 1.2 }}>
              {isCaretaker ? (caretaker.name || '—') : (patient.name || '—')}
            </div>
            {isCaretaker && (
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>
                {t('home.caretakerViewing')} <span style={{ fontWeight: 700 }}>{patient.name || '—'}</span>
              </div>
            )}
          </div>

          {/* Right controls: language + settings */}
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button
              className="lang-btn"
              onClick={cycleLang}
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.28)', borderRadius: 10, color: 'rgba(255,255,255,0.92)', padding: '6px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, letterSpacing: '0.04em' }}>
              <GlobeIcon />
              {LANG_LABEL[currentLang]}
            </button>
            <button
              className="lang-btn"
              onClick={() => navigate('/setup')}
              title="Settings"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.28)', borderRadius: 10, color: 'rgba(255,255,255,0.92)', padding: '6px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <GearIcon />
            </button>
          </div>
        </div>

        {/* Info pills */}
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', animation: 'fadeUp 0.4s ease 0.08s both' }}>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '4px 11px', fontSize: 11, color: '#fff', display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ opacity: 0.7 }}>{t('home.hospitalId')}:</span>
            <span style={{ fontWeight: 700, fontFamily: "'DM Mono',monospace" }}>{patient.hospital_id || '—'}</span>
          </div>
          <div style={{ background: tc.bg, borderRadius: 20, padding: '4px 11px', fontSize: 11, color: tc.text, fontWeight: 700 }}>
            {patient.tumour_type || t('home.notClassified')}
          </div>
          {patient.risk_score && patient.risk_score !== '0%' && (
            <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '4px 11px', fontSize: 11, color: '#fff', fontWeight: 700 }}>
              {t('home.riskScore')}: {patient.risk_score}
            </div>
          )}
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────── */}
      <div style={{ flex: 1, padding: '14px 14px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* Setup reminder banner */}
        {!setupDone && (
          <div style={{ background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 14, padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 11, animation: 'fadeUp 0.4s ease both' }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2.2" strokeLinecap="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 1 }}>{t('home.setupBanner')}</div>
              <div style={{ fontSize: 11, color: '#b45309', lineHeight: 1.4 }}>{t('home.setupBannerSub')}</div>
            </div>
            <button onClick={() => navigate('/setup')} style={{ background: '#d97706', color: '#fff', border: 'none', borderRadius: 8, padding: '7px 10px', fontSize: 11, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0 }}>
              {t('home.setupBannerBtn')}
            </button>
          </div>
        )}

        {/* Last check-in card */}
        <div style={{ background: '#fff', border: `1.5px solid ${ls ? ls.border : '#e2e8f0'}`, borderRadius: 14, padding: '13px 14px', animation: 'fadeUp 0.4s ease 0.08s both', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8', marginBottom: 6 }}>
                {t('home.lastCheckin')}
              </div>
              {checkin ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{ width: 9, height: 9, borderRadius: '50%', background: ls.dot, flexShrink: 0 }} />
                    <span style={{ fontSize: 14, fontWeight: 800, color: ls.color }}>{checkin.level}</span>
                    <span style={{ fontSize: 11, color: '#94a3b8' }}>· {t('home.checkinScore')} {checkin.score}</span>
                  </div>
                  {checkin.created_at && (
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>
                      {new Date(checkin.created_at).toLocaleDateString()}
                    </div>
                  )}
                </>
              ) : (
                <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.5 }}>{t('home.noCheckin')}</div>
              )}
            </div>
            {checkin && (
              <button
                onClick={() => navigate('/result', { state: checkin })}
                style={{ background: ls.bg, border: `1px solid ${ls.border}`, color: ls.color, borderRadius: 9, padding: '6px 11px', fontSize: 11, fontWeight: 700, cursor: 'pointer', flexShrink: 0 }}>
                {t('home.viewDetails')}
              </button>
            )}
          </div>
        </div>

        {/* Quick actions — 2 × 3 grid */}
        <div style={{ animation: 'fadeUp 0.4s ease 0.12s both' }}>
          <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#94a3b8', marginBottom: 9 }}>
            {t('home.quickActions')}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {actions.map(({ key, icon: Icon, route, color, iconColor, border }) => (
              <button
                key={key}
                className="action-card"
                onClick={() => navigate(route)}
                style={{
                  background: color, border: `1px solid ${border}`,
                  borderRadius: 14, padding: '15px 13px',
                  display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 9,
                  cursor: 'pointer', textAlign: 'left',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                }}>
                <div style={{ width: 33, height: 33, borderRadius: 9, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  <Icon color={iconColor} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>{t(`home.${key}`)}</div>
                  <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.4 }}>{t(`home.${key}Sub`)}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Doctor card */}
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: '13px 14px', display: 'flex', alignItems: 'center', gap: 12, animation: 'fadeUp 0.4s ease 0.18s both', boxShadow: '0 1px 3px rgba(0,0,0,0.03)' }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: '#f0fdfa', border: '1px solid #ccfbf1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
              <circle cx="12" cy="7" r="4"/>
            </svg>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#94a3b8', marginBottom: 2 }}>
              {t('home.yourDoctor')}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{patient.assigned_doctor || t('home.noDoctor')}</div>
          </div>
          {patient.monitoring_frequency && !['No reminder', 'Reminder not configured'].includes(patient.monitoring_frequency) && (
            <div style={{ background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: 8, padding: '4px 8px', flexShrink: 0 }}>
              <div style={{ fontSize: 10, color: '#0d9488', fontWeight: 600 }}>{patient.monitoring_frequency}</div>
            </div>
          )}
        </div>

        {/* Sign out — small footer link, not a prominent button */}
        <div style={{ textAlign: 'center', paddingTop: 2 }}>
          <button
            onClick={signOut}
            style={{ background: 'none', border: 'none', color: '#cbd5e1', fontSize: 11, cursor: 'pointer', padding: '4px 8px', textDecoration: 'underline', textDecorationColor: '#e2e8f0' }}>
            {t('home.signOut')}
          </button>
        </div>

      </div>
    </div>
  )
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function GlobeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10"/>
      <line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>
  )
}

function GearIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}

function ReportIcon({ color }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
    </svg>
  )
}

function CheckinIcon({ color }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  )
}

function ChatIcon({ color }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  )
}

function EducationIcon({ color }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>
    </svg>
  )
}

function SymptomIcon({ color }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 2a2 2 0 0 0-2 2v5H4a2 2 0 0 0-2 2v2c0 1.1.9 2 2 2h5v5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2v-5h5a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-5V4a2 2 0 0 0-2-2h-2z"/>
    </svg>
  )
}

function EmergencyIcon({ color }) {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  )
}
