import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../api'

const BRAIN_QUESTIONS = [
  {
    key: 'headache',
    title: 'Q1: Do you have a headache today?',
    options: [
      { label: 'No headache', points: 0 },
      { label: 'Mild (a little)', points: 1 },
      { label: 'Moderate (painful)', points: 2 },
      { label: 'Severe (very bad)', points: 3 },
    ],
  },
  {
    key: 'seizure',
    title: 'Q2: Did you have a seizure today?',
    options: [
      { label: 'No', points: 0 },
      { label: 'Yes (brief)', points: 5 },
      { label: 'Yes (long)', points: 5 },
    ],
    warning: 'If YES, seek urgent help now.',
  },
  {
    key: 'energy',
    title: 'Q3: How is your energy today?',
    options: [
      { label: 'Normal', points: 0 },
      { label: 'A bit tired', points: 1 },
      { label: 'Very tired', points: 2 },
      { label: 'Cannot get up', points: 3 },
    ],
  },
  {
    key: 'nausea',
    title: 'Q4: Any nausea or vomiting?',
    options: [
      { label: 'None', points: 0 },
      { label: 'Feeling sick', points: 1 },
      { label: 'Vomited once', points: 2 },
      { label: 'Vomited many times', points: 3 },
    ],
  },
  {
    key: 'medication',
    title: 'Q5: Did you take your medication?',
    options: [
      { label: 'Yes (all doses)', points: 0 },
      { label: 'Missed one dose', points: 1 },
      { label: 'Missed all doses', points: 2 },
      { label: 'No medication today', points: 0 },
    ],
  },
  {
    key: 'overall',
    title: 'Q6: How are you feeling overall?',
    options: [
      { label: 'Good', points: 0 },
      { label: 'Same as usual', points: 1 },
      { label: 'Worse than yesterday', points: 2 },
      { label: 'Much worse', points: 3 },
    ],
  },
  {
    key: 'sleep',
    title: 'Q7: How did you sleep last night?',
    options: [
      { label: 'Well', points: 0 },
      { label: 'Okay', points: 1 },
      { label: 'Poor', points: 2 },
      { label: 'Very little', points: 3 },
    ],
  },
  {
    key: 'appetite',
    title: 'Q8: How is your appetite today?',
    options: [
      { label: 'Normal', points: 0 },
      { label: 'Slightly low', points: 1 },
      { label: 'Very low', points: 2 },
      { label: 'Could not eat', points: 3 },
    ],
  },
  
]

const NORMAL_QUESTIONS = [
  {
    key: 'headache',
    title: 'Q1: Do you have a headache today?',
    options: [
      { label: 'No headache', points: 0 },
      { label: 'Mild (a little)', points: 1 },
      { label: 'Moderate (painful)', points: 2 },
      { label: 'Severe (very bad)', points: 3 },
    ],
  },
  {
    key: 'seizure',
    title: 'Q2: Did you have a seizure today?',
    options: [
      { label: 'No', points: 0 },
      { label: 'Yes (brief)', points: 5 },
      { label: 'Yes (long)', points: 5 },
    ],
    warning: 'If YES, seek urgent help now.',
  },
  {
    key: 'energy',
    title: 'Q3: How is your energy today?',
    options: [
      { label: 'Normal', points: 0 },
      { label: 'A bit tired', points: 1 },
      { label: 'Very tired', points: 2 },
      { label: 'Cannot get up', points: 3 },
    ],
  },
  {
    key: 'medication',
    title: 'Q4: Did you take your medication?',
    options: [
      { label: 'Yes (all doses)', points: 0 },
      { label: 'Missed one dose', points: 1 },
      { label: 'Missed all doses', points: 2 },
      { label: 'No medication today', points: 0 },
    ],
  },
  {
    key: 'overall',
    title: 'Q5: How are you feeling overall?',
    options: [
      { label: 'Good', points: 0 },
      { label: 'Same as usual', points: 1 },
      { label: 'Worse than yesterday', points: 2 },
      { label: 'Much worse', points: 3 },
    ],
  },
  {
    key: 'sleep',
    title: 'Q6: How did you sleep last night?',
    options: [
      { label: 'Well', points: 0 },
      { label: 'Okay', points: 1 },
      { label: 'Poor', points: 2 },
      { label: 'Very little', points: 3 },
    ],
  },
  {
    key: 'appetite',
    title: 'Q7: How is your appetite today?',
    options: [
      { label: 'Normal', points: 0 },
      { label: 'Slightly low', points: 1 },
      { label: 'Very low', points: 2 },
      { label: 'Could not eat', points: 3 },
    ],
  },
  
]

const URGENT_FOLLOW_UPS = {
  headache: {
    key: 'headache_followup',
    title: 'Follow-up: have you told a caregiver or doctor about the severe headache?',
    options: [
      { label: 'Yes, already informed', points: 0 },
      { label: 'Not yet', points: 0 },
    ],
    warning: 'Severe headache needs prompt medical attention.',
  },
  seizure: {
    key: 'seizure_followup',
    title: 'Follow-up: have you contacted urgent help for the seizure?',
    options: [
      { label: 'Yes, already contacted', points: 0 },
      { label: 'Not yet', points: 0 },
    ],
    warning: 'A seizure is treated as a critical red flag.',
  },
  nausea: {
    key: 'vomit_followup',
    title: 'Follow-up: are you still able to keep fluids down?',
    options: [
      { label: 'Yes', points: 0 },
      { label: 'No', points: 0 },
    ],
    warning: 'Repeated vomiting can cause dehydration and needs review.',
  },
}

function monitoringPlan(tumourType) {
  const value = (tumourType || '').toLowerCase()
  if (!value || value === 'not classified') return { label: 'Reminder not configured', color: '#64748b' }
  if (value.includes('no tumor') || value.includes('no tumour')) return { label: 'No reminder', color: '#64748b' }
  if (value.includes('grade i') || value.includes('grade ii')) return { label: 'Weekly reminder', color: '#0f766e' }
  if (value.includes('grade iii') || value.includes('grade iv')) return { label: 'Daily reminder', color: '#0d9488' }
  return { label: 'Reminder not configured', color: '#64748b' }
}

function scoreAnswer(questionKey, value) {
  const all = [...BRAIN_QUESTIONS, ...NORMAL_QUESTIONS]
  const question = all.find(q => q.key === questionKey)
  return question?.options.find(option => option.label === value)?.points ?? 0
}

function resolveUserType(patient, storedUserType) {
  if (storedUserType === 'normal_user' || storedUserType === 'brain_tumor_patient') {
    return storedUserType
  }

  const tumourType = (patient?.tumour_type || '').toLowerCase()
  if (tumourType.includes('no tumor') || tumourType.includes('no tumour')) {
    return 'normal_user'
  }

  return 'brain_tumor_patient'
}

function draftStorageKey(patient, userType) {
  return `checkin_saved_${patient.hospital_id || patient.id || 'anon'}_${userType}`
}

function buildQuestionFlow(userType, answers) {
  const base = userType === 'normal_user' ? NORMAL_QUESTIONS : BRAIN_QUESTIONS
  const flow = []

  for (const question of base) {
    flow.push(question)

    if (question.key === 'headache' && answers.headache === 'Severe (very bad)') {
      flow.push(URGENT_FOLLOW_UPS.headache)
    }

    if (question.key === 'seizure' && answers.seizure && answers.seizure !== 'No') {
      flow.push(URGENT_FOLLOW_UPS.seizure)
    }

    if (question.key === 'nausea' && answers.nausea === 'Vomited many times') {
      flow.push(URGENT_FOLLOW_UPS.nausea)
    }
  }

  return flow
}

export default function CheckIn() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const patient = JSON.parse(localStorage.getItem('mobile_patient') || '{}')
  const role = localStorage.getItem('mobile_role') || 'patient'
  const location = useLocation()
  const forcedUserType = location?.state?.forceUserType
  const userType = forcedUserType || resolveUserType(patient, localStorage.getItem('mobile_user_type'))
  const [showForcedBanner, setShowForcedBanner] = useState(false)
  const tumourGrade = localStorage.getItem('mobile_tumour_grade') || patient.tumour_type || ''
  const reminder = useMemo(() => monitoringPlan(patient.tumour_type), [patient.tumour_type])
  const draftKey = draftStorageKey(patient, userType)

  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState({ headache: '', headache_followup: '', seizure: '', seizure_followup: '', energy: '', nausea: '', vomit_followup: '', medication: '', overall: '', sleep: '', appetite: '', note: '' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notifyLoading, setNotifyLoading] = useState(false)
  const [notifyResult, setNotifyResult] = useState('')
  const [latest, setLatest] = useState(null)
  const QUESTIONS = useMemo(() => buildQuestionFlow(userType, answers), [userType, answers])

  useEffect(() => {
    if (!patient.id) {
      navigate('/login', { replace: true })
      return
    }

    let mounted = true
    api('/mobile/checkins/latest').then(data => {
      if (mounted) setLatest(data || null)
    }).catch(() => {
      if (mounted) setLatest(null)
    })

    return () => { mounted = false }
  }, [navigate, patient.id])

  useEffect(() => {
    if (forcedUserType) {
      setShowForcedBanner(true)
      const t = setTimeout(() => setShowForcedBanner(false), 900)
      return () => clearTimeout(t)
    }
  }, [forcedUserType])

  // Load any locally-saved in-progress check-in for this user
  useEffect(() => {
    try {
      const raw = localStorage.getItem(draftKey)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed.answers) setAnswers(prev => ({ ...prev, ...parsed.answers }))
        if (typeof parsed.primaryStep === 'number') setStep(parsed.primaryStep)
      }
    } catch (e) {}
  }, [draftKey])

  // Autosave answers locally on every change
  useEffect(() => {
    try {
      localStorage.setItem(draftKey, JSON.stringify({ primaryStep: step, answers, userType, tumourGrade }))
    } catch (e) {}
  }, [answers, step, userType, tumourGrade, draftKey])

  // Ensure `step` stays within bounds when question set changes
  useEffect(() => {
    if (step >= QUESTIONS.length) {
      setStep(Math.max(0, QUESTIONS.length - 1))
    }
  }, [QUESTIONS.length, step])

  const safeStep = Math.min(step, Math.max(0, QUESTIONS.length - 1))
  const current = QUESTIONS[safeStep]
  const isLast = safeStep === QUESTIONS.length - 1
  const canProceed = !!answers[current?.key]

  const totalScore = useMemo(() => {
    return QUESTIONS.reduce((sum, question) => sum + scoreAnswer(question.key, answers[question.key]), 0)
  }, [answers, QUESTIONS])

  const seizureSelected = answers.seizure && answers.seizure !== 'No'
  const severeHeadacheSelected = answers.headache === 'Severe (very bad)'
  const repeatedVomitingSelected = answers.nausea === 'Vomited many times'

  function choose(optionLabel, key = current.key) {
    setError('')
    setAnswers(prev => ({ ...prev, [key]: optionLabel }))
  }

  function next() {
    if (!canProceed) return
    if (!isLast) setStep(prev => prev + 1)
  }

  function back() {
    if (step > 0) setStep(prev => prev - 1)
  }

  async function submit() {
    if (!canProceed || submitting) return
    setError('')
    setSubmitting(true)
    try {
      const branchNotes = [
        severeHeadacheSelected ? `Severe headache follow-up: ${answers.headache_followup || 'not answered'}` : null,
        seizureSelected ? `Seizure follow-up: ${answers.seizure_followup || 'not answered'}` : null,
        repeatedVomitingSelected ? `Vomiting follow-up: ${answers.vomit_followup || 'not answered'}` : null,
      ].filter(Boolean)

      // Prepare note and truncate to 140 chars to match backend compacting behavior
      let note = [answers.note, ...branchNotes].filter(Boolean).join(' | ') || null
      if (note && note.length > 140) note = note.slice(0, 137).trim() + '…'

      const payload = {
        headache: answers.headache,
        seizure: answers.seizure,
        energy: answers.energy,
        nausea: answers.nausea,
        medication: answers.medication,
        overall: answers.overall,
        // send null for optional unanswered fields so backend treats them as empty
        sleep: answers.sleep || null,
        appetite: answers.appetite || null,
        note: note,
        trigger_source: 'Patient taps "Daily Check-in"',
      }
      const saved = await api('/mobile/checkins', { method: 'POST', body: payload })
      localStorage.setItem('mobile_latest_checkin', JSON.stringify(saved))
      navigate('/result', { state: saved })
    } catch (err) {
      // Handle authentication errors specifically
      if (err && (err.status === 401 || (err.message || '').toLowerCase().includes('token') || (err.message || '').toLowerCase().includes('unauthorized'))) {
        localStorage.removeItem('mobile_token')
        setError('Authentication error — please sign in again')
        navigate('/login', { replace: true })
        return
      }
      setError(err.message || 'Unable to submit check-in')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div style={{ minHeight:'100vh', background:'#f8fafc', fontFamily:"'DM Sans', sans-serif", display:'flex', flexDirection:'column' }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        .ci-card:active { transform: scale(0.99); }
        .ci-option:active { transform: scale(0.99); }
      `}</style>

        <div style={{ background:'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)', padding:'36px 24px 28px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-34, right:-28, width:140, height:140, borderRadius:'50%', background:'rgba(255,255,255,0.08)', pointerEvents:'none' }} />

        <div style={{ animation:'fadeUp 0.35s ease both' }}>
          <div style={{ fontSize:11, fontWeight:800, letterSpacing:'0.18em', textTransform:'uppercase', color:'rgba(255,255,255,0.72)', marginBottom:8 }}>Daily Check-in</div>
          <div style={{ fontSize:24, fontWeight:800, color:'#fff', lineHeight:1.2 }}>{patient.name || '—'}</div>
          <div style={{ fontSize:13, color:'rgba(255,255,255,0.74)', marginTop:6 }}>Start anytime with Daily Check-in.</div>
        </div>

        <div style={{ position:'absolute', top:16, right:16 }}>
           {/* Button removed to hide additional questions */}
        </div>

      </div>

      

      <div style={{ flex:1, background:'#fff', borderRadius:'24px 24px 0 0', marginTop:6, padding:'16px 20px 24px', boxShadow:'0 -4px 20px rgba(0,0,0,0.06)' }}>
        {showForcedBanner && (
          <div style={{ marginBottom:10, padding:'10px 12px', borderRadius:12, background:'#ecfeff', border:'1px solid #bbf7d0', color:'#064e3b', fontWeight:700 }}>Opening brain‑tumour check‑in…</div>
        )}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <div>
            <div style={{ fontSize:11, fontWeight:800, textTransform:'uppercase', letterSpacing:'0.12em', color:'#94a3b8' }}>Daily Health Check-in</div>
          </div>
          <div style={{ fontSize:12, color:'#0f766e', fontWeight:700 }}>{safeStep + 1} of {QUESTIONS.length}</div>
        </div>

        <div style={{ height:10, borderRadius:999, background:'#e2e8f0', overflow:'hidden', marginBottom:14 }}>
          <div style={{ width:`${((safeStep + 1) / QUESTIONS.length) * 100}%`, height:'100%', background:'linear-gradient(90deg, #0d9488, #2dd4bf)', borderRadius:999 }} />
        </div>

              

              <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:16, fontWeight:800, color:'#0f172a', marginBottom:8 }}>{current.title}</div>
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {current.options.map(option => {
              const active = answers[current.key] === option.label
              return (
                <button
                  key={option.label}
                  type="button"
                  className="ci-option"
                  onClick={() => choose(option.label)}
                  style={{
                    textAlign:'left', border:'1px solid', borderColor: active ? '#0d9488' : '#e2e8f0',
                    background: active ? '#f0fdfa' : '#fff', borderRadius:14, padding:'12px 14px', cursor:'pointer',
                    display:'flex', alignItems:'center', justifyContent:'space-between', gap:10,
                  }}
                >
                  <span style={{ fontSize:14, fontWeight:700, color:'#1e293b' }}>○ {option.label}</span>
                  <span style={{ fontSize:12, fontWeight:800, color: active ? '#0f766e' : '#94a3b8' }}>[{option.points} pts]</span>
                </button>
              )
            })}
          </div>
          {current.warning && (
            <div style={{ marginTop:10, padding:'10px 12px', borderRadius:12, background:'#fff7ed', border:'1px solid #fed7aa', color:'#9a3412', fontSize:12, fontWeight:700 }}>
              ⚠ {current.warning}
            </div>
          )}

          {current.key === 'headache_followup' && severeHeadacheSelected && (
            <div style={{ marginTop:10, padding:'10px 12px', borderRadius:12, background:'#fef2f2', border:'1px solid #fecaca', color:'#b91c1c', fontSize:12, fontWeight:700 }}>
              This follow-up only appears because you selected severe headache.
            </div>
          )}

          {current.key === 'seizure_followup' && seizureSelected && (
            <div style={{ marginTop:10, padding:'10px 12px', borderRadius:12, background:'#fef2f2', border:'1px solid #fecaca', color:'#b91c1c', fontSize:12, fontWeight:700 }}>
              This follow-up only appears because you reported a seizure.
            </div>
          )}

          {current.key === 'vomit_followup' && repeatedVomitingSelected && (
            <div style={{ marginTop:10, padding:'10px 12px', borderRadius:12, background:'#fef2f2', border:'1px solid #fecaca', color:'#b91c1c', fontSize:12, fontWeight:700 }}>
              This follow-up only appears because you selected repeated vomiting.
            </div>
          )}
        </div>

        

        {isLast && (
          <div style={{ marginBottom:18 }}>
            <label style={{ display:'block', fontSize:11, fontWeight:800, letterSpacing:'0.1em', textTransform:'uppercase', color:'#64748b', marginBottom:6 }}>Any note for your doctor?</label>
            <textarea
              value={answers.note}
              onChange={e => setAnswers(prev => ({ ...prev, note: e.target.value }))}
              placeholder="Optional text box"
              rows={4}
              style={{ width:'100%', border:'1px solid #e2e8f0', borderRadius:14, padding:'12px 14px', fontSize:14, color:'#0f172a', resize:'vertical', outline:'none', fontFamily:"'DM Sans', sans-serif" }}
            />
          </div>
        )}

        {seizureSelected && (
          <div style={{ marginBottom:14, padding:'12px 14px', borderRadius:14, background:'#fef2f2', border:'1px solid #fecaca', color:'#b91c1c', fontSize:13, fontWeight:700 }}>
            Seizure YES means this check-in is treated as CRITICAL.
          </div>
        )}

        {(seizureSelected || severeHeadacheSelected || repeatedVomitingSelected) && (
          <div style={{ marginBottom:14, padding:14, borderRadius:12, background:'#fff1f2', border:'1px solid #fecaca' }}>
            <div style={{ fontSize:15, fontWeight:900, color:'#7f1d1d', marginBottom:8 }}>Emergency escalation</div>
            <div style={{ fontSize:13, color:'#7f1d1d', marginBottom:10 }}>This submission contains red‑flag symptoms. You can call emergency services or notify your clinician immediately.</div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:8, marginBottom:6 }}>
              <a href="tel:1990" style={{ minHeight:46, display:'flex', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'10px 12px', borderRadius:10, background:'#ef4444', color:'#fff', fontWeight:800, textDecoration:'none', lineHeight:1.15, boxSizing:'border-box' }}>Call Emergency</a>
              <button disabled={notifyLoading} onClick={async () => {
                setNotifyLoading(true)
                setNotifyResult('')
                try {
                  const msg = `Urgent: ${patient.name || patient.hospital_id || 'patient'} reports red‑flag symptoms via Daily Check‑in.`
                  await api('/mobile/notify', { method: 'POST', body: { message: msg } })
                  setNotifyResult('Clinician notified')
                } catch (e) {
                  setNotifyResult('Unable to notify clinician')
                } finally {
                  setNotifyLoading(false)
                }
              }} style={{ minHeight:46, padding:'10px 12px', borderRadius:10, background:'#f97316', color:'#fff', fontWeight:800, border:'none', cursor:'pointer', lineHeight:1.15, boxSizing:'border-box' }}>{notifyLoading ? 'Notifying…' : 'Notify Clinician'}</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(2, minmax(0, 1fr))', gap:8 }}>
              <button disabled={submitting} onClick={async () => {
                // Submit then notify clinician if possible
                try {
                  await submit()
                } catch (e) {
                }
              }} style={{ minHeight:46, padding:'10px 12px', borderRadius:10, background:'#0f766e', color:'#fff', fontWeight:800, border:'none', cursor:'pointer', lineHeight:1.15, boxSizing:'border-box' }}>Submit Check‑in</button>
              <button disabled={notifyLoading || submitting} onClick={async () => {
                setNotifyLoading(true)
                setNotifyResult('')
                try {
                  const msg = `Urgent: ${patient.name || patient.hospital_id || 'patient'} reports red‑flag symptoms via Daily Check‑in.`
                  await api('/mobile/notify', { method: 'POST', body: { message: msg } })
                  // then submit
                  await submit()
                } catch (e) {
                  setNotifyResult('Failed to notify and submit')
                } finally {
                  setNotifyLoading(false)
                }
              }} style={{ minHeight:46, padding:'10px 12px', borderRadius:10, background:'#b91c1c', color:'#fff', fontWeight:800, border:'none', cursor:'pointer', lineHeight:1.15, boxSizing:'border-box' }}>Notify & Submit</button>
            </div>
            {notifyResult && <div style={{ marginTop:10, fontSize:13, color:'#334155' }}>{notifyResult}</div>}
          </div>
        )}

        {error && <div style={{ marginBottom:14, padding:'10px 12px', borderRadius:12, background:'#fef2f2', border:'1px solid #fecaca', color:'#b91c1c', fontSize:13 }}>{error}</div>}

        <div style={{ display:'flex', gap:10, marginTop:6 }}>
          <button onClick={back} disabled={step === 0 || submitting} style={{ flex:1, padding:'14px 12px', borderRadius:12, border:'1px solid #e2e8f0', background: step === 0 ? '#f8fafc' : '#fff', color:'#334155', fontWeight:700, cursor: step === 0 ? 'not-allowed' : 'pointer' }}>Back</button>
          {!isLast ? (
            <button onClick={next} disabled={!canProceed || submitting} style={{ flex:1, padding:'14px 12px', borderRadius:12, border:'none', background: canProceed ? '#0d9488' : '#d1d5db', color:'#fff', fontWeight:800, cursor: canProceed ? 'pointer' : 'not-allowed' }}>NEXT →</button>
          ) : (
            <button onClick={submit} disabled={!canProceed || submitting} style={{ flex:1, padding:'14px 12px', borderRadius:12, border:'none', background: canProceed ? '#0d9488' : '#d1d5db', color:'#fff', fontWeight:800, cursor: canProceed ? 'pointer' : 'not-allowed' }}>{submitting ? 'Submitting…' : 'SUBMIT CHECK-IN'}</button>
          )}
        </div>

        {latest && (
          <div style={{ marginTop:16, padding:'14px 16px', borderRadius:16, background:'#f0fdfa', border:'1px solid #ccfbf1' }}>
            <div style={{ fontSize:11, fontWeight:800, letterSpacing:'0.1em', textTransform:'uppercase', color:'#0f766e', marginBottom:6 }}>Last Submitted</div>
            <div style={{ fontSize:13, color:'#0f766e', lineHeight:1.7 }}>
              Score {latest.score} · {latest.level} · {latest.message}
            </div>
          </div>
        )}
        <button onClick={() => navigate('/home')} style={{ width:'100%', marginTop:18, padding:'14px 16px', border:'none', borderRadius:12, background:'#0d9488', color:'#fff', fontSize:14, fontWeight:800, cursor:'pointer' }}> Back to Home</button>
      </div>
    </div>
  )
}