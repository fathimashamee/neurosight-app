import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../api'
import BackButton from './BackButton'

function fmt24to12(t) {
  const [h, m] = t.split(':').map(Number)
  const p = h >= 12 ? 'PM' : 'AM'
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${p}`
}

const DEFAULT_REMINDER = '20:00'
const TOTAL_STEPS = 2

function StepDots({ step }) {
  return (
    <div style={{ display: 'flex', gap: 6, justifyContent: 'center', marginBottom: 8 }}>
      {Array.from({ length: TOTAL_STEPS }, (_, i) => (
        <div key={i} style={{
          width: i + 1 === step ? 20 : 7,
          height: 7,
          borderRadius: 4,
          background: i + 1 <= step ? '#fff' : 'rgba(255,255,255,0.3)',
          transition: 'all 0.25s ease',
        }} />
      ))}
    </div>
  )
}

export default function Setup() {
  const navigate    = useNavigate()
  const { t }       = useTranslation()
  const patient     = JSON.parse(localStorage.getItem('mobile_patient')   || '{}')
  const caretaker   = JSON.parse(localStorage.getItem('mobile_caretaker') || '{}')
  const role        = localStorage.getItem('mobile_role') || 'patient'
  const isCaretaker = role === 'caretaker'
  const displayName = isCaretaker ? (caretaker.name || patient.name) : patient.name
  const isSettings  = !!localStorage.getItem(`setup_done_${patient.hospital_id}`)

  const [step, setStep]             = useState(1)
  const [reminderTime, setReminderTime] = useState(localStorage.getItem('reminder_time') || DEFAULT_REMINDER)
  const [showPicker, setShowPicker] = useState(false)
  const [notifStatus, setNotifStatus] = useState(
    typeof Notification !== 'undefined' && Notification.permission === 'granted' ? 'granted' :
    typeof Notification !== 'undefined' && Notification.permission === 'denied'  ? 'denied'  : null
  )
  const [saving, setSaving] = useState(false)

  async function requestNotifications() {
    if (!('Notification' in window)) { setNotifStatus('denied'); return }
    const r = await Notification.requestPermission()
    setNotifStatus(r === 'granted' ? 'granted' : 'denied')
  }

  function persistLocally(done) {
    localStorage.setItem('reminder_time',    reminderTime)
    localStorage.setItem('mobile_user_type', 'brain_tumor_patient')
    if (done) {
      localStorage.setItem(`setup_done_${patient.hospital_id}`, '1')
      localStorage.removeItem(`setup_skipped_${patient.hospital_id}`)
    } else {
      localStorage.setItem(`setup_skipped_${patient.hospital_id}`, '1')
    }
  }

  async function finish() {
    setSaving(true)
    persistLocally(true)
    setSaving(false)
    navigate('/home')
  }

  function skip() {
    persistLocally(false)
    navigate('/home')
  }

  function nextStep() {
    if (step < TOTAL_STEPS) setStep(s => s + 1)
    else finish()
  }

  // ── Settings mode: untouched — instructions coming separately ────────────
  if (isSettings) {
    return <SettingsPage
      patient={patient}
      reminderTime={reminderTime} setReminderTime={setReminderTime}
      showPicker={showPicker} setShowPicker={setShowPicker}
      notifStatus={notifStatus} requestNotifications={requestNotifications}
      saving={saving} t={t}
    />
  }

  // ── First-time wizard ────────────────────────────────────────────────────
  const stepLabel = [t('setup.step1Label'), t('setup.step2Label')][step - 1]
  const stepSub   = [
    t('setup.step1Sub'),
    t('setup.step2Sub'),
  ][step - 1]

  return (
    <div style={{
      height: '100%', background: '#f0fdfa',
      display: 'flex', flexDirection: 'column',
      fontFamily: "'DM Sans', sans-serif", overflow: 'hidden',
    }}>
      <style>{`
        @keyframes fadeUp  { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        @keyframes slideIn { from { opacity:0; transform:translateX(18px); } to { opacity:1; transform:translateX(0); } }
        .go-btn:active     { opacity:0.88; transform:scale(0.98); }
        .skip-btn:active   { opacity:0.6; }
        .time-row:active   { background:#e8f5f3 !important; }
      `}</style>

      {/* ── Teal header ── */}
      <div style={{
        background: 'linear-gradient(150deg, #0d9488 0%, #0a7068 100%)',
        padding: '44px 24px 26px', flexShrink: 0, position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position:'absolute', top:-40, right:-40, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,0.06)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-30, left:-20, width:100, height:100, borderRadius:'50%', background:'rgba(255,255,255,0.04)', pointerEvents:'none' }} />

        {/* Brand badge */}
        <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:22, animation:'fadeUp 0.3s ease both' }}>
          <div style={{ width:30, height:30, borderRadius:8, background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.25)', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
          <div>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.16em', color:'rgba(255,255,255,0.5)', textTransform:'uppercase', lineHeight:1 }}>{t('setup.accountReady')}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.75)', fontWeight:500, marginTop:2 }}>NeuroSight Care</div>
          </div>
        </div>

        {/* Name + doctor */}
        <div style={{ textAlign:'center', animation:'fadeUp 0.35s ease 0.06s both' }}>
          <p style={{ fontSize:13, color:'rgba(255,255,255,0.65)', margin:'0 0 3px', fontWeight:500 }}>{t('setup.welcome')}</p>
          <h1 style={{ fontSize:24, fontWeight:800, color:'#fff', margin:'0 0 14px', letterSpacing:'-0.3px', lineHeight:1.2 }}>
            {displayName || '—'}
          </h1>
          {patient.assigned_doctor && (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:2, borderTop:'1px solid rgba(255,255,255,0.2)', paddingTop:11 }}>
              <span style={{ fontSize:10, color:'rgba(255,255,255,0.5)', fontWeight:600, letterSpacing:'0.12em', textTransform:'uppercase' }}>{t('setup.connectedTo')}</span>
              <span style={{ fontSize:13, color:'#fff', fontWeight:700 }}>{patient.assigned_doctor}</span>
            </div>
          )}
        </div>

        {/* Step dots */}
        <div style={{ marginTop:18 }}>
          <StepDots step={step} />
          <div style={{ textAlign:'center', fontSize:10, color:'rgba(255,255,255,0.45)', fontWeight:500 }}>
            {t('setup.stepOf', { step, total: TOTAL_STEPS })}
          </div>
        </div>
      </div>

      {/* ── Step body ── */}
      <div style={{ flex:1, padding:'20px 20px 24px', display:'flex', flexDirection:'column', overflow:'hidden' }}>

        {/* Step header */}
        <div style={{ marginBottom:18, animation:'slideIn 0.3s ease both' }} key={step}>
          <div style={{ fontSize:20, fontWeight:800, color:'#0f172a', lineHeight:1.2 }}>{stepLabel}</div>
          <div style={{ fontSize:12, color:'#64748b', marginTop:4 }}>{stepSub}</div>
        </div>

        {/* ── Step 1: Reminder time ── */}
        {step === 1 && (
          <div style={{ animation:'slideIn 0.3s ease both' }}>
            <div style={{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:14, padding:'20px 18px', textAlign:'center' }}>
              <div style={{ width:52, height:52, borderRadius:16, background:'#e6faf8', margin:'0 auto 14px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                </svg>
              </div>
              <div style={{ fontSize:11, color:'#94a3b8', fontWeight:600, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8 }}>{t('setup.dailyCheckinTimeLabel')}</div>

              {showPicker ? (
                <input
                  type="time" value={reminderTime} autoFocus
                  onChange={e => { setReminderTime(e.target.value); setShowPicker(false) }}
                  style={{ width:'100%', padding:'12px 14px', fontSize:18, fontWeight:800, color:'#0d9488', border:'2.5px solid #0d9488', borderRadius:12, background:'#fff', fontFamily:"'DM Sans',sans-serif", outline:'none', boxSizing:'border-box', textAlign:'center' }}
                />
              ) : (
                <button
                  className="time-row"
                  onClick={() => setShowPicker(true)}
                  style={{ background:'#f0fdfa', border:'none', borderRadius:12, padding:'14px 20px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', width:'100%', transition:'background 0.15s' }}>
                  <span style={{ fontSize:28, fontWeight:900, color:'#0d9488', fontFamily:"'DM Sans',sans-serif", letterSpacing:'0.02em' }}>
                    {fmt24to12(reminderTime)}
                  </span>
                  <span style={{ fontSize:11, color:'#5eead4', fontWeight:600 }}>tap to change</span>
                </button>
              )}

              <div style={{ fontSize:11, color:'#94a3b8', marginTop:12, lineHeight:1.5 }}>
                {t('setup.reminderHint')}
              </div>
            </div>
          </div>
        )}

        {/* ── Step 2: Notifications ── */}
        {step === 2 && (
          <div style={{ animation:'slideIn 0.3s ease both' }}>
            <div style={{ background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:14, padding:'20px 18px', textAlign:'center' }}>
              <div style={{ width:52, height:52, borderRadius:16, background:'#eff6ff', margin:'0 auto 14px', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                  <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
                </svg>
              </div>
              <div style={{ fontSize:15, fontWeight:800, color:'#0f172a', marginBottom:6 }}>{t('setup.notifTitle')}</div>
              <div style={{ fontSize:12, color:'#64748b', lineHeight:1.6, marginBottom:18 }}>
                {t('setup.notifFullText')}
              </div>

              {notifStatus === null && (
                <button onClick={requestNotifications}
                  style={{ width:'100%', padding:'13px 0', background:'linear-gradient(135deg,#2563eb,#1d4ed8)', color:'#fff', border:'none', borderRadius:12, fontSize:14, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 14px rgba(37,99,235,0.3)' }}>
                  {t('setup.allowNotifBtn')}
                </button>
              )}
              {notifStatus === 'granted' && (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:12, padding:'13px 16px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                  <span style={{ fontSize:13, color:'#15803d', fontWeight:700 }}>{t('setup.notifGranted')}</span>
                </div>
              )}
              {notifStatus === 'denied' && (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, background:'#fef2f2', border:'1px solid #fecaca', borderRadius:12, padding:'13px 16px' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
                  <span style={{ fontSize:13, color:'#dc2626', fontWeight:700 }}>{t('setup.notifDeniedBrowser')}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div style={{ flex:1 }} />

        {/* ── Actions ── */}
        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
          <button
            className="go-btn"
            onClick={nextStep}
            disabled={saving}
            style={{
              width:'100%', padding:'14px 0',
              background:'linear-gradient(135deg, #0d9488, #0a7068)',
              color:'#fff', border:'none', borderRadius:12,
              fontSize:15, fontWeight:700, cursor:'pointer',
              boxShadow:'0 4px 18px rgba(13,148,136,0.3)',
              letterSpacing:'0.01em', transition:'opacity 0.15s, transform 0.15s',
              opacity: saving ? 0.7 : 1,
            }}>
            {saving ? t('setup.saving') : step < TOTAL_STEPS ? t('setup.next') : t('setup.getStarted')}
          </button>

          <button
            className="skip-btn"
            onClick={skip}
            style={{ background:'none', border:'none', color:'#94a3b8', fontSize:13, fontWeight:600, cursor:'pointer', padding:'6px 0', transition:'opacity 0.15s' }}>
            {t('setup.skipDefault', { time: fmt24to12(DEFAULT_REMINDER) })}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Settings page (returning users) — to be redesigned separately ────────────
function SettingsPage({ patient, reminderTime, setReminderTime, showPicker, setShowPicker, notifStatus, requestNotifications, saving, t }) {
  const navigate = useNavigate()
  const [userType, setUserType]       = useState(localStorage.getItem('mobile_user_type') || 'brain_tumor_patient')
  const [tumourGrade, setTumourGrade] = useState(localStorage.getItem('mobile_tumour_grade') || '')
  const [saved, setSaved]             = useState(false)
  const [isSaving, setIsSaving]       = useState(false)

  async function save() {
    setIsSaving(true)
    localStorage.setItem('reminder_time',    reminderTime)
    localStorage.setItem('mobile_user_type', userType)
    if (tumourGrade) localStorage.setItem('mobile_tumour_grade', tumourGrade)
    localStorage.setItem(`setup_done_${patient.hospital_id}`, '1')
    localStorage.removeItem(`setup_skipped_${patient.hospital_id}`)
    try {
      if (tumourGrade) {
        try { await api('/mobile/patient', { method: 'PUT', body: { tumour_type: tumourGrade } }) } catch {}
      }
    } finally {
      const raw = localStorage.getItem('mobile_patient')
      if (raw) {
        try {
          const p = JSON.parse(raw)
          if (tumourGrade) p.tumour_type = tumourGrade
          const v = (p.tumour_type || '').toLowerCase()
          if (!v || v === 'not classified')                             p.monitoring_frequency = 'Reminder not configured'
          else if (v.includes('no tumor') || v.includes('no tumour'))  p.monitoring_frequency = 'No reminder'
          else if (v.includes('grade i') || v.includes('grade ii'))    p.monitoring_frequency = 'Weekly reminder'
          else if (v.includes('grade iii') || v.includes('grade iv'))  p.monitoring_frequency = 'Daily reminder'
          else                                                          p.monitoring_frequency = 'Reminder not configured'
          localStorage.setItem('mobile_patient', JSON.stringify(p))
        } catch {}
      }
      setIsSaving(false)
      setSaved(true)
      setTimeout(() => { setSaved(false); navigate('/home') }, 700)
    }
  }

  return (
    <div style={{ height:'100%', background:'#fff', display:'flex', flexDirection:'column', fontFamily:"'DM Sans',sans-serif", overflow:'hidden' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        .go-btn:active { opacity:0.88; transform:scale(0.98); }
        .time-btn:active { background:#e8f5f3 !important; }
        .notif-btn:active { opacity:0.85; }
      `}</style>

      <div style={{ background:'linear-gradient(150deg, #0d9488 0%, #0a7068 100%)', padding:'44px 26px 28px', flexShrink:0, position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-40, right:-40, width:160, height:160, borderRadius:'50%', background:'rgba(255,255,255,0.06)', pointerEvents:'none' }} />
        <BackButton variant="glass" to="/home" />
        <div style={{ textAlign:'center', marginTop:12, animation:'fadeUp 0.35s ease 0.06s both' }}>
          <p style={{ fontSize:13, color:'rgba(255,255,255,0.65)', margin:'0 0 4px', fontWeight:500 }}>{t('setup.settingsFor')}</p>
          <h1 style={{ fontSize:22, fontWeight:700, color:'#fff', margin:0, letterSpacing:'-0.3px' }}>{t('setup.settingsTitle')}</h1>
        </div>
      </div>

      <div style={{ flex:1, padding:'20px 20px 24px', display:'flex', flexDirection:'column', gap:12, animation:'fadeUp 0.35s ease 0.12s both', overflow:'hidden' }}>
        {saved && (
          <div style={{ background:'#ecfdf5', border:'1px solid #bbf7d0', color:'#065f46', padding:'10px 12px', borderRadius:10, fontWeight:700, marginBottom:6, textAlign:'center' }}>
            Settings saved
          </div>
        )}

        {/* User type */}
        <div style={{ background:'#f8fafc', border:'1.5px solid #e2e8f0', borderRadius:14, padding:'16px 16px 14px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <div style={{ width:26, height:26, borderRadius:7, background:'#eff6ff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round"><path d="M12 2v6"/><path d="M12 22v-6"/></svg>
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'#0f172a', lineHeight:1 }}>I am a</div>
              <div style={{ fontSize:11, color:'#94a3b8', marginTop:3 }}>Choose the role that best describes you</div>
            </div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button onClick={() => setUserType('brain_tumor_patient')} style={{ flex:1, padding:12, borderRadius:10, border: userType === 'brain_tumor_patient' ? '2px solid #0d9488' : '1px solid #e2e8f0', background: userType === 'brain_tumor_patient' ? '#f0fdfa' : '#fff', fontWeight:700, cursor:'pointer' }}>Brain Tumor Patient</button>
            <button onClick={() => setUserType('normal_user')}         style={{ flex:1, padding:12, borderRadius:10, border: userType === 'normal_user'         ? '2px solid #0d9488' : '1px solid #e2e8f0', background: userType === 'normal_user'         ? '#f0fdfa' : '#fff', fontWeight:700, cursor:'pointer' }}>Normal User</button>
          </div>
          {userType === 'brain_tumor_patient' && (
            <div style={{ marginTop:12 }}>
              <div style={{ fontSize:11, color:'#64748b', marginBottom:6 }}>Tumour grade (optional)</div>
              <select value={tumourGrade} onChange={e => setTumourGrade(e.target.value)} style={{ width:'100%', padding:10, borderRadius:10, border:'1px solid #e2e8f0' }}>
                <option value="">Not specified</option>
                <option value="Grade I">Grade I</option>
                <option value="Grade II">Grade II</option>
                <option value="Grade III">Grade III</option>
                <option value="Grade IV">Grade IV</option>
              </select>
            </div>
          )}
        </div>

        {/* Reminder */}
        <div style={{ background:'#f8fafc', border:'1.5px solid #e2e8f0', borderRadius:14, padding:'16px 16px 14px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <div style={{ width:26, height:26, borderRadius:7, background:'#e6faf8', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2.2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'#0f172a', lineHeight:1 }}>Daily Reminder</div>
              <div style={{ fontSize:11, color:'#94a3b8', marginTop:3 }}>{t('setup.reminderQuestion')}</div>
            </div>
          </div>
          {showPicker ? (
            <input type="time" value={reminderTime} autoFocus onChange={e => { setReminderTime(e.target.value); setShowPicker(false) }}
              style={{ width:'100%', padding:'10px 14px', fontSize:15, fontWeight:700, color:'#0d9488', border:'2px solid #0d9488', borderRadius:10, background:'#fff', fontFamily:"'DM Sans',sans-serif", outline:'none', boxSizing:'border-box' }} />
          ) : (
            <button className="time-btn" onClick={() => setShowPicker(true)}
              style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', background:'#fff', border:'1.5px solid #e2e8f0', borderRadius:10, padding:'10px 14px', cursor:'pointer', transition:'background 0.15s' }}>
              <span style={{ fontSize:17, fontWeight:800, color:'#0d9488', fontFamily:"'DM Sans',sans-serif", letterSpacing:'0.03em' }}>{fmt24to12(reminderTime)}</span>
              <span style={{ fontSize:11, color:'#94a3b8', fontWeight:500 }}>{t('setup.tapToChange')}</span>
            </button>
          )}
        </div>

        {/* Notifications */}
        <div style={{ background:'#f8fafc', border:'1.5px solid #e2e8f0', borderRadius:14, padding:'16px 16px 14px' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <div style={{ width:26, height:26, borderRadius:7, background:'#eff6ff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.2" strokeLinecap="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
            </div>
            <div>
              <div style={{ fontSize:13, fontWeight:700, color:'#0f172a', lineHeight:1 }}>{t('setup.notifQuestion')}</div>
              <div style={{ fontSize:11, color:'#94a3b8', marginTop:3 }}>{t('setup.notifSub')}</div>
            </div>
          </div>
          {notifStatus === null && (
            <button className="notif-btn" onClick={requestNotifications}
              style={{ width:'100%', padding:'10px 0', background:'transparent', color:'#0d9488', border:'2px solid #0d9488', borderRadius:10, fontSize:13, fontWeight:700, cursor:'pointer', transition:'opacity 0.15s' }}>
              {t('setup.allowBtn')}
            </button>
          )}
          {notifStatus === 'granted' && (
            <div style={{ display:'flex', alignItems:'center', gap:8, background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:10, padding:'9px 13px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
              <span style={{ fontSize:12, color:'#15803d', fontWeight:600 }}>{t('setup.notifGranted')}</span>
            </div>
          )}
          {notifStatus === 'denied' && (
            <div style={{ display:'flex', alignItems:'center', gap:8, background:'#fef2f2', border:'1px solid #fecaca', borderRadius:10, padding:'9px 13px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2.5" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
              <span style={{ fontSize:12, color:'#dc2626', fontWeight:600 }}>{t('setup.notifDenied')}</span>
            </div>
          )}
        </div>

        <div style={{ display:'flex', gap:8, alignItems:'flex-start', padding:'0 2px' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" style={{ flexShrink:0, marginTop:2 }}>
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          <p style={{ fontSize:11, color:'#94a3b8', margin:0, lineHeight:1.6 }}>{t('setup.hintSettings')}</p>
        </div>

        <div style={{ flex:1 }} />

        <button className="go-btn" onClick={save} disabled={isSaving}
          style={{ width:'100%', padding:'14px 0', background:'linear-gradient(135deg, #0d9488, #0a7068)', color:'#fff', border:'none', borderRadius:12, fontSize:15, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 18px rgba(13,148,136,0.32)', letterSpacing:'0.01em', transition:'opacity 0.15s, transform 0.15s', opacity: isSaving ? 0.7 : 1 }}>
          {isSaving ? 'Saving…' : t('setup.saveSettings')}
        </button>
      </div>
    </div>
  )
}
