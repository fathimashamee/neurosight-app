// import React from 'react';

// export default function AllPatients() {
//   return (
//     <div className="p-6 bg-white rounded shadow">
//       <h2 className="text-xl font-semibold text-gray-700">All Patients</h2>
//       <div className="mt-4 text-gray-600">hi</div>
//     </div>
//   );
// }


//============================================================================================

import React, { useState, useEffect } from 'react';
import { api } from "../../../../util";

const AllPatients = () => {
  // SIMULATION: Toggle between 'Attendant' and 'Doctor' to test permissions
  const [currentUser] = useState({ role: "Attendant", name: "Staff Member" });

  const [patients, setPatients] = useState([]);

  useEffect(() => {
    fetchPatients();
  }, []);

  const fetchPatients = async () => {
    try {
      const data = await api("/patients/");
      // Map backend fields to frontend format
      const mapped = data.map(p => ({
        ...p,
        hospitalId: p.hospital_id,
        joinedDate: p.joined_date,
        dischargeDate: p.discharge_date,
        tumourType: p.tumour_type,
        riskScore: p.risk_score,
        doctorNotes: p.doctor_notes,
        scanReport: p.scan_report
      }));
      setPatients(mapped);
    } catch (err) {
      console.error("Failed to fetch patients", err);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [filterJoinedDate, setFilterJoinedDate] = useState('');
  const [filterDischargeDate, setFilterDischargeDate] = useState('');

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [modalMode, setModalMode] = useState('view');
  const [editedNotes, setEditedNotes] = useState('');
  const [editedDischargeDate, setEditedDischargeDate] = useState('');

  // Logic for Printing ID Card
  const handlePrintCard = (p) => {
    const printWindow = window.open('', '_blank', 'width=600,height=400');
    printWindow.document.write(`
      <html>
        <head><title>Patient ID - ${p.hospitalId}</title></head>
        <body style="font-family: sans-serif; display: flex; justify-content: center; padding: 40px;">
          <div style="width: 350px; border: 2px solid #0f172a; border-radius: 12px; overflow: hidden;">
            <div style="background: #0f172a; color: white; padding: 15px; text-align: center;">
              <h2 style="margin: 0; font-size: 16px;">NEUROSIGHT AI</h2>
            </div>
            <div style="padding: 20px;">
              <div style="color: #2563eb; font-weight: bold; font-family: monospace; font-size: 20px;">${p.hospitalId}</div>
              <div style="font-size: 18px; font-weight: bold; margin: 10px 0;">${p.name.toUpperCase()}</div>
              <div style="font-size: 12px; color: #64748b;">Age/Gender: ${p.age}/${p.gender}</div>
              <div style="font-size: 12px; color: #64748b;">Contact: ${p.phone}</div>
              <div style="margin-top: 15px; font-size: 10px; border-top: 1px solid #e2e8f0; padding-top: 10px;">
                Classification: <strong>${p.tumourType}</strong> | Risk: <strong>${p.riskScore}</strong>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const [sendLoading, setSendLoading] = useState(false);
  const handleSendReport = (patient) => {
    setSendLoading(true);
    setTimeout(() => {
      alert(`Report successfully generated and sent to: ${patient.email}`);
      setSendLoading(false);
    }, 1500);
  };

  const openModal = (patient, mode) => {
    setSelectedPatient(patient);
    setModalMode(mode);
    setEditedNotes(patient.doctorNotes || '');
    setEditedDischargeDate(patient.dischargeDate === 'Pending' ? '' : (patient.dischargeDate || ''));
    setIsModalOpen(true);
  };

  const filteredPatients = patients.filter(p => {
    const matchesSearch = p.hospitalId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'All' || p.tumourType === typeFilter;
    const matchesJoined = !filterJoinedDate || p.joinedDate === filterJoinedDate;
    const matchesDischarge = !filterDischargeDate || p.dischargeDate === filterDischargeDate;
    return matchesSearch && matchesType && matchesJoined && matchesDischarge;
  });

  return (
    <div className="space-y-4 font-sans">
      {/* FILTER OPTION BAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Search Patient</label>
          <input
            type="text"
            placeholder="ID or Name..."
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-40">
          <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Joined Date</label>
          <input type="date" className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs" value={filterJoinedDate} onChange={(e) => setFilterJoinedDate(e.target.value)} />
        </div>
        <div className="w-40">
          <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Discharge Date</label>
          <input type="date" className="w-full border border-slate-200 rounded-lg px-2 py-2 text-xs" value={filterDischargeDate} onChange={(e) => setFilterDischargeDate(e.target.value)} />
        </div>
        <div className="w-40">
          <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Tumour Type</label>
          <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            <option value="All">All Types</option>
            <option value="Glioma">Glioma</option>
            <option value="Meningioma">Meningioma</option>
            <option value="Pituitary">Pituitary</option>
            <option value="No Tumour">No Tumour</option>
          </select>
        </div>
        <button onClick={() => { setSearchTerm(''); setTypeFilter('All'); setFilterJoinedDate(''); setFilterDischargeDate(''); }} className="bg-slate-100 text-slate-600 px-4 py-2 rounded-lg text-xs font-bold">Clear</button>
      </div>

      {/* TABLE */}
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-100 font-bold">
                <th className="p-4">Patient ID</th>
                <th className="p-4">Name</th>
                <th className="p-4">Joined Date</th>
                <th className="p-4">Discharge Date</th>
                <th className="p-4 text-center">Risk Score</th>
                <th className="p-4">Tumour Type</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-sm font-medium">
              {filteredPatients.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="p-4 font-mono text-blue-600 font-bold">{p.hospitalId}</td>
                  <td className="p-4 text-slate-800">{p.name}</td>
                  <td className="p-4 text-slate-500 font-mono text-xs">{p.joinedDate}</td>
                  <td className="p-4 text-slate-500 font-mono text-xs">
                    {p.dischargeDate === 'Pending' ? (
                      <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded font-black text-[10px] uppercase tracking-tighter">Pending</span>
                    ) : p.dischargeDate}
                  </td>
                  <td className="p-4 text-center font-bold text-slate-700">{p.riskScore}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${p.tumourType === 'No Tumour' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {p.tumourType}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center items-center gap-2">
                      <button onClick={() => openModal(p, 'view')} className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all text-[11px] font-bold border border-blue-100">
                        <span>👁️</span> View
                      </button>
                      <button onClick={() => openModal(p, 'edit')} className="flex items-center gap-1 px-3 py-1.5 bg-slate-50 text-slate-600 rounded-lg hover:bg-slate-800 hover:text-white transition-all text-[11px] font-bold border border-slate-200">
                        <span>✏️</span> Edit
                      </button>
                      <button onClick={async () => {
                        if (window.confirm('Are you sure you want to delete this patient?')) {
                          try {
                            await api(`/patients/${p.id}`, { method: 'DELETE' });
                            fetchPatients();
                          } catch (e) { alert('Failed to delete'); }
                        }
                      }} className="flex items-center gap-1 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all text-[11px] font-bold border border-red-100">
                        <span>🗑️</span> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* VIEW/EDIT MODAL */}
      {isModalOpen && selectedPatient && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[90vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b p-4 flex justify-between items-center z-10 rounded-t-2xl">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-slate-800">
                  {modalMode === 'view' ? 'Patient Medical File' : 'Update Patient Information'}
                </h2>
                {modalMode === 'view' && (
                  <div className="flex gap-2">
                    <button onClick={() => handlePrintCard(selectedPatient)} className="bg-slate-800 text-white text-[10px] font-bold px-3 py-1 rounded hover:bg-black uppercase">🖨️ Print Card</button>
                    <button onClick={() => handleSendReport(selectedPatient)} disabled={sendLoading} className="bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded hover:bg-blue-700 uppercase">{sendLoading ? "Sending..." : "📧 Send Report"}</button>
                  </div>
                )}
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl">&times;</button>
            </div>

            {/* Scrollable Body Content */}
            <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50/30">
              {/* Left Column: Demographics & History */}
              <div className="space-y-6">
                <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest border-b pb-1">Patient Identity & Contact</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Full Name</label>
                    <input disabled={modalMode === 'view'} className="w-full border-b py-1 outline-none focus:border-blue-500 disabled:bg-transparent font-semibold" defaultValue={selectedPatient.name} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Hospital ID</label>
                    <input disabled className="w-full border-b py-1 bg-transparent text-slate-500 font-mono" defaultValue={selectedPatient.hospitalId} />
                  </div>

                  {/* INTEGRATED DATE FIELDS */}
                  <div>
                    <label className="text-[10px] font-bold text-indigo-600 uppercase">Joined Date (System)</label>
                    <input
                      disabled={modalMode === 'view'}
                      type={modalMode === 'edit' ? 'date' : 'text'}
                      className="w-full border-b py-1 bg-indigo-50/20 text-slate-500 font-mono"
                      defaultValue={selectedPatient.joinedDate}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Discharge Date</label>
                    <div className="relative">
                      <input
                        disabled={modalMode === 'view'}
                        type={modalMode === 'edit' ? 'date' : 'text'}
                        className="w-full border-b py-1 outline-none focus:border-blue-500 disabled:bg-transparent"
                        value={modalMode === 'view' ? (selectedPatient.dischargeDate === 'Pending' ? 'Still In Hospital' : selectedPatient.dischargeDate) : editedDischargeDate}
                        onChange={(e) => setEditedDischargeDate(e.target.value)}
                      />
                      {modalMode === 'edit' && (
                        <button
                          type="button"
                          onClick={() => setEditedDischargeDate('')}
                          className="text-[9px] font-black text-amber-600 uppercase mt-1 block hover:underline"
                        >
                          Reset to Pending
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Age</label>
                    <input disabled={modalMode === 'view'} className="w-full border-b py-1 outline-none disabled:bg-transparent" defaultValue={selectedPatient.age} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Gender</label>
                    <input disabled={modalMode === 'view'} className="w-full border-b py-1 outline-none disabled:bg-transparent" defaultValue={selectedPatient.gender} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Phone</label>
                    <input disabled={modalMode === 'view'} className="w-full border-b py-1 outline-none disabled:bg-transparent" defaultValue={selectedPatient.phone} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Email</label>
                    <input disabled={modalMode === 'view'} className="w-full border-b py-1 outline-none disabled:bg-transparent" defaultValue={selectedPatient.email} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Address</label>
                    <input disabled={modalMode === 'view'} className="w-full border-b py-1 outline-none disabled:bg-transparent" defaultValue={selectedPatient.address} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-red-600 uppercase">AI Risk Score</label>
                    <input disabled className="w-full border-b py-1 bg-transparent font-black text-red-600" defaultValue={selectedPatient.riskScore} />
                  </div>
                </div>

                <h3 className="text-xs font-black text-amber-600 uppercase tracking-widest border-b pb-1 mt-6">Symptoms & Patient History</h3>
                <textarea
                  rows="4"
                  disabled={modalMode === 'view'}
                  className="w-full p-3 text-sm border border-amber-100 rounded-xl bg-amber-50/20 outline-none focus:ring-2 focus:ring-amber-300 disabled:text-slate-700"
                  defaultValue={selectedPatient.symptoms}
                  placeholder="No pain points recorded during registration."
                />

                <h3 className="text-xs font-black text-blue-600 uppercase tracking-widest mt-6">AI Diagnostics Result</h3>
                <div className="p-4 bg-white rounded-xl border border-slate-200">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 rounded-lg border bg-slate-100 flex items-center justify-center text-[10px] text-slate-400">MRI SCAN</div>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Classification</p>
                      <p className="text-lg font-black text-slate-800 uppercase">{selectedPatient.tumourType}</p>
                      <button className="text-[10px] text-blue-600 font-bold underline">View Original Scan</button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Medical Notes & Documents */}
              <div className="space-y-6">
                <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest border-b pb-1">Clinical Documents</h3>
                <div className="flex items-center justify-between p-3 border rounded-lg bg-white hover:bg-slate-50 cursor-pointer">
                  <span className="text-xs font-bold text-slate-600">📄 {selectedPatient.scanReport}</span>
                  <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-1 rounded font-bold uppercase">Open PDF</span>
                </div>

                <h3 className="text-xs font-black text-emerald-600 uppercase tracking-widest mt-6 border-b pb-1">Doctor's Observations</h3>
                <textarea
                  rows="10"
                  disabled={modalMode === 'view' || currentUser.role !== 'Doctor'}
                  className={`w-full p-3 text-sm border rounded-xl outline-none transition-all ${modalMode === 'edit' && currentUser.role === 'Doctor'
                      ? 'focus:ring-2 focus:ring-emerald-500 border-emerald-200'
                      : 'bg-slate-100 text-slate-500 cursor-not-allowed border-slate-200 italic'
                    }`}
                  value={editedNotes}
                  onChange={(e) => setEditedNotes(e.target.value)}
                  placeholder={currentUser.role !== 'Doctor' ? "Editing restricted to medical staff only" : "Enter clinical findings..."}
                />

                {modalMode === 'edit' && (
                  <div className="pt-4 flex gap-3">
                    <button onClick={() => setIsModalOpen(false)} className="flex-1 py-2 rounded-xl border font-bold text-slate-500 text-sm hover:bg-slate-50">Cancel</button>
                    <button onClick={async () => {
                      try {
                        const updatedData = {
                          ...selectedPatient,
                          doctor_notes: editedNotes,
                          discharge_date: editedDischargeDate || 'Pending'
                        };

                        await api(`/patients/${selectedPatient.id}`, {
                          method: 'PUT',
                          body: JSON.stringify(updatedData)
                        });
                        alert('Updated securely.');
                        setIsModalOpen(false);
                        fetchPatients();
                      } catch (e) {
                        alert('Update failed');
                      }
                    }} className="flex-1 py-2 rounded-xl bg-slate-900 text-white font-bold text-sm shadow-lg hover:bg-black uppercase tracking-widest">Save Record</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllPatients;