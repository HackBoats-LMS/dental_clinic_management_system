"use client";

import { useEffect, useState } from "react";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
};

export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("receptionist");
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState("");

  const fetchUsers = async () => {
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
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, email: newEmail, role: newRole }),
      });
      
      if (res.ok) {
        setNewName("");
        setNewEmail("");
        setNewRole("receptionist");
        setIsAdding(false);
        fetchUsers();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to add user");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    }
  };

  if (loading) return <div className="py-8 text-[var(--muted-foreground)]">Loading users...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold text-[var(--foreground)]">System Users</h2>
        <button onClick={() => setIsAdding(!isAdding)} className="btn btn-primary text-sm shadow-sm">
          {isAdding ? "Cancel" : "+ Invite User"}
        </button>
      </div>

      {isAdding && (
        <div className="card mb-8 p-6 bg-white border-[var(--border)]">
          <h3 className="text-lg font-medium mb-4 text-[var(--foreground)]">Add New User</h3>
          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
          <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-1.5">Name</label>
              <input required type="text" value={newName} onChange={e => setNewName(e.target.value)} className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-transparent outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all" placeholder="Jane Doe" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-1.5">Email</label>
              <input required type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-transparent outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all" placeholder="jane@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-1.5">Role</label>
              <select value={newRole} onChange={e => setNewRole(e.target.value)} className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-transparent outline-none focus:ring-2 focus:ring-[var(--primary)] transition-all">
                <option value="receptionist">Receptionist</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div>
              <button type="submit" className="w-full btn btn-primary h-[42px] shadow-sm">Send Invite</button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted)] border-b border-[var(--border)]">
              <tr>
                <th className="px-6 py-4 font-semibold text-[var(--foreground)] whitespace-nowrap">Name</th>
                <th className="px-6 py-4 font-semibold text-[var(--foreground)] whitespace-nowrap">Email</th>
                <th className="px-6 py-4 font-semibold text-[var(--foreground)] whitespace-nowrap">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-[var(--accent)]/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-[var(--foreground)] whitespace-nowrap">{user.name}</td>
                  <td className="px-6 py-4 text-[var(--muted-foreground)] whitespace-nowrap">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${user.role === 'Admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {user.role}
                    </span>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-6 py-12 text-center text-[var(--muted-foreground)]">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
