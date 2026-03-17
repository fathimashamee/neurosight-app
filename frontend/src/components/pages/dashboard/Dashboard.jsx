import { useState, useEffect, useRef } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
import { api } from "../../../util";

// Standardized Corporate SVG Icons
const Icons = {
  Overview: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>,
  Records: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>,
  Add: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg>,
  AI: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>,
  Staff: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>,
  System: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 008 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4" /></svg>,
  Settings: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Notification: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>,
  Logout: () => <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
};

function Sidebar({ collapsed, role, onLogout }) {
  const canManageStaff = role === "Admin" || role === "Super Admin";

  const NavItem = ({ to, label, Icon }) => (
    <NavLink to={to} className={({ isActive }) => `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm mb-1 ${isActive ? "bg-slate-800 text-white shadow-md font-medium" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"}`}>
      <Icon />
      {!collapsed && <span>{label}</span>}
    </NavLink>
  );

  return (
    <aside className={`bg-[#f8fafc] border-r min-h-screen sticky top-0 transition-all duration-300 ${collapsed ? "w-20" : "w-64"}`}>
      <div className="p-6 mb-4">
        <h1 className={`font-black text-slate-900 tracking-tighter text-xl ${collapsed ? "hidden" : "block"}`}>NEUROSIGHT <span className="text-blue-600">AI</span></h1>
      </div>

      <nav className="px-3 space-y-6">
        {/* DASHBOARD OVERVIEW */}
        <div>
          <NavItem to="/" label="Dashboard Overview" Icon={Icons.Overview} />
        </div>

        {/* CLINICAL DATA SECTION */}
        <div>
          <div className={`mb-2 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ${collapsed ? 'hidden' : 'block'}`}>Clinical Data</div>
          <NavItem to="/patients" label="All Patients" Icon={Icons.Records} />
          <NavItem to="/patients/new" label="Add New Patient" Icon={Icons.Add} />
        </div>

        {/* TREATMENT SECTION: Clinician only */}
        {role === "Clinician" && (
          <div>
            <div className={`mb-2 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ${collapsed ? 'hidden' : 'block'}`}>Treatment</div>
            <NavItem to="/treatment-plans" label="Treatment Plans" Icon={Icons.Records} />
          </div>
        )}

        {/* IMAGE ANALYSIS SECTION */}
        <div>
          <div className={`mb-2 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ${collapsed ? 'hidden' : 'block'}`}>Image Analysis</div>
          <NavItem to="/image/upload" label="Upload MRI" Icon={Icons.AI} />
          <NavItem to="/image/results" label="Classification Results" Icon={Icons.Records} />
        </div>


        {/* STAFF MANAGEMENT: Admin Only */}
        {canManageStaff && (
          <div>
            <div className={`mb-2 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ${collapsed ? 'hidden' : 'block'}`}>Staff Management</div>
            <NavItem to="/staff" label="Staff Records" Icon={Icons.Staff} />
            <NavItem to="/staff/new" label="Add New Staff" Icon={Icons.Add} />
          </div>
        )}

        {/* SYSTEM MANAGEMENT: Admin Only */}
        {canManageStaff && (
          <div>
            <div className={`mb-2 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ${collapsed ? 'hidden' : 'block'}`}>System Management</div>
            <NavItem to="/system/audit-logs" label="Audit Logs" Icon={Icons.System} />

          </div>
        )}

        {/* COMMUNICATIONS & SETTINGS */}
        <div>
          <div className={`mb-2 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ${collapsed ? 'hidden' : 'block'}`}>User Preferences</div>
          <NavItem to="/settings" label="Personalized Settings" Icon={Icons.Settings} />

          {/* LOGOUT BUTTON */}
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 mt-2 rounded-lg transition-all text-sm text-red-600 hover:bg-red-50 font-medium"
          >
            <Icons.Logout />
            {!collapsed && <span>Logout Session</span>}
          </button>
        </div>
      </nav>
    </aside>
  );
}

export default function Dashboard({ onLogout, user }) {
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  /* ── Search state ── */
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showDrop, setShowDrop] = useState(false);
  const searchRef = useRef(null);
  const timer = useRef(null);

  const navigate = useNavigate();
  const location = useLocation();

  /* close search drop on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setShowDrop(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* live search: patients + staff */
  const handleSearch = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(timer.current);
    if (!val.trim()) { setResults([]); setShowDrop(false); return; }
    setSearching(true);
    setShowDrop(true);
    timer.current = setTimeout(async () => {
      try {
        const [patients, staff] = await Promise.all([
          api("/patients").catch(() => []),
          api("/auth/users").catch(() => []),
        ]);
        const q = val.toLowerCase();
        const pMatches = (Array.isArray(patients) ? patients : [])
          .filter(p => (p.name || "").toLowerCase().includes(q) || (p.hospital_id || "").toLowerCase().includes(q))
          .slice(0, 5)
          .map(p => ({ type: "Patient", label: p.name, sub: p.hospital_id || "—", link: "/patients" }));
        const sMatches = (Array.isArray(staff) ? staff : [])
          .filter(s => (s.name || "").toLowerCase().includes(q) || (s.email || "").toLowerCase().includes(q))
          .slice(0, 3)
          .map(s => ({ type: "Staff", label: s.name || s.email, sub: s.role || "—", link: "/staff" }));
        setResults([...pMatches, ...sMatches]);
      } catch { setResults([]); }
      finally { setSearching(false); }
    }, 350);
  };

  const clearSearch = () => { setQuery(""); setResults([]); setShowDrop(false); };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      onLogout?.();
      navigate("/login", { replace: true });
    }
  };

  const ROUTE_LABELS = {
    "/": "Dashboard Overview",
    "/patients": "All Patients",
    "/patients/new": "Add New Patient",
    "/image/upload": "Upload MRI",
    "/image/results": "Classification Results",
    "/treatment-plans": "Treatment Plans",
    "/staff": "Staff Records",
    "/staff/new": "Add New Staff",
    "/system/audit-logs": "Audit Logs",
    "/settings": "Personalized Settings",
  };
  const pageLabel = ROUTE_LABELS[location.pathname] || "Dashboard";

  const today = new Date().toLocaleDateString("en-GB", { weekday: "short", year: "numeric", month: "short", day: "numeric" });
  const initials = (user?.name || user?.email || "?").split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar collapsed={collapsed} role={user?.role} onLogout={handleLogout} />

      <div className="flex-1 flex flex-col">
        {/* ── Top Header ── */}
        <header className="h-16 border-b flex items-center justify-between px-6 bg-white sticky top-0 z-40 shadow-sm">

          {/* Left: hamburger + page label */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-800 transition-all"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <div className="hidden sm:block h-5 w-px bg-slate-200" />
            <div className="hidden sm:flex flex-col">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest leading-none">NeuroSight AI</span>
              <span className="text-sm font-bold text-slate-800 leading-tight mt-0.5">{pageLabel}</span>
            </div>
          </div>

          {/* Centre: Search bar */}
          <div className="flex-1 max-w-md mx-6 relative" ref={searchRef}>
            <div className={`flex items-center bg-slate-50 border rounded-xl px-3 py-2 gap-2 transition-all ${showDrop || query ? "border-indigo-300 bg-white shadow-sm" : "border-slate-200"}`}>
              <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                className="bg-transparent border-none outline-none text-sm flex-1 placeholder:text-slate-400"
                placeholder="Search patient name, hospital ID or staff…"
                value={query}
                onChange={handleSearch}
                onFocus={() => { if (query.trim()) setShowDrop(true); }}
              />
              {searching && (
                <svg className="w-4 h-4 text-indigo-400 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              )}
              {query && !searching && (
                <button onClick={clearSearch} className="text-slate-400 hover:text-slate-600 text-lg leading-none flex-shrink-0">×</button>
              )}
            </div>

            {/* Search dropdown */}
            {showDrop && query.trim() && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden z-50">
                {searching ? (
                  <div className="px-4 py-5 text-center text-xs text-slate-400">Searching…</div>
                ) : results.length === 0 ? (
                  <div className="px-4 py-5 text-center">
                    <p className="text-sm text-slate-500 font-medium">No results for "{query}"</p>
                    <p className="text-xs text-slate-400 mt-0.5">Try a different name or Hospital ID</p>
                  </div>
                ) : (
                  <div>
                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-100">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{results.length} result{results.length !== 1 ? "s" : ""}</span>
                    </div>
                    {results.map((r, i) => (
                      <button
                        key={i}
                        onClick={() => { navigate(r.link); clearSearch(); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left border-b border-slate-50 last:border-0"
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${r.type === "Patient" ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"}`}>
                          {r.type === "Patient" ? "🧑‍⚕️" : "👤"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-slate-800 truncate">{r.label}</p>
                          <p className="text-xs text-slate-400">{r.sub} · {r.type}</p>
                        </div>
                        <svg className="w-4 h-4 text-slate-300 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: date + user profile */}
          <div className="flex items-center gap-3 flex-shrink-0">
            {/* Date pill */}
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-500 font-medium">
              <svg className="w-3.5 h-3.5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {today}
            </div>

            <div className="h-6 w-px bg-slate-200" />

            {/* User profile dropdown */}
            <div className="relative">
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all"
              >
                <div className="w-7 h-7 rounded-lg bg-slate-900 flex items-center justify-center text-white text-xs font-black">
                  {initials}
                </div>
                <div className="hidden md:flex flex-col text-left">
                  <span className="text-xs font-bold text-slate-800 leading-none">{user?.name || user?.email || "—"}</span>
                  <span className="text-[10px] text-indigo-600 font-semibold leading-tight mt-0.5">{user?.role}</span>
                </div>
                <svg className={`w-3.5 h-3.5 text-slate-400 transition-transform ${profileOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                    <p className="text-sm font-bold text-slate-800">{user?.name || "—"}</p>
                    <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                    <span className="inline-block mt-1.5 px-2 py-0.5 bg-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full">{user?.role}</span>
                  </div>
                  <div className="py-1.5">
                    <button
                      onClick={() => { setProfileOpen(false); handleLogout(); }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-all font-medium"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* overlay to close profile dropdown */}
        {profileOpen && <div className="fixed inset-0 z-40" onClick={() => setProfileOpen(false)} />}

        <main className="p-8 overflow-y-auto bg-slate-50/20 flex-1">
          <Outlet context={{ user }} />
        </main>
      </div>
    </div>
  );
}
