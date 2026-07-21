"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Call = {
  id: string;
  name: string;
  phoneNumber: string;
  status: string;
  notes: string | null;
  createdAt: string;
};

export default function ReceptionistDashboard() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);

  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/api/auth/signin");
    } else if (sessionStatus === "authenticated") {
      if ((session?.user as any)?.role !== "receptionist" && (session?.user as any)?.role !== "admin") {
         router.push("/"); // Or an unauthorized page
      } else {
        fetchCalls();
      }
    }
  }, [sessionStatus, session, router]);

  const fetchCalls = async () => {
    try {
      const res = await fetch("/api/calls");
      if (res.ok) {
        const data = await res.json();
        setCalls(data);
      }
    } catch (error) {
      console.error("Failed to fetch calls", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCall = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, phoneNumber: newPhone, notes: newNotes }),
      });
      if (res.ok) {
        setNewName("");
        setNewPhone("");
        setNewNotes("");
        setIsAdding(false);
        fetchCalls();
      }
    } catch (error) {
      console.error("Failed to add call", error);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    try {
      const res = await fetch("/api/calls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (res.ok) {
        fetchCalls();
      }
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  if (loading || sessionStatus === "loading") {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
      <header className="mb-8 md:mb-10 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[var(--foreground)]">Call List</h1>
          <p className="text-[var(--muted-foreground)] mt-1 md:mt-2 text-sm md:text-base">Manage the daily call list.</p>
        </div>
        <div>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="btn btn-primary shadow-sm"
          >
            {isAdding ? 'Cancel' : '+ Add New Call'}
          </button>
        </div>
      </header>

      {isAdding && (
        <div className="card mb-8 p-6 bg-white border-[var(--border)]">
          <h2 className="text-lg font-medium mb-4 text-[var(--foreground)]">Add to Call List</h2>
          <form onSubmit={handleAddCall} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-1.5">Name</label>
              <input 
                required
                type="text" 
                value={newName} 
                onChange={e => setNewName(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-transparent outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
                placeholder="John Doe"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-1.5">Phone Number</label>
              <input 
                required
                type="text" 
                value={newPhone} 
                onChange={e => setNewPhone(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-transparent outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
                placeholder="+1 234 567 890"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--muted-foreground)] mb-1.5">Notes (Optional)</label>
              <input 
                type="text" 
                value={newNotes} 
                onChange={e => setNewNotes(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border)] rounded-md bg-transparent outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
                placeholder="Called about..."
              />
            </div>
            <div>
              <button type="submit" className="w-full btn btn-primary h-[42px] shadow-sm">Save Contact</button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted)] border-b border-[var(--border)]">
              <tr>
                <th className="px-6 py-4 font-semibold text-[var(--foreground)] whitespace-nowrap">Date</th>
                <th className="px-6 py-4 font-semibold text-[var(--foreground)] whitespace-nowrap">Name</th>
                <th className="px-6 py-4 font-semibold text-[var(--foreground)] whitespace-nowrap">Phone</th>
                <th className="px-6 py-4 font-semibold text-[var(--foreground)] min-w-[200px]">Notes</th>
                <th className="px-6 py-4 font-semibold text-[var(--foreground)] whitespace-nowrap text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {calls.map((call) => (
                <tr key={call.id} className="hover:bg-[var(--accent)]/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-[var(--muted-foreground)]">
                    {new Date(call.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 font-medium text-[var(--foreground)] whitespace-nowrap">
                    {call.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-[var(--muted-foreground)]">
                    {call.phoneNumber}
                  </td>
                  <td className="px-6 py-4 text-[var(--muted-foreground)]">
                    <div className="max-w-xs truncate" title={call.notes || ""}>
                      {call.notes || "-"}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <select
                      value={call.status}
                      onChange={(e) => handleStatusChange(call.id, e.target.value)}
                      className={`inline-flex px-3 py-1.5 text-xs font-medium rounded-full border cursor-pointer outline-none transition-colors ${
                        call.status === 'CONTACTED' ? 'bg-green-50 text-green-700 border-green-200' :
                        call.status === 'PENDING' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                        call.status === 'NOT_LIFTED' ? 'bg-red-50 text-red-700 border-red-200' :
                        'bg-gray-50 text-gray-700 border-gray-200'
                      }`}
                    >
                      <option value="PENDING" className="bg-white text-black">Pending</option>
                      <option value="CONTACTED" className="bg-white text-black">Contacted</option>
                      <option value="NOT_LIFTED" className="bg-white text-black">Not Lifted</option>
                      <option value="OTHER" className="bg-white text-black">Other</option>
                    </select>
                  </td>
                </tr>
              ))}
              {calls.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[var(--muted-foreground)]">
                    No calls in the list.
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
