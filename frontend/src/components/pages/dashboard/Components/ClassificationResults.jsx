import React, { useState, useEffect } from 'react';
import { api, getToken } from "../../../../util";
import { useNavigate } from "react-router-dom";

export default function ClassificationResults() {
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const data = await api("/results/");
      setResults(data);
    } catch (err) {
      setError("Failed to load results");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    // Actually, backend doesn't have DELETE /results/ yet, but let's mock the UI for it.
    if (window.confirm("Are you sure you want to remove this scan from your history?")) {
      // mock delete
      setResults(results.filter(r => r.id !== id));
    }
  };

  return (
    <div className="font-sans space-y-6">
      <div className="bg-slate-900 p-4 text-white rounded-t-xl border-b-4 border-blue-600 flex justify-between items-center">
        <div>
          <h2 className="text-lg font-bold uppercase tracking-widest text-white">Classification History</h2>
          <p className="text-[10px] text-blue-400 font-black tracking-tighter uppercase">Past AI Diagnostics</p>
        </div>
        <button onClick={() => navigate("/image/upload")} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-xs font-bold uppercase tracking-wider rounded border border-blue-500 transition-colors">
          + New Scan
        </button>
      </div>

      <div className="bg-white rounded-b-xl shadow border border-slate-200 p-6">
        {loading ? (
          <p className="text-slate-500 text-center animate-pulse py-10 font-bold uppercase text-xs">Loading records...</p>
        ) : error ? (
          <p className="text-red-500 text-center py-10 font-bold text-xs uppercase">{error}</p>
        ) : results.length === 0 ? (
          <p className="text-slate-500 text-center py-10 font-bold text-xs uppercase">No scan results found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50 text-[10px] uppercase tracking-widest text-slate-500 font-black border-b border-slate-200">
                  <th className="p-4">Scan ID</th>
                  <th className="p-4">Date & Time</th>
                  <th className="p-4">File Name</th>
                  <th className="p-4">Predicted Classification</th>
                  <th className="p-4 text-center">Confidence</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm font-medium">
                {results.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 text-blue-600 font-bold font-mono text-xs">#{String(r.id).padStart(5, '0')}</td>
                    <td className="p-4 text-slate-500 font-mono text-xs">
                      {new Date(r.created_at).toLocaleString()}
                    </td>
                    <td className="p-4 text-slate-700 max-w-xs truncate">
                      {r.filename.split(/[\/\\]/).pop()}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded-[4px] text-[10px] font-black uppercase tracking-tight ${r.predicted_label.toLowerCase().includes('tumor') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {r.predicted_label.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="p-4 text-center text-slate-800 font-bold">
                      {Math.round(r.confidence * 100)}%
                    </td>
                    <td className="p-4 text-right">
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="text-[10px] text-red-600 font-black uppercase tracking-widest hover:underline"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
