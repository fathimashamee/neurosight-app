import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { api } from '../api'

function statusStyle(status) {
  if (status === 'Active')    return { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' }
  if (status === 'Completed') return { bg: '#eff6ff', text: '#1e40af', border: '#bfdbfe' }
  return { bg: '#f8fafc', text: '#475569', border: '#e2e8f0' }
}

export default function Report() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const patient = JSON.parse(localStorage.getItem('mobile_patient') || '{}')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/mobile/report')
      .then(d => setData(d))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  const scan  = data?.scan
  const plans = data?.treatment_plans || []

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column' }}>
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }`}</style>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)', padding: '48px 24px 28px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
        <button
          onClick={() => navigate('/home')}
          style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10, color: '#fff', padding: '6px 12px', fontSize: 12, cursor: 'pointer', marginBottom: 16, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {t('report.back')}
        </button>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', marginBottom: 6 }}>
          {t('report.title')}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{patient.name || '—'}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 4, fontFamily: "'DM Mono', monospace" }}>{patient.hospital_id || '—'}</div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: '#94a3b8', fontSize: 13 }}>{t('report.loading')}</div>
        ) : (
          <>
            {/* Scan result card */}
            {!scan ? (
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '32px 20px', textAlign: 'center', animation: 'fadeUp 0.4s ease both' }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h4"/>
                  </svg>
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#475569', marginBottom: 6 }}>{t('report.noScan')}</div>
                <div style={{ fontSize: 12, color: '#94a3b8', lineHeight: 1.6 }}>{t('report.noScanSub')}</div>
              </div>
            ) : (
              <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '18px', animation: 'fadeUp 0.4s ease both', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 14 }}>
                  {t('report.scanResults')}
                </div>

                {/* Main diagnosis banner */}
                <div style={{ background: 'linear-gradient(135deg, #f0fdfa, #e6faf8)', border: '1px solid #99f6e4', borderRadius: 12, padding: '16px', marginBottom: 14, textAlign: 'center' }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 6 }}>
                    {scan.doctor_confirmed ? t('report.doctorConfirmed') : t('report.aiPrediction')}
                  </div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>{scan.final_label || '—'}</div>
                  {scan.pathology_grade && (
                    <div style={{ fontSize: 13, color: '#475569', marginTop: 4 }}>Grade {scan.pathology_grade}</div>
                  )}
                </div>

                {/* Detail rows */}
                {[
                  !scan.doctor_confirmed && scan.ai_prediction  && [t('report.aiPrediction'),    scan.ai_prediction],
                  !scan.doctor_confirmed                         && [t('report.awaitingReview'),  t('report.awaitingReviewSub')],
                  scan.confidence != null                        && [t('report.aiConfidence'),    `${scan.confidence}%`],
                  scan.pathology_grade                           && [t('report.pathologyGrade'),  `Grade ${scan.pathology_grade}`],
                  scan.scanned_at                                && [t('report.scannedOn'),       new Date(scan.scanned_at).toLocaleDateString()],
                ].filter(Boolean).map(([label, value], i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderTop: '1px solid #f1f5f9' }}>
                    <span style={{ fontSize: 12, color: '#64748b' }}>{label}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', textAlign: 'right', maxWidth: '55%', lineHeight: 1.4 }}>{value}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Treatment plans */}
            <div style={{ animation: 'fadeUp 0.4s ease 0.1s both' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: '#94a3b8', marginBottom: 10 }}>
                {t('report.treatmentPlans')}
              </div>
              {plans.length === 0 ? (
                <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '20px', textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
                  {t('report.noPlans')}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {plans.map(plan => {
                    const sc = statusStyle(plan.status)
                    return (
                      <div key={plan.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, padding: '16px', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b', flex: 1, marginRight: 8 }}>{plan.title}</div>
                          <span style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: 20, padding: '2px 8px', fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap', flexShrink: 0 }}>
                            {plan.status}
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 10 }}>
                          {plan.plan_type}{plan.plan_date ? ` · ${plan.plan_date}` : ''}
                          {plan.created_by_name ? ` · ${plan.created_by_name}` : ''}
                        </div>
                        {[
                          plan.medications      && [t('report.medications'),     plan.medications],
                          plan.therapy_schedule && [t('report.therapySchedule'), plan.therapy_schedule],
                          plan.surgery_details  && [t('report.surgeryDetails'),  plan.surgery_details],
                          plan.notes            && [t('report.notes'),           plan.notes],
                        ].filter(Boolean).map(([label, value], i) => (
                          <div key={i} style={{ paddingTop: 8, borderTop: '1px solid #f1f5f9' }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{label}</div>
                            <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.6 }}>{value}</div>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Footer note */}
            <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 8, alignItems: 'flex-start', animation: 'fadeUp 0.4s ease 0.2s both' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 2 }}>
                <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
              </svg>
              <p style={{ fontSize: 11, color: '#1e40af', margin: 0, lineHeight: 1.6 }}>{t('report.footerNote')}</p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
