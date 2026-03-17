import { useState, useEffect, useMemo, useRef } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../../../../util';

// ── Constants ────────────────────────────────────────────────────────────────
const PLAN_TYPES = ['Medication', 'Therapy', 'Surgery', 'Follow-up'];
const STATUSES   = ['Active', 'Completed', 'Cancelled'];

const TYPE_META = {
  Medication:   { icon: '💊', color: 'bg-blue-100 text-blue-700 border-blue-200',       dot: 'bg-blue-500' },
  Therapy:      { icon: '🧠', color: 'bg-violet-100 text-violet-700 border-violet-200', dot: 'bg-violet-500' },
  Surgery:      { icon: '🏥', color: 'bg-red-100 text-red-700 border-red-200',          dot: 'bg-red-500' },
  'Follow-up':  { icon: '📅', color: 'bg-teal-100 text-teal-700 border-teal-200',       dot: 'bg-teal-500' },
};

const STATUS_META = {
  Active:    { color: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' },
  Completed: { color: 'bg-slate-100 text-slate-500 border-slate-200',       dot: 'bg-slate-400' },
  Cancelled: { color: 'bg-red-100 text-red-500 border-red-200',             dot: 'bg-red-400' },
};

function typeMeta(t)   { return TYPE_META[t]   || TYPE_META['General']; }
function statusMeta(s) { return STATUS_META[s] || STATUS_META['Active']; }

// ── Reusable sub-components ───────────────────────────────────────────────────
function TypeBadge({ type }) {
  const m = typeMeta(type);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${m.color}`}>
      {m.icon} {type}
    </span>
  );
}

function StatusBadge({ status }) {
  const m = statusMeta(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${m.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {status}
    </span>
  );
}

function SectionLabel({ children }) {
  return (
    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
      {children}
    </label>
  );
}

function Textarea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows}
      className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 hover:border-slate-300 transition-colors"
    />
  );
}

// ── Plan Form (create / edit) ─────────────────────────────────────────────────
const EMPTY_FORM = {
  plan_date: new Date().toISOString().slice(0, 10),
  plan_type: 'Medication',
  title: '',
  medications: '',
  therapy_schedule: '',
  surgery_details: '',
  notes: '',
  status: 'Active',
};

function PlanForm({ patients, initial, onSave, onCancel, saving }) {
  const [form, setForm] = useState(initial || { ...EMPTY_FORM });
  const [error, setError] = useState('');

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.patient_id) return setError('Please select a patient.');
    if (!form.title.trim()) return setError('Plan title is required.');
    setError('');
    onSave(form);
  };

  // Show detail fields based on plan type
  const showMed  = form.plan_type === 'Medication';
  const showTher = form.plan_type === 'Therapy';
  const showSurg = form.plan_type === 'Surgery';

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Patient + Date */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <SectionLabel>Patient *</SectionLabel>
          <select
            value={form.patient_id || ''}
            onChange={set('patient_id')}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
          >
            <option value="">— Select patient —</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.hospital_id})</option>
            ))}
          </select>
        </div>
        <div>
          <SectionLabel>Plan Date *</SectionLabel>
          <input
            type="date"
            value={form.plan_date}
            onChange={set('plan_date')}
            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
        </div>
      </div>

      {/* Plan Type */}
      <div>
        <SectionLabel>Plan Type</SectionLabel>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
          {PLAN_TYPES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setForm((f) => ({ ...f, plan_type: t }))}
              className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border text-xs font-semibold transition-all
                ${form.plan_type === t
                  ? 'border-indigo-400 bg-indigo-50 text-indigo-700'
                  : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
            >
              <span className="text-xl">{typeMeta(t).icon}</span>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div>
        <SectionLabel>Title / Summary *</SectionLabel>
        <input
          value={form.title}
          onChange={set('title')}
          placeholder="e.g. Post-surgery Temozolomide course — Week 1"
          className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 hover:border-slate-300 transition-colors"
        />
      </div>

      {/* Type-specific fields */}
      {showMed && (
        <div>
          <SectionLabel>Medications</SectionLabel>
          <Textarea
            value={form.medications}
            onChange={set('medications')}
            placeholder="Drug name · Dosage · Frequency · Duration&#10;e.g. Temozolomide 150 mg/m² · oral · days 1–5 of 28-day cycle"
            rows={3}
          />
        </div>
      )}
      {showTher && (
        <div>
          <SectionLabel>Therapy Schedule</SectionLabel>
          <Textarea
            value={form.therapy_schedule}
            onChange={set('therapy_schedule')}
            placeholder="Therapy type · Sessions · Frequency&#10;e.g. Radiotherapy 60 Gy · 30 fractions · 5× per week"
            rows={3}
          />
        </div>
      )}
      {showSurg && (
        <div>
          <SectionLabel>Surgery Details</SectionLabel>
          <Textarea
            value={form.surgery_details}
            onChange={set('surgery_details')}
            placeholder="Procedure · Surgeon · Scheduled date · Pre-op instructions"
            rows={3}
          />
        </div>
      )}

      {/* Notes */}
      <div>
        <SectionLabel>Additional Notes</SectionLabel>
        <Textarea
          value={form.notes}
          onChange={set('notes')}
          placeholder="Any clinical observations, contraindications, follow-up instructions…"
          rows={3}
        />
      </div>

      {/* Status (edit mode only) */}
      {initial && (
        <div>
          <SectionLabel>Status</SectionLabel>
          <div className="flex gap-2">
            {STATUSES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setForm((f) => ({ ...f, status: s }))}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl border text-xs font-semibold transition-all
                  ${form.status === s
                    ? `${statusMeta(s).color} border-current`
                    : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
              >
                <span className={`w-2 h-2 rounded-full ${statusMeta(s).dot}`} />
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-2 border-t border-slate-100">
        <button type="button" onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-bold hover:bg-indigo-700 transition disabled:opacity-50 shadow-md shadow-indigo-200"
        >
          {saving ? '⟳ Saving…' : initial ? '✔ Update Plan' : '➕ Create Plan'}
        </button>
      </div>
    </form>
  );
}

// ── Plan Card ─────────────────────────────────────────────────────────────────
function PlanCard({ plan, onEdit, onDelete, expanded, onToggle }) {
  return (
    <div
      className={`bg-white rounded-2xl border transition-all shadow-sm hover:shadow-md
        ${expanded ? 'border-indigo-200' : 'border-slate-100'}`}
    >
      {/* Header row */}
      <div
        className="flex items-center gap-3 px-5 py-4 cursor-pointer"
        onClick={onToggle}
      >
        {/* Type icon */}
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 border ${typeMeta(plan.plan_type).color}`}>
          {typeMeta(plan.plan_type).icon}
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-800 text-sm truncate">{plan.title}</p>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <TypeBadge type={plan.plan_type} />
            <StatusBadge status={plan.status} />
            <span className="text-[11px] text-slate-400">📅 {plan.plan_date}</span>
            {plan.created_by_name && (
              <span className="text-[11px] text-slate-400">· 👤 {plan.created_by_name}</span>
            )}
          </div>
        </div>

        {/* Chevron */}
        <svg
          className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${expanded ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-slate-100 px-5 py-4 space-y-4">
          {plan.medications && (
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">💊 Medications</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap bg-blue-50 rounded-xl px-4 py-3 border border-blue-100">{plan.medications}</p>
            </div>
          )}
          {plan.therapy_schedule && (
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">🧠 Therapy Schedule</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap bg-violet-50 rounded-xl px-4 py-3 border border-violet-100">{plan.therapy_schedule}</p>
            </div>
          )}
          {plan.surgery_details && (
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">🔪 Surgery Details</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap bg-red-50 rounded-xl px-4 py-3 border border-red-100">{plan.surgery_details}</p>
            </div>
          )}
          {plan.notes && (
            <div>
              <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">📝 Notes</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap bg-slate-50 rounded-xl px-4 py-3 border border-slate-100">{plan.notes}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button onClick={() => onEdit(plan)} className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-indigo-200 text-xs font-semibold text-indigo-600 hover:bg-indigo-50 transition">
              ✏️ Edit Plan
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
            >
              🖨 Print
            </button>
            <button onClick={() => onDelete(plan.id)} className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl border border-red-200 text-xs font-semibold text-red-500 hover:bg-red-50 transition">
              🗑 Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function TreatmentPlan() {
  const { user } = useOutletContext();

  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [plans, setPlans] = useState([]);
  const [loadingPatients, setLoadingPatients] = useState(true);
  const [loadingPlans, setLoadingPlans] = useState(false);
  const [saving, setSaving] = useState(false);

  // UI state
  const [mode, setMode] = useState(null); // null | 'create' | 'edit'
  const [editPlan, setEditPlan] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [toast, setToast] = useState(null);

  // Filters
  const [search, setSearch]           = useState('');
  const [filterType, setFilterType]   = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [patientSearch, setPatientSearch] = useState('');

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    api('/patients').then(setPatients).catch(console.error).finally(() => setLoadingPatients(false));
  }, []);

  const loadPlans = (patientId) => {
    setLoadingPlans(true);
    api(`/treatment-plans/patient/${patientId}`)
      .then(setPlans)
      .catch(console.error)
      .finally(() => setLoadingPlans(false));
  };

  const handleSelectPatient = (p) => {
    setSelectedPatient(p);
    setMode(null);
    setEditPlan(null);
    setExpandedId(null);
    setSearch('');
    setFilterType('All');
    setFilterStatus('All');
    loadPlans(p.id);
  };

  const handleCreate = async (formData) => {
    setSaving(true);
    try {
      const created = await api('/treatment-plans', { method: 'POST', body: { ...formData, patient_id: selectedPatient.id } });
      setPlans((prev) => [created, ...prev]);
      setMode(null);
      showToast('Treatment plan created successfully');
    } catch {
      showToast('Failed to create plan', 'error');
    } finally { setSaving(false); }
  };

  const handleUpdate = async (formData) => {
    setSaving(true);
    try {
      const updated = await api(`/treatment-plans/${editPlan.id}`, { method: 'PUT', body: formData });
      setPlans((prev) => prev.map((p) => p.id === editPlan.id ? updated : p));
      setMode(null);
      setEditPlan(null);
      showToast('Plan updated successfully');
    } catch {
      showToast('Failed to update plan', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await api(`/treatment-plans/${id}`, { method: 'DELETE' });
      setPlans((prev) => prev.filter((p) => p.id !== id));
      setDeleteId(null);
      showToast('Plan deleted');
    } catch {
      showToast('Failed to delete plan', 'error');
    }
  };

  // Filtered list
  const filtered = useMemo(() => {
    return plans.filter((p) => {
      const matchSearch = search.trim() === '' ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        (p.medications || '').toLowerCase().includes(search.toLowerCase()) ||
        (p.notes || '').toLowerCase().includes(search.toLowerCase());
      const matchType   = filterType === 'All' || p.plan_type === filterType;
      const matchStatus = filterStatus === 'All' || p.status === filterStatus;
      return matchSearch && matchType && matchStatus;
    });
  }, [plans, search, filterType, filterStatus]);

  // Group by date for timeline
  const byDate = useMemo(() => {
    const groups = {};
    filtered.forEach((p) => {
      const key = p.plan_date || 'Unknown';
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    });
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  // Stats
  const stats = useMemo(() => {
    const active    = plans.filter((p) => p.status === 'Active').length;
    const completed = plans.filter((p) => p.status === 'Completed').length;
    const types     = {};
    plans.forEach((p) => { types[p.plan_type] = (types[p.plan_type] || 0) + 1; });
    return { active, completed, total: plans.length, types };
  }, [plans]);

  const filteredPatients = patients.filter(p =>
    (p.name || '').toLowerCase().includes(patientSearch.toLowerCase()) ||
    (p.hospital_id || '').toLowerCase().includes(patientSearch.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto pb-12">

      {/* Toast */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl text-sm font-semibold border
          ${toast.type === 'error' ? 'bg-red-600 border-red-500 text-white' : 'bg-emerald-600 border-emerald-500 text-white'}`}>
          {toast.type === 'error' ? '⚠️' : '✅'} {toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Treatment Plans</h1>
          <p className="text-sm text-slate-500 mt-1">Create, track and manage patient treatment plans</p>
        </div>
        {selectedPatient && mode === null && (
          <button
            onClick={() => { setMode('create'); setEditPlan(null); }}
            className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition shadow-md shadow-indigo-200"
          >
            ➕ New Plan
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* ── Patient Selector ── */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden sticky top-4">
            <div className="px-4 py-3 border-b border-slate-100 bg-slate-50">
              <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Select Patient</p>
            </div>
            <div className="p-3">
              <input
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 mb-2"
                placeholder="🔍 Search…"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
              />
              {loadingPatients ? (
                <div className="text-center py-10 text-slate-400 text-sm">Loading…</div>
              ) : (
                <ul className="space-y-1 max-h-[calc(100vh-300px)] overflow-y-auto">
                  {filteredPatients.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => handleSelectPatient(p)}
                        className={`w-full text-left px-3 py-2.5 rounded-xl transition-all
                          ${selectedPatient?.id === p.id
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'hover:bg-slate-50 text-slate-700'}`}
                      >
                        <div className="flex items-center gap-2.5">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0
                            ${selectedPatient?.id === p.id ? 'bg-white/20 text-white' : 'bg-indigo-100 text-indigo-700'}`}>
                            {(p.name || '?')[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className={`text-sm font-semibold truncate ${selectedPatient?.id === p.id ? 'text-white' : 'text-slate-800'}`}>{p.name}</p>
                            <p className={`text-[11px] ${selectedPatient?.id === p.id ? 'text-white/70' : 'text-slate-400'}`}>{p.hospital_id}</p>
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                  {filteredPatients.length === 0 && (
                    <li className="text-center py-6 text-slate-400 text-sm">No patients found</li>
                  )}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* ── Main Panel ── */}
        <div className="lg:col-span-3 space-y-5">

          {/* Empty — no patient selected */}
          {!selectedPatient && mode === null && (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-28 text-center">
              <span className="text-6xl mb-4">💊</span>
              <h3 className="text-lg font-bold text-slate-700">Select a Patient</h3>
              <p className="text-sm text-slate-400 mt-1 max-w-xs">
                Choose a patient from the left to view and manage their treatment plans
              </p>
            </div>
          )}

          {/* Create / Edit Form */}
          {mode !== null && (
            <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm overflow-hidden">
              <div className="flex items-center gap-3 px-6 py-4 border-b border-indigo-100 bg-indigo-50">
                <span className="text-xl">{mode === 'create' ? '➕' : '✏️'}</span>
                <div>
                  <h2 className="font-bold text-slate-900 text-sm">
                    {mode === 'create' ? 'New Treatment Plan' : 'Edit Treatment Plan'}
                  </h2>
                  {selectedPatient && (
                    <p className="text-xs text-slate-500 mt-0.5">
                      Patient: <span className="font-semibold text-indigo-600">{selectedPatient.name}</span>
                    </p>
                  )}
                </div>
              </div>
              <div className="p-6">
                <PlanForm
                  patients={patients}
                  initial={mode === 'edit' ? editPlan : null}
                  onSave={mode === 'create' ? handleCreate : handleUpdate}
                  onCancel={() => { setMode(null); setEditPlan(null); }}
                  saving={saving}
                />
              </div>
            </div>
          )}

          {/* Patient plans view */}
          {selectedPatient && mode === null && (
            <>
              {/* Summary bar */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-4 flex items-center gap-4 flex-wrap">
                <div className="w-11 h-11 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black text-lg">
                  {(selectedPatient.name || '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-slate-900">{selectedPatient.name}</h2>
                  <p className="text-xs text-slate-400">
                    ID: {selectedPatient.hospital_id}
                    {selectedPatient.assigned_doctor ? ` · Dr. ${selectedPatient.assigned_doctor}` : ''}
                    {selectedPatient.tumour_type !== 'Not Classified' ? ` · ${selectedPatient.tumour_type}` : ''}
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <span className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold border border-emerald-200">
                    ✅ {stats.active} Active
                  </span>
                  <span className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-full text-xs font-bold border border-slate-200">
                    📋 {stats.total} Total
                  </span>
                </div>
              </div>

              {/* Filter bar */}
              <div className="bg-white rounded-2xl border border-slate-100 shadow-sm px-5 py-3 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[160px] flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2">
                  <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    className="text-sm bg-transparent outline-none w-full placeholder-slate-400"
                    placeholder="Search plans…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  {search && <button onClick={() => setSearch('')} className="text-slate-400 hover:text-slate-600 text-lg">×</button>}
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 focus:outline-none bg-white"
                >
                  <option value="All">All Types</option>
                  {PLAN_TYPES.map((t) => <option key={t}>{t}</option>)}
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-600 focus:outline-none bg-white"
                >
                  <option value="All">All Statuses</option>
                  {STATUSES.map((s) => <option key={s}>{s}</option>)}
                </select>
                {(search || filterType !== 'All' || filterStatus !== 'All') && (
                  <button
                    onClick={() => { setSearch(''); setFilterType('All'); setFilterStatus('All'); }}
                    className="text-xs text-indigo-600 font-semibold hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Plans */}
              {loadingPlans ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center py-20">
                  <p className="text-slate-400 text-sm">Loading plans…</p>
                </div>
              ) : byDate.length === 0 ? (
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center py-20 text-center">
                  <span className="text-5xl mb-4">📭</span>
                  <h3 className="text-base font-bold text-slate-700">
                    {plans.length === 0 ? 'No treatment plans yet' : 'No matching plans'}
                  </h3>
                  <p className="text-sm text-slate-400 mt-1">
                    {plans.length === 0
                      ? 'Create the first treatment plan for this patient'
                      : 'Try adjusting your search or filters'}
                  </p>
                  {plans.length === 0 && (
                    <button
                      onClick={() => setMode('create')}
                      className="mt-4 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition"
                    >
                      ➕ Create First Plan
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {byDate.map(([date, datePlans]) => (
                    <div key={date}>
                      {/* Date divider */}
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 flex-shrink-0" />
                        <span className="text-xs font-black text-indigo-600 uppercase tracking-widest">
                          📅 {date}
                        </span>
                        <div className="flex-1 h-px bg-slate-100" />
                        <span className="text-xs text-slate-400">{datePlans.length} plan{datePlans.length !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="space-y-3 ml-4">
                        {datePlans.map((plan) => (
                          <PlanCard
                            key={plan.id}
                            plan={plan}
                            expanded={expandedId === plan.id}
                            onToggle={() => setExpandedId(expandedId === plan.id ? null : plan.id)}
                            onEdit={(p) => { setEditPlan(p); setMode('edit'); }}
                            onDelete={(id) => setDeleteId(id)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full text-center">
            <span className="text-4xl">🗑️</span>
            <h3 className="font-bold text-slate-800 mt-3 mb-1">Delete Treatment Plan?</h3>
            <p className="text-sm text-slate-500 mb-5">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition">
                Cancel
              </button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-700 transition">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
