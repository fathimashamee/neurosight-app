import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

function getContent(tumourType) {
  const t = (tumourType || '').toLowerCase()

  if (t.includes('no tumor') || t.includes('no tumour')) {
    return {
      name: 'No Tumour Found',
      accent: '#16a34a',
      accentBg: '#f0fdf4',
      icon: '✓',
      what: 'Your brain scan did not find a tumour. This is great news. Your doctor will continue to monitor your brain health with regular check-up scans to make sure everything stays well.',
      treated: 'No tumour treatment is needed. Your care team may recommend regular follow-up scans (usually every 6–12 months). Living a healthy lifestyle — good sleep, regular exercise, low stress — supports your brain health.',
      watchFor: [
        'New or worsening headaches',
        'Changes in vision or hearing',
        'Memory or thinking problems',
        'Unexplained nausea or dizziness',
        'Seizures of any kind',
        'Weakness or numbness in arms or legs',
      ],
      nutrition: 'Eat a balanced diet with plenty of fruits, vegetables, and whole grains. Stay hydrated (6–8 glasses of water daily). Regular light exercise like walking supports brain health. Avoid smoking and limit alcohol.',
      seekHelp: [
        'A sudden severe headache ("worst headache of your life")',
        'Seizure or convulsion (even a first one)',
        'Sudden loss of vision or ability to speak',
        'One-sided weakness or numbness that comes on suddenly',
        'Loss of consciousness',
      ],
    }
  }

  if (t.includes('glioblastoma') || (t.includes('glioma') && (t.includes('grade iv') || t.includes('grade iii') || t.includes('grade 4') || t.includes('grade 3')))) {
    return {
      name: 'High-Grade Glioma',
      accent: '#1d4ed8',
      accentBg: '#eff6ff',
      icon: 'G',
      what: 'A glioma is a tumour that starts in the glial cells — the supporting cells of the brain. High-grade gliomas (Grade III–IV, including Glioblastoma) grow faster and require prompt treatment. Your medical team will work with you closely throughout your care.',
      treated: 'Treatment usually involves:\n• Surgery — to remove as much of the tumour as safely possible\n• Radiation therapy — targeted rays to destroy remaining tumour cells\n• Chemotherapy — often temozolomide (TMZ) tablets taken alongside radiation\n• Regular MRI scans to monitor progress\n\nYour care team will create a personalised plan for you.',
      watchFor: [
        'Persistent headaches, especially in the morning',
        'Seizures (any type)',
        'Memory or concentration problems',
        'Difficulty speaking or finding words',
        'Vision changes or double vision',
        'Weakness on one side of the body',
        'Personality or mood changes',
        'Nausea and vomiting',
      ],
      nutrition: 'Good nutrition is especially important during treatment:\n• High-protein foods (eggs, fish, lean meat, lentils, chickpeas) help tissue repair\n• Eat plenty of colourful vegetables and fruits for antioxidants\n• Small, frequent meals if nausea is a problem\n• Stay well hydrated — at least 6–8 glasses of water daily\n• Avoid alcohol completely during chemotherapy\n• Ask your team about anti-nausea tips if needed',
      seekHelp: [
        'Sudden or worsening seizure',
        'Sudden severe headache',
        'Sudden loss of speech or vision',
        'High fever (could signal infection during chemo — call immediately)',
        'Extreme confusion or loss of consciousness',
        'Signs of deep vein thrombosis: calf pain, swelling, redness',
      ],
    }
  }

  if (t.includes('glioma') || t.includes('astrocytoma') || t.includes('oligodendroglioma')) {
    return {
      name: 'Glioma (Low-Grade)',
      accent: '#1d4ed8',
      accentBg: '#eff6ff',
      icon: 'G',
      what: 'A glioma is a tumour that grows from the glial cells — the supporting cells of the brain. Low-grade gliomas (Grade I–II) tend to grow slowly. Many people live well with careful monitoring and treatment when needed.',
      treated: 'Treatment depends on size, location, and symptoms. Options include:\n• Watchful waiting with regular MRI scans\n• Surgery when safe to remove the tumour\n• Radiation therapy\n• Chemotherapy (PCV or temozolomide)\n\nYour doctor will recommend the best approach for your situation.',
      watchFor: [
        'Seizures — often the first sign of a low-grade glioma',
        'Headaches that are new or getting worse',
        'Memory or concentration problems',
        'Weakness or numbness in limbs',
        'Vision or speech changes',
        'Fatigue that does not improve with rest',
      ],
      nutrition: 'During treatment, focus on:\n• Protein-rich foods to support recovery\n• Plenty of vegetables and fruits\n• Healthy fats: olive oil, avocado, nuts\n• Stay hydrated throughout the day\n• Avoid smoking and alcohol',
      seekHelp: [
        'New seizure or a change in your usual seizure pattern',
        'Sudden severe headache',
        'Sudden weakness, vision loss, or speech difficulty',
        'High fever if on chemotherapy',
        'Extreme confusion',
      ],
    }
  }

  if (t.includes('meningioma')) {
    return {
      name: 'Meningioma',
      accent: '#9333ea',
      accentBg: '#fdf4ff',
      icon: 'M',
      what: 'A meningioma grows from the meninges — the protective membranes that cover the brain and spinal cord. Most meningiomas are benign (not cancerous) and grow slowly. Many people live well with careful monitoring or treatment.',
      treated: 'Treatment depends on the size, location, and whether it causes symptoms:\n• Watchful waiting — small, slow-growing meningiomas may just be monitored with regular scans\n• Surgery — to remove the tumour when safe\n• Stereotactic radiosurgery (e.g. Gamma Knife) — a precise form of radiation, often used for smaller tumours\n\nMany patients do very well after treatment.',
      watchFor: [
        'Headaches that are new or gradually worsening',
        'Vision problems or hearing loss',
        'Weakness or numbness in arms or legs',
        'Seizures',
        'Memory or thinking problems',
        'Balance or coordination difficulties',
      ],
      nutrition: 'A healthy diet supports recovery:\n• Omega-3 rich foods (oily fish, flaxseed, walnuts) for brain health\n• Leafy greens (spinach, kale) for vitamins B and K\n• Colourful fruits and vegetables\n• Avoid high-sugar and processed foods\n• Limit caffeine if headaches are a problem',
      seekHelp: [
        'Sudden severe headache',
        'New or worsening seizure',
        'Sudden vision loss or double vision',
        'New weakness or numbness on one side',
        'Sudden confusion or loss of consciousness',
      ],
    }
  }

  if (t.includes('pituitary')) {
    return {
      name: 'Pituitary Tumour',
      accent: '#ea580c',
      accentBg: '#fff7ed',
      icon: 'P',
      what: 'A pituitary tumour grows in the pituitary gland — a small but vital gland at the base of the brain that controls many of your body\'s hormones. Most pituitary tumours are benign (non-cancerous) and are called adenomas. Treatment is usually very effective.',
      treated: 'Treatment depends on the type and size:\n• Medication — for hormone-secreting tumours (e.g. bromocriptine for prolactinomas, cabergoline)\n• Surgery — usually through the nose (transsphenoidal approach), minimal scarring\n• Radiation — for tumours that return or are not fully removed\n\nMany patients respond very well to treatment.',
      watchFor: [
        'Vision changes — especially loss of peripheral (side) vision',
        'Persistent headaches',
        'Unexplained weight gain or loss',
        'Extreme fatigue',
        'Irregular periods or fertility problems (women)',
        'Reduced sex drive',
        'Milk discharge from nipples (not related to pregnancy)',
        'Skin changes or muscle weakness (Cushing\'s)',
      ],
      nutrition: 'Your hormones affect metabolism and bone density:\n• Follow your doctor\'s dietary advice closely, especially around hormone replacement\n• Eat regular balanced meals to keep blood sugar stable\n• Calcium and vitamin D are important for bone health — ask your doctor\n• Stay hydrated\n• Maintain a healthy weight',
      seekHelp: [
        'Sudden severe headache with vision loss (pituitary apoplexy — emergency)',
        'Sudden blindness or double vision',
        'Extreme fatigue, very low blood pressure, or collapse',
        'Signs of an adrenal crisis: vomiting, severe weakness, confusion',
      ],
    }
  }

  return {
    name: 'Brain Tumour',
    accent: '#0d9488',
    accentBg: '#f0fdfa',
    icon: 'B',
    what: 'A brain tumour is an abnormal growth of cells in or around the brain. There are many different types. Your doctor has classified your condition and will create a personalised care plan tailored to you.',
    treated: 'Treatment depends on the type, size, grade, and location of the tumour. Common approaches include:\n• Surgery — to remove as much of the tumour as possible\n• Radiation therapy — targeted treatment to destroy tumour cells\n• Chemotherapy — medicines to slow or stop tumour growth\n\nThese are often used together. Your care team will guide you through every step.',
    watchFor: [
      'New or worsening headaches',
      'Seizures of any kind',
      'Changes in vision, hearing, or speech',
      'Memory or concentration problems',
      'Nausea and vomiting',
      'Weakness or numbness in limbs',
      'Personality or mood changes',
    ],
    nutrition: 'Good nutrition supports your body during treatment:\n• Eat protein-rich foods to help repair tissues (eggs, fish, lentils, meat)\n• Include fruits and vegetables for vitamins and antioxidants\n• Small frequent meals if you feel nauseous\n• Stay well hydrated — at least 6–8 glasses of water daily\n• Ask your care team about any specific dietary needs',
    seekHelp: [
      'A sudden severe headache unlike any before',
      'A new seizure or a change in your usual seizures',
      'Sudden loss of vision, speech, or movement',
      'High fever during treatment (possible infection — call immediately)',
      'Extreme confusion or loss of consciousness',
    ],
  }
}

function Section({ title, icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 16, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.03)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
        <span style={{ fontSize: 16 }}>{icon}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', flex: 1 }}>{title}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round"
          style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', flexShrink: 0 }}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>
      {open && (
        <div style={{ padding: '0 16px 16px', borderTop: '1px solid #f1f5f9' }}>
          {children}
        </div>
      )}
    </div>
  )
}

export default function Education() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const patient = JSON.parse(localStorage.getItem('mobile_patient') || '{}')
  const content = getContent(patient.tumour_type)

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc', fontFamily: "'DM Sans', sans-serif", display: 'flex', flexDirection: 'column' }}>
      <style>{`@keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }`}</style>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #0d9488 0%, #0f766e 100%)', padding: '48px 24px 28px', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -30, right: -30, width: 130, height: 130, borderRadius: '50%', background: 'rgba(255,255,255,0.07)', pointerEvents: 'none' }} />
        <button
          onClick={() => navigate('/home')}
          style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: 10, color: '#fff', padding: '6px 12px', fontSize: 12, cursor: 'pointer', marginBottom: 16, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          {t('education.back')}
        </button>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.65)', marginBottom: 6 }}>
          {t('education.title')}
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>{content.name}</div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.65)', marginTop: 4 }}>{t('education.yourDiagnosis')}</div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, padding: '20px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* Diagnosis badge */}
        <div style={{ background: content.accentBg, border: `1px solid ${content.accent}30`, borderRadius: 16, padding: '16px', display: 'flex', alignItems: 'center', gap: 14, animation: 'fadeUp 0.3s ease both' }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: content.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 800, flexShrink: 0 }}>
            {content.icon}
          </div>
          <div>
            <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600, marginBottom: 2 }}>{t('education.yourDiagnosis')}</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: '#1e293b' }}>{patient.tumour_type || content.name}</div>
          </div>
        </div>

        <Section title={t('education.whatIsIt')} icon="🧠">
          <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.7, margin: '12px 0 0' }}>{content.what}</p>
        </Section>

        <Section title={t('education.howTreated')} icon="💊">
          <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.7, margin: '12px 0 0', whiteSpace: 'pre-line' }}>{content.treated}</p>
        </Section>

        <Section title={t('education.watchFor')} icon="👁">
          <ul style={{ margin: '12px 0 0', padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {content.watchFor.map((item, i) => (
              <li key={i} style={{ fontSize: 13, color: '#334155', lineHeight: 1.6 }}>{item}</li>
            ))}
          </ul>
        </Section>

        <Section title={t('education.nutrition')} icon="🥗">
          <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.7, margin: '12px 0 0', whiteSpace: 'pre-line' }}>{content.nutrition}</p>
        </Section>

        <Section title={t('education.seekHelp')} icon="🚨">
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px', marginTop: 12 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              {t('education.seekHelpUrgent')}
            </div>
            <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {content.seekHelp.map((item, i) => (
                <li key={i} style={{ fontSize: 13, color: '#991b1b', lineHeight: 1.6 }}>{item}</li>
              ))}
            </ul>
          </div>
        </Section>

        {/* General note */}
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '12px 14px', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, marginTop: 2 }}>
            <circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>
          </svg>
          <p style={{ fontSize: 11, color: '#1e40af', margin: 0, lineHeight: 1.6 }}>{t('education.generalNote')}</p>
        </div>

      </div>
    </div>
  )
}
