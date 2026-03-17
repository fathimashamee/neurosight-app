import { useState, useCallback } from "react";
import { useOutletContext } from "react-router-dom";
import { api, setCurrentUser } from "../../../../util";

/* ─── Role meta ─────────────────────────────────────────────────── */
const ROLE_META = {
  Admin: {
    gradient: "from-violet-600 to-purple-700",
    accent: "violet",
    accentHex: "#7c3aed",
    lightBg: "bg-violet-50",
    border: "border-violet-200",
    badge: "bg-violet-100 text-violet-700",
    ring: "ring-violet-400",
    tab: "bg-violet-600 text-white",
    tabHover: "hover:bg-violet-50 hover:text-violet-700",
    label: "System Administrator",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    uniqueSections: [
      {
        id: "system",
        label: "System Preferences",
        icon: "⚙️",
        fields: [
          { key: "session_timeout", label: "Session Timeout (minutes)", type: "select", options: ["15", "30", "60", "120", "Never"] },
          { key: "audit_retention", label: "Audit Log Retention", type: "select", options: ["30 days", "60 days", "90 days", "1 year", "Indefinite"] },
          { key: "force_2fa", label: "Enforce 2FA for all users", type: "toggle" },
          { key: "allow_concurrent_sessions", label: "Allow concurrent sessions", type: "toggle" },
          { key: "maintenance_banner", label: "Show maintenance banner", type: "toggle" },
        ],
      },
      {
        id: "alerts",
        label: "Admin Alerts",
        icon: "🔔",
        fields: [
          { key: "alert_new_user", label: "New user registration", type: "toggle" },
          { key: "alert_failed_login", label: "Failed login (5+ attempts)", type: "toggle" },
          { key: "alert_deactivation", label: "Account deactivation event", type: "toggle" },
          { key: "alert_scan_anomaly", label: "Unusual scan volume spike", type: "toggle" },
          { key: "alert_email", label: "Alert delivery email", type: "text", placeholder: "admin@hospital.org" },
        ],
      },
    ],
  },

  Clinician: {
    gradient: "from-blue-600 to-cyan-600",
    accent: "blue",
    accentHex: "#2563eb",
    lightBg: "bg-blue-50",
    border: "border-blue-200",
    badge: "bg-blue-100 text-blue-700",
    ring: "ring-blue-400",
    tab: "bg-blue-600 text-white",
    tabHover: "hover:bg-blue-50 hover:text-blue-700",
    label: "Clinical Specialist",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
    uniqueSections: [
      {
        id: "workflow",
        label: "Clinical Workflow",
        icon: "🩺",
        fields: [
          { key: "default_patient_sort", label: "Default Patient Sort", type: "select", options: ["Most Recent", "Alphabetical", "Severity", "Admission Date"] },
          { key: "autosave_interval", label: "Report Auto-save Interval", type: "select", options: ["30 seconds", "1 minute", "2 minutes", "5 minutes", "Off"] },
          { key: "show_confidence", label: "Show AI confidence score on results", type: "toggle" },
          { key: "confirm_before_submit", label: "Confirm before submitting diagnosis", type: "toggle" },
          { key: "default_diagnosis_template", label: "Default Diagnosis Template", type: "select", options: ["Brain Tumor Protocol", "Glioma Pathway", "Meningioma Review", "Pituitary Adenoma", "Custom"] },
        ],
      },
      {
        id: "diagnostics",
        label: "Diagnostic Preferences",
        icon: "🧠",
        fields: [
          { key: "confidence_threshold", label: "Minimum Confidence Threshold (%)", type: "select", options: ["50%", "60%", "70%", "80%", "90%"] },
          { key: "highlight_critical", label: "Auto-highlight critical findings", type: "toggle" },
          { key: "second_opinion_prompt", label: "Prompt for second opinion on ambiguous cases", type: "toggle" },
          { key: "preferred_scan_view", label: "Preferred MRI View", type: "select", options: ["Axial", "Coronal", "Sagittal", "All views"] },
          { key: "priority_tags", label: "Default case priority tag", type: "select", options: ["Routine", "Urgent", "Emergency", "Follow-up"] },
        ],
      },
    ],
  },

  Assistant: {
    gradient: "from-teal-500 to-emerald-600",
    accent: "teal",
    accentHex: "#0d9488",
    lightBg: "bg-teal-50",
    border: "border-teal-200",
    badge: "bg-teal-100 text-teal-700",
    ring: "ring-teal-400",
    tab: "bg-teal-600 text-white",
    tabHover: "hover:bg-teal-50 hover:text-teal-700",
    label: "Clinical Assistant",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    uniqueSections: [
      {
        id: "scheduling",
        label: "Scheduling Preferences",
        icon: "📅",
        fields: [
          { key: "reminder_advance", label: "Appointment Reminder (advance)", type: "select", options: ["15 min", "30 min", "1 hour", "2 hours", "1 day"] },
          { key: "calendar_view", label: "Default Calendar View", type: "select", options: ["Day", "Week", "Month"] },
          { key: "show_cancelled", label: "Show cancelled appointments in list", type: "toggle" },
          { key: "auto_confirm", label: "Auto-confirm routine appointments", type: "toggle" },
          { key: "working_hours_start", label: "Working Hours Start", type: "select", options: ["06:00", "07:00", "08:00", "09:00"] },
        ],
      },
      {
        id: "documents",
        label: "Document & Records",
        icon: "📁",
        fields: [
          { key: "doc_format", label: "Preferred Document Export Format", type: "select", options: ["PDF", "DOCX", "CSV", "JSON"] },
          { key: "patient_name_format", label: "Patient Name Display Format", type: "select", options: ["First Last", "Last, First", "Last F.", "Full Name"] },
          { key: "auto_archive", label: "Auto-archive discharged patient records", type: "toggle" },
          { key: "show_patient_photo", label: "Show patient photo in records", type: "toggle" },
          { key: "records_per_page", label: "Records Per Page", type: "select", options: ["10", "20", "50", "100"] },
        ],
      },
    ],
  },

  Technician: {
    gradient: "from-orange-500 to-amber-600",
    accent: "orange",
    accentHex: "#ea580c",
    lightBg: "bg-orange-50",
    border: "border-orange-200",
    badge: "bg-orange-100 text-orange-700",
    ring: "ring-orange-400",
    tab: "bg-orange-600 text-white",
    tabHover: "hover:bg-orange-50 hover:text-orange-700",
    label: "Radiology Technician",
    icon: (
      <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
      </svg>
    ),
    uniqueSections: [
      {
        id: "scanning",
        label: "Scan & Upload Settings",
        icon: "🖥️",
        fields: [
          { key: "auto_classify", label: "Auto-run AI classification on upload", type: "toggle" },
          { key: "default_format", label: "Default MRI Format", type: "select", options: ["DICOM", "NIfTI", "JPEG", "PNG", "TIFF"] },
          { key: "image_resolution", label: "Preferred Resolution", type: "select", options: ["256×256", "512×512", "1024×1024", "Original"] },
          { key: "compression", label: "Upload Compression", type: "select", options: ["None", "Lossless", "Lossy (25%)", "Lossy (50%)"] },
          { key: "file_naming", label: "File Naming Convention", type: "select", options: ["PatientID_Date", "PatientName_ScanType", "UUID", "Custom"] },
        ],
      },
      {
        id: "equipment",
        label: "Equipment & Quality",
        icon: "🔬",
        fields: [
          { key: "scanner_model", label: "Primary Scanner Model", type: "text", placeholder: "e.g. Siemens MAGNETOM 3T" },
          { key: "quality_threshold", label: "Minimum Image Quality Score", type: "select", options: ["50%", "60%", "70%", "80%", "95%"] },
          { key: "flag_low_quality", label: "Flag and hold low-quality scans", type: "toggle" },
          { key: "noise_reduction", label: "Apply noise reduction pre-processing", type: "toggle" },
          { key: "calibration_reminder", label: "Equipment calibration reminder interval", type: "select", options: ["Daily", "Weekly", "Monthly", "Quarterly"] },
        ],
      },
    ],
  },
};

const DEFAULT_PREFS = {
  theme: "light",
  density: "comfortable",
  language: "English",
  date_format: "DD/MM/YYYY",
  email_digest: false,
  browser_notifications: true,
  sound_alerts: false,
  notify_scan_complete: true,
  notify_report_ready: true,
  notify_system: false,
};

/* ─── Sub-components ─────────────────────────────────────────────── */
function Toggle({ value, onChange, accentHex }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={`relative inline-flex h-6 w-12 items-center rounded-full transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${value ? "" : "bg-slate-200"}`}
      style={value ? { backgroundColor: accentHex, boxShadow: `0 0 0 2px ${accentHex}33` } : {}}
    >
      <span className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md transition-transform duration-200 ${value ? "translate-x-6" : "translate-x-0.5"}`} />
    </button>
  );
}

function SectionCard({ title, desc, icon, accentHex, lightBg, borderColor, children }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden mb-5">
      <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100" style={{ background: lightBg }}>
        <span className="text-xl">{icon}</span>
        <div>
          <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
          {desc && <p className="text-[11px] text-slate-400 mt-0.5">{desc}</p>}
        </div>
      </div>
      <div className="px-6 py-2">{children}</div>
    </div>
  );
}

function FieldRow({ label, sublabel, children }) {
  return (
    <div className="flex items-center justify-between py-3.5 border-b border-slate-50 last:border-0">
      <div>
        <span className="text-sm text-slate-700 font-medium">{label}</span>
        {sublabel && <p className="text-[11px] text-slate-400 mt-0.5">{sublabel}</p>}
      </div>
      <div className="ml-6 flex-shrink-0">{children}</div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label, accentHex }) {
  return (
    <button
      onClick={onClick}
      className="relative flex items-center gap-2 px-4 py-3 text-sm font-semibold transition-all whitespace-nowrap"
      style={active ? { color: accentHex, borderBottom: `2.5px solid ${accentHex}` } : { color: "#64748b", borderBottom: "2.5px solid transparent" }}
    >
      <span>{icon}</span>
      {label}
      {active && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full" style={{ backgroundColor: accentHex }} />}
    </button>
  );
}

function StyledInput({ value, onChange, placeholder, readOnly, onBlur }) {
  return (
    <input
      className={`w-full border rounded-xl px-4 py-2.5 text-sm transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 ${readOnly ? "bg-slate-50 border-slate-100 text-slate-400 cursor-not-allowed" : "border-slate-200 bg-white text-slate-800 hover:border-slate-300"}`}
      value={value}
      onChange={onChange}
      onBlur={onBlur}
      placeholder={placeholder}
      readOnly={readOnly}
    />
  );
}

function StyledSelect({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={onChange}
      className="text-sm border border-slate-200 rounded-xl px-3 py-2 bg-white focus:outline-none hover:border-slate-300 transition-colors min-w-[140px]"
    >
      {options.map((o) => <option key={o}>{o}</option>)}
    </select>
  );
}

/* ─── Main Component ─────────────────────────────────────────────── */
export default function PersonalizedSettings() {
  const { user } = useOutletContext();
  const rawRole = user?.role || "Clinician";
  const meta = ROLE_META[rawRole] || ROLE_META["Clinician"];

  const PREFS_KEY = `prefs_${user?.id}`;

  /* state */
  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState({ name: user?.name || "", mobile: user?.mobile || "" });
  const [pwdForm, setPwdForm] = useState({ current: "", next: "", confirm: "" });
  const [prefs, setPrefs] = useState(() => {
    try { return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || "{}") }; }
    catch { return { ...DEFAULT_PREFS }; }
  });
  const [rolePrefs, setRolePrefs] = useState(() => {
    try { return JSON.parse(localStorage.getItem(`${PREFS_KEY}_role`) || "{}"); }
    catch { return {}; }
  });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (msg, type = "success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const savePrefs = useCallback((updated) => {
    localStorage.setItem(PREFS_KEY, JSON.stringify(updated));
    setPrefs(updated);
    showToast("Display preferences saved");
  }, [PREFS_KEY]);

  const saveRolePrefs = useCallback((updated) => {
    localStorage.setItem(`${PREFS_KEY}_role`, JSON.stringify(updated));
    setRolePrefs(updated);
    showToast("Settings saved");
  }, [PREFS_KEY]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const updated = await api("/auth/me", { method: "PUT", body: { name: profile.name, mobile: profile.mobile } });
      setCurrentUser(updated);
      showToast("Profile updated successfully");
    } catch (e) {
      showToast("Failed to update profile", "error");
    } finally { setSaving(false); }
  };

  const changePassword = async () => {
    if (pwdForm.next !== pwdForm.confirm) return showToast("New passwords do not match", "error");
    if (pwdForm.next.length < 8) return showToast("Password must be at least 8 characters", "error");
    setSaving(true);
    try {
      await api("/auth/me", { method: "PUT", body: { current_password: pwdForm.current, new_password: pwdForm.next } });
      setPwdForm({ current: "", next: "", confirm: "" });
      showToast("Password changed successfully");
    } catch (e) {
      showToast("Incorrect current password", "error");
    } finally { setSaving(false); }
  };

  /* ── Tab list ── */
  const tabs = [
    { id: "profile",       label: "Profile",       emoji: "👤" },
    { id: "notifications", label: "Notifications",  emoji: "🔔" },
    ...meta.uniqueSections.map((s) => ({ id: s.id, label: s.label, emoji: s.icon })),
    { id: "security",      label: "Security",       emoji: "🔒" },
  ];

  /* ── Role-section renderer ── */
  const renderRoleSection = (section) => (
    <>
      {section.fields.map((f) => (
        <FieldRow key={f.key} label={f.label}>
          {f.type === "toggle" ? (
            <Toggle value={!!rolePrefs[f.key]} onChange={(v) => saveRolePrefs({ ...rolePrefs, [f.key]: v })} accentHex={meta.accentHex} />
          ) : f.type === "select" ? (
            <StyledSelect
              value={rolePrefs[f.key] || f.options[0]}
              onChange={(e) => saveRolePrefs({ ...rolePrefs, [f.key]: e.target.value })}
              options={f.options}
            />
          ) : (
            <StyledInput
              value={rolePrefs[f.key] || ""}
              placeholder={f.placeholder}
              onChange={(e) => setRolePrefs((r) => ({ ...r, [f.key]: e.target.value }))}
              onBlur={() => saveRolePrefs(rolePrefs)}
            />
          )}
        </FieldRow>
      ))}
    </>
  );

  /* ── Avatar initials ── */
  const initials = (user?.name || user?.email || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="max-w-5xl mx-auto pb-12">

      {/* ── Toast notification ── */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold border transition-all animate-pulse
          ${toast.type === "error" ? "bg-red-600 border-red-500 text-white" : "bg-emerald-600 border-emerald-500 text-white"}`}>
          <span className="text-lg">{toast.type === "error" ? "⚠️" : "✅"}</span>
          {toast.msg}
        </div>
      )}

      {/* ── Profile Hero Card ── */}
      <div className={`relative rounded-3xl bg-gradient-to-br ${meta.gradient} text-white overflow-hidden mb-8 shadow-xl`}>
        {/* decorative circles */}
        <div className="absolute w-72 h-72 bg-white/5 rounded-full -top-20 -right-20 pointer-events-none" />
        <div className="absolute w-40 h-40 bg-white/5 rounded-full bottom-0 left-1/2 pointer-events-none" />
        <div className="absolute w-20 h-20 bg-white/10 rounded-full -bottom-4 right-64 pointer-events-none" />

        <div className="relative z-10 p-7 flex items-center gap-6">
          {/* Avatar */}
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-white/20 border-2 border-white/40 flex items-center justify-center text-2xl font-black shadow-lg backdrop-blur-sm">
              {initials}
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-2 border-white shadow" title="Active" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-xl font-black tracking-tight truncate">{user?.name || "—"}</h1>
              <span className="px-3 py-1 rounded-full bg-white/20 border border-white/30 text-xs font-bold backdrop-blur-sm">
                {rawRole}
              </span>
            </div>
            <p className="text-white/70 text-sm mt-1 truncate">{user?.email}</p>
            <p className="text-white/50 text-xs mt-1">{meta.label} · NeuroSight AI</p>
          </div>

          {/* Role icon */}
          <div className="w-14 h-14 bg-white/15 rounded-2xl flex items-center justify-center border border-white/20 backdrop-blur-sm hidden md:flex">
            {meta.icon}
          </div>
        </div>

        {/* Tab Bar inside hero */}
        <div className="relative z-10 flex border-t border-white/10 bg-white/5 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold whitespace-nowrap transition-all
                ${activeTab === t.id
                  ? "bg-white/20 text-white border-b-2 border-white"
                  : "text-white/60 hover:text-white hover:bg-white/10 border-b-2 border-transparent"}`}
            >
              <span className="text-base leading-none">{t.emoji}</span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Content Area ── */}
      <div className="space-y-5">

        {/* ═══ PROFILE TAB ═══ */}
        {activeTab === "profile" && (
          <>
            <SectionCard
              title="Personal Information"
              desc="Saved to your account on the server"
              icon="👤"
              accentHex={meta.accentHex}
              lightBg={meta.lightBg}
              borderColor={meta.border}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2 pb-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Full Name</label>
                  <StyledInput value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} placeholder="Your full name" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Mobile Number</label>
                  <StyledInput value={profile.mobile} onChange={(e) => setProfile((p) => ({ ...p, mobile: e.target.value }))} placeholder="+1 555 000 0000" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
                  <StyledInput value={user?.email || ""} readOnly />
                  <p className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">🔒 Email is managed by admin</p>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Role</label>
                  <div className={`flex items-center gap-2.5 px-4 py-2.5 rounded-xl border ${meta.border} ${meta.lightBg}`}>
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${meta.badge}`}>{rawRole}</span>
                    <span className="text-xs text-slate-400">assigned by admin</span>
                  </div>
                </div>
              </div>
              <div className="pt-2 pb-4 border-t border-slate-50">
                <button
                  onClick={saveProfile}
                  disabled={saving}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-50 shadow-md"
                  style={{ backgroundColor: meta.accentHex, boxShadow: `0 4px 14px ${meta.accentHex}44` }}
                >
                  {saving ? <><span className="animate-spin">⟳</span> Saving…</> : <><span>💾</span> Save Changes</>}
                </button>
              </div>
            </SectionCard>
          </>
        )}

        {/* ═══ NOTIFICATIONS TAB ═══ */}
        {activeTab === "notifications" && (
          <SectionCard title="Notification Preferences" desc="Control how and when you receive alerts" icon="🔔" accentHex={meta.accentHex} lightBg={meta.lightBg}>
            {[
              { key: "email_digest",          label: "Daily email digest",            desc: "A morning summary of all platform activity" },
              { key: "browser_notifications", label: "Browser push notifications",    desc: "Desktop alerts while using the app" },
              { key: "sound_alerts",          label: "Sound alerts",                  desc: "Audio cue for incoming notifications" },
              { key: "notify_scan_complete",  label: "Scan classification complete",  desc: "When AI finishes analysing an MRI upload" },
              { key: "notify_report_ready",   label: "Report ready for review",       desc: "When a clinician submits a completed report" },
              { key: "notify_system",         label: "System & maintenance notices",  desc: "Scheduled downtime and platform updates" },
            ].map(({ key, label, desc }) => (
              <FieldRow key={key} label={label} sublabel={desc}>
                <Toggle value={!!prefs[key]} onChange={(v) => savePrefs({ ...prefs, [key]: v })} accentHex={meta.accentHex} />
              </FieldRow>
            ))}
          </SectionCard>
        )}

        {/* ═══ ROLE-SPECIFIC TABS ═══ */}
        {meta.uniqueSections.map((section) =>
          activeTab === section.id ? (
            <div key={section.id}>
              {/* Role-exclusive badge */}
              <div className={`flex items-center gap-2 mb-4 px-4 py-2.5 rounded-xl border ${meta.border} ${meta.lightBg}`}>
                <span className={`px-2.5 py-1 rounded-full text-xs font-black ${meta.badge}`}>✦ {rawRole}-exclusive</span>
                <span className="text-xs text-slate-500">These settings are tailored specifically for your role</span>
              </div>
              <SectionCard title={section.label} icon={section.icon} accentHex={meta.accentHex} lightBg={meta.lightBg}>
                {renderRoleSection(section)}
              </SectionCard>
            </div>
          ) : null
        )}

        {/* ═══ SECURITY TAB ═══ */}
        {activeTab === "security" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Password change */}
            <SectionCard title="Change Password" desc="Update your account password" icon="🔑" accentHex={meta.accentHex} lightBg={meta.lightBg}>
              <div className="space-y-4 pt-2 pb-4">
                {[
                  { key: "current", label: "Current Password",     placeholder: "Your current password" },
                  { key: "next",    label: "New Password",          placeholder: "At least 8 characters" },
                  { key: "confirm", label: "Confirm New Password",  placeholder: "Repeat new password" },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">{label}</label>
                    <input
                      type="password"
                      value={pwdForm[key]}
                      onChange={(e) => setPwdForm((f) => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 hover:border-slate-300 transition-colors"
                    />
                  </div>
                ))}
                <button
                  onClick={changePassword}
                  disabled={saving || !pwdForm.current || !pwdForm.next || !pwdForm.confirm}
                  className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-40 shadow-md"
                  style={{ backgroundColor: meta.accentHex }}
                >
                  {saving ? "Updating…" : "Update Password"}
                </button>
              </div>
            </SectionCard>

            {/* Security info */}
            <div className="space-y-5">
              <SectionCard title="Password Requirements" icon="✅" accentHex={meta.accentHex} lightBg={meta.lightBg}>
                <ul className="space-y-2.5 py-3">
                  {[
                    { ok: true,  txt: "Minimum 8 characters" },
                    { ok: true,  txt: "Mix of letters and numbers" },
                    { ok: false, txt: "Avoid reusing previous passwords" },
                    { ok: false, txt: "Do not share your password" },
                  ].map(({ ok, txt }, i) => (
                    <li key={i} className="flex items-center gap-2.5 text-sm text-slate-600">
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${ok ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                        {ok ? "✓" : "○"}
                      </span>
                      {txt}
                    </li>
                  ))}
                </ul>
              </SectionCard>

              <SectionCard title="Session Info" icon="🛡️" accentHex={meta.accentHex} lightBg={meta.lightBg}>
                <div className="py-3 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Account status</span>
                    <span className="font-bold text-emerald-600 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Active</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Assigned role</span>
                    <span className={`font-bold ${meta.badge.split(" ")[1]}`}>{rawRole}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Auth method</span>
                    <span className="font-bold text-slate-700">Password + JWT</span>
                  </div>
                </div>
              </SectionCard>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
