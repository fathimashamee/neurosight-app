import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../../../util";

const STAFF_ROLES = ["Super Admin", "Admin", "Clinician", "Assistant", "Technician"];

function parseApiError(err, fallback) {
    try {
        const parsed = JSON.parse(err?.message || "{}");
        return parsed.detail || fallback;
    } catch {
        return err?.message || fallback;
    }
}

export default function AllStaffs() {
    const navigate = useNavigate();
    const [staffs, setStaffs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [editUser, setEditUser] = useState(null);
    const [searchName, setSearchName] = useState("");
    const [searchEmail, setSearchEmail] = useState("");
    const [filterRole, setFilterRole] = useState("all");
    const [filterStatus, setFilterStatus] = useState("all");

    useEffect(() => {
        fetchStaffs();
    }, []);

    const fetchStaffs = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await api("/auth/users");
            setStaffs(data);
        } catch (err) {
            setError(parseApiError(err, "Failed to load staff."));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (staffId) => {
        if (window.confirm("Are you sure you want to delete this user?")) {
            try {
                await api(`/auth/users/${staffId}`, { method: "DELETE" });
                setStaffs(staffs.filter(s => s.id !== staffId));
            } catch (err) {
                alert(parseApiError(err, "Failed to delete user."));
            }
        }
    };

    const handleEdit = (staff) => {
        setEditUser(staff);
    };

    const handleSaveUser = async (updatedData) => {
        try {
            const payload = {
                name: updatedData.name,
                mobile: updatedData.mobile,
                role: updatedData.role,
                status: updatedData.status,
            };

            const savedUser = await api(`/auth/users/${updatedData.id}`, {
                method: "PUT",
                body: payload,
            });
            setStaffs(staffs.map(s => (s.id === updatedData.id ? savedUser : s)));
            setEditUser(null);

        } catch (err) {
            alert(parseApiError(err, "Failed to update user."));
        }
    };

    const filteredStaffs = useMemo(() => {
        return staffs.filter((staff) => {
            const matchesName = (staff.name || "").toLowerCase().includes(searchName.trim().toLowerCase());
            const matchesEmail = (staff.email || "").toLowerCase().includes(searchEmail.trim().toLowerCase());
            const matchesRole = filterRole === "all" ? true : staff.role === filterRole;
            const matchesStatus =
                filterStatus === "all"
                    ? true
                    : filterStatus === "active"
                      ? !!staff.status
                      : !staff.status;

            return matchesName && matchesEmail && matchesRole && matchesStatus;
        });
    }, [staffs, searchName, searchEmail, filterRole, filterStatus]);

    if (loading) return <div className="p-4">Loading...</div>;
    if (error) return <div className="p-4 text-red-600">Error: {error}</div>;

    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-gray-800">All Staffs</h2>
                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchStaffs}
                        className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition"
                    >
                        Refresh
                    </button>
                    <button
                        onClick={() => navigate("/staff/new")}
                        className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
                    >
                        + Add New Staff
                    </button>
                </div>
            </div>

            <div className="p-4">
                {/* Search/Filter Bar */}
                <div className="flex gap-4 mb-4">
                    <input
                        className="border rounded-md px-3 py-2 w-full max-w-xs text-sm"
                        placeholder="Search by staff name"
                        value={searchName}
                        onChange={(e) => setSearchName(e.target.value)}
                    />
                    <input
                        className="border rounded-md px-3 py-2 w-full max-w-xs text-sm"
                        placeholder="Search by email"
                        value={searchEmail}
                        onChange={(e) => setSearchEmail(e.target.value)}
                    />
                    <select
                        className="border rounded-md px-3 py-2 text-sm text-gray-600"
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value)}
                    >
                        <option value="all">All roles</option>
                        {STAFF_ROLES.map((role) => (
                            <option key={role} value={role}>{role}</option>
                        ))}
                    </select>
                    <select
                        className="border rounded-md px-3 py-2 text-sm text-gray-600"
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                    >
                        <option value="all">All statuses</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                    </select>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-lime-500 text-white text-sm uppercase tracking-wider">
                                <th className="p-3 font-medium rounded-tl-lg">Staff ID</th>
                                <th className="p-3 font-medium">Staff Name</th>
                                <th className="p-3 font-medium">Mobile</th>
                                <th className="p-3 font-medium">Email</th>
                                <th className="p-3 font-medium">Role</th>
                                <th className="p-3 font-medium rounded-tr-lg text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm text-gray-700">
                            {filteredStaffs.map((staff) => (
                                <tr key={staff.id} className="border-b last:border-0 hover:bg-gray-50 bg-lime-50/30">
                                    <td className="p-3">#{staff.id}</td>
                                    <td className="p-3 font-medium text-gray-900">{staff.name || "N/A"}</td>
                                    <td className="p-3">{staff.mobile || "N/A"}</td>
                                    <td className="p-3">{staff.email}</td>
                                    <td className="p-3">
                                        <span className="px-2 py-1 bg-gray-100 rounded text-xs font-semibold text-gray-600">
                                            {staff.role}
                                        </span>
                                    </td>
                                    <td className="p-3 flex justify-center gap-2">
                                        <button className="text-blue-600 hover:text-blue-800" onClick={() => handleEdit(staff)}>Edit</button>
                                        <button className="text-red-600 hover:text-red-800" onClick={() => handleDelete(staff.id)}>Delete</button>
                                    </td>
                                </tr>
                            ))}
                            {filteredStaffs.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="p-6 text-center text-gray-500">No staff found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            {editUser && (
                <EditUserModal
                    user={editUser}
                    onClose={() => setEditUser(null)}
                    onSave={handleSaveUser}
                />
            )}
        </div>
    );
}

function EditUserModal({ user, onClose, onSave }) {
    const [formData, setFormData] = useState({
        id: user.id,
        name: user.name || "",
        email: user.email,
        mobile: user.mobile || "",
        role: user.role,
        status: user.status ?? true
    });

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
                <h3 className="text-xl font-semibold text-gray-800 mb-6 text-center">Edit User</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                        <input className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50 text-gray-500" value={formData.id} disabled />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">User Name</label>
                        <input name="name" className="w-full border border-gray-300 rounded px-3 py-2" value={formData.name} onChange={handleChange} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-50 text-gray-500" value={formData.email} disabled />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Mobile</label>
                        <input name="mobile" className="w-full border border-gray-300 rounded px-3 py-2" value={formData.mobile} onChange={handleChange} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                        <select name="role" className="w-full border border-gray-300 rounded px-3 py-2" value={formData.role} onChange={handleChange}>
                            {STAFF_ROLES.map((role) => (
                                <option key={role} value={role}>{role}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-gray-700">Status</label>
                        <div className="relative inline-block w-10 h-6 align-middle select-none transition duration-200 ease-in">
                            <input
                                type="checkbox"
                                name="status"
                                checked={formData.status}
                                onChange={handleChange}
                                id="edit-status-toggle"
                                className="toggle-checkbox absolute block w-6 h-6 rounded-full bg-white border-4 appearance-none cursor-pointer checked:right-0 checked:border-green-400"
                            />
                            <label htmlFor="edit-status-toggle" className={`toggle-label block overflow-hidden h-6 rounded-full cursor-pointer ${formData.status ? 'bg-green-400' : 'bg-gray-300'}`}></label>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-6 pt-4">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-green-100 text-green-700 rounded hover:bg-green-200 border border-green-200">Save</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
