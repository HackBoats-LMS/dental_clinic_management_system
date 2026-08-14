"use client";

import { useEffect, useState, useMemo } from "react";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("receptionist");
  const [isAdding, setIsAdding] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers();
  }, []);

  const filteredUsers = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return users;
    return users.filter(u => 
      u.name.toLowerCase().includes(q) || 
      u.email.toLowerCase().includes(q) || 
      u.role.toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const handleAddOrEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const url = editingUserId ? `/api/users/${editingUserId}` : "/api/users";
      const method = editingUserId ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, email: newEmail, role: newRole }),
      });
      
      if (res.ok) {
        setNewName("");
        setNewEmail("");
        setNewRole("receptionist");
        setIsAdding(false);
        setEditingUserId(null);
        fetchUsers();
      } else {
        const data = await res.json();
        setError(data.error || `Failed to ${editingUserId ? 'edit' : 'add'} user`);
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteUser = async (id: string, role: string) => {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${id}?role=${role}`, { method: "DELETE" });
      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete user");
      }
    } catch {
      alert("An unexpected error occurred");
    } finally {
      setSubmitting(false);
      setDeletingUserId(null);
    }
  };

  const startEdit = (user: User) => {
    setNewName(user.name);
    setNewEmail(user.email);
    setNewRole(user.role.toLowerCase());
    setEditingUserId(user.id);
    setIsAdding(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (loading) return (
    <div className="p-8 text-center text-slate-400">
      <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-blue-600 mb-2"></div>
      <p className="text-xs">Loading system users...</p>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-slate-900">System Users</h2>
          <span className="px-2.5 py-0.5 text-xs font-semibold bg-slate-100 text-slate-700 rounded-full">
            {users.length} Total
          </span>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Filter users..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-slate-50/50 w-full sm:w-48"
          />
          <button 
            onClick={() => {
              if (isAdding) {
                setIsAdding(false);
                setEditingUserId(null);
                setNewName("");
                setNewEmail("");
                setNewRole("receptionist");
              } else {
                setIsAdding(true);
              }
            }} 
            className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm shrink-0"
          >
            {isAdding ? "Cancel" : "+ Invite User"}
          </button>
        </div>
      </div>

      {/* Invite/Edit Form */}
      {isAdding && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm animate-in fade-in duration-200">
          <h3 className="text-base font-bold text-slate-900 mb-4">{editingUserId ? "Edit User Details" : "Add New Authorized User"}</h3>
          {error && <p className="text-red-600 text-xs mb-4 p-2.5 bg-red-50 rounded-lg border border-red-100">{error}</p>}
          <form onSubmit={handleAddOrEditUser} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Name</label>
              <input 
                required 
                type="text" 
                value={newName} 
                onChange={e => setNewName(e.target.value)} 
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                placeholder="Jane Doe" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Email Address</label>
              <input 
                required 
                type="email" 
                value={newEmail} 
                onChange={e => setNewEmail(e.target.value)} 
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
                placeholder="jane@example.com" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">Role</label>
              <select 
                value={newRole} 
                onChange={e => setNewRole(e.target.value)} 
                disabled={!!editingUserId}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all bg-white disabled:bg-slate-100"
              >
                <option value="receptionist">Receptionist</option>
                <option value="doctor">Doctor</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <button 
                type="submit" 
                disabled={submitting}
                className="w-full px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                {submitting ? "Saving..." : (editingUserId ? "Update User" : "Send Invite")}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* User Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5 text-left font-semibold text-slate-600 uppercase text-xs tracking-wider">User Name</th>
                <th className="px-6 py-3.5 text-left font-semibold text-slate-600 uppercase text-xs tracking-wider">Email Address</th>
                <th className="px-6 py-3.5 text-left font-semibold text-slate-600 uppercase text-xs tracking-wider">Assigned Role</th>
                <th className="px-6 py-3.5 text-right font-semibold text-slate-600 uppercase text-xs tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-6 py-4 font-semibold text-slate-900 whitespace-nowrap">{user.name}</td>
                  <td className="px-6 py-4 text-slate-600 whitespace-nowrap">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${user.role === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {deletingUserId === user.id ? (
                      <div className="flex items-center justify-end gap-2">
                        <span className="text-xs text-red-600 font-semibold mr-2">Confirm Delete?</span>
                        <button onClick={() => handleDeleteUser(user.id, user.role)} className="text-white bg-red-600 hover:bg-red-700 px-3 py-1 rounded-md text-xs font-bold transition-colors disabled:opacity-50" disabled={submitting}>Yes</button>
                        <button onClick={() => setDeletingUserId(null)} className="text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded-md text-xs font-bold transition-colors disabled:opacity-50" disabled={submitting}>No</button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-3">
                        <button onClick={() => startEdit(user)} className="text-blue-600 hover:text-blue-800 transition-colors font-semibold" disabled={submitting}>Edit</button>
                        <button onClick={() => setDeletingUserId(user.id)} className="text-red-600 hover:text-red-800 transition-colors font-semibold" disabled={submitting}>Delete</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                    No users matching &quot;{searchQuery}&quot;.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
