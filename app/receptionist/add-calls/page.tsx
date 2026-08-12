"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type Call = {
  id: string;
  name: string;
  phoneNumber: string;
  status: string;
  notes: string | null;
  callDate: string;
  createdAt: string;
};

export default function AddCallsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newDate, setNewDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [allCalls, setAllCalls] = useState<Call[]>([]);

  useEffect(() => {
    if (sessionStatus === "authenticated") {
      fetchCalls();
    }
  }, [sessionStatus]);

  async function fetchCalls() {
    try {
      const res = await fetch("/api/calls");
      if (res.ok) {
        const data = await res.json();
        setAllCalls(data);
      }
    } catch (error) {
      console.error("Failed to fetch calls", error);
    }
  }

  if (sessionStatus === "unauthenticated") {
    router.push("/api/auth/signin");
    return null;
  }

  if (sessionStatus === "authenticated" && session?.user?.role !== "receptionist") {
    router.push("/");
    return null;
  }

  const handleAddCall = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg("");

    try {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, phoneNumber: newPhone, notes: newNotes, date: newDate }),
      });
      if (res.ok) {
        setNewName("");
        setNewPhone("");
        setNewNotes("");
        setSuccessMsg("Call successfully added!");
        setTimeout(() => setSuccessMsg(""), 3000);
        fetchCalls(); // Refresh the list
      }
    } catch (error) {
      console.error("Failed to add call", error);
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = "w-full px-4 py-2.5 border border-[var(--border)] rounded-md bg-[var(--background)] outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all text-[var(--foreground)]";
  const labelClass = "block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5";

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
      <header className="mb-8 md:mb-10">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[var(--foreground)]">Add New Call</h1>
        <p className="text-[var(--muted-foreground)] mt-1 md:mt-2 text-sm md:text-base">Add a new person to the call list.</p>
      </header>

      <div className="flex flex-col gap-10">

        {/* TOP: Form */}
        <div className="card border-[var(--border)] p-6 md:p-8 w-full">
          {successMsg && (
            <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-md border border-green-200 flex items-center gap-2 text-sm">
              <span>✅</span> {successMsg}
            </div>
          )}

          <form onSubmit={handleAddCall} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className={labelClass}>Date</label>
                <input
                  required
                  type="date"
                  value={newDate}
                  onChange={e => setNewDate(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Name</label>
                <input
                  required
                  type="text"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className={inputClass}
                  placeholder="John Doe"
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Phone Number</label>
              <input
                required
                type="text"
                value={newPhone}
                onChange={e => setNewPhone(e.target.value)}
                className={inputClass}
                placeholder="+1 234 567 890"
              />
            </div>

            <div>
              <label className={labelClass}>Notes (Optional)</label>
              <textarea
                value={newNotes}
                onChange={e => setNewNotes(e.target.value)}
                rows={4}
                className={`${inputClass} resize-none`}
                placeholder="Called about..."
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="w-full btn btn-primary py-2.5 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSaving ? "Saving..." : "Save Contact"}
              </button>
            </div>
          </form>
        </div>

        {/* BOTTOM: All Calls Table */}
        <div className="w-full">
          <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4">All Calls</h2>
          <div className="card overflow-hidden !p-0">
            <div className="overflow-y-auto max-h-[600px] overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-[var(--muted)] border-b border-[var(--border)] sticky top-0">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-[var(--foreground)] text-left whitespace-nowrap">Date</th>
                    <th className="px-4 py-3 font-semibold text-[var(--foreground)] text-left whitespace-nowrap">Name</th>
                    <th className="px-4 py-3 font-semibold text-[var(--foreground)] text-left whitespace-nowrap">Phone</th>
                    <th className="px-4 py-3 font-semibold text-[var(--foreground)] text-right whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {allCalls.map((call) => (
                    <tr key={call.id} className="hover:bg-[var(--accent)]/50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap text-[var(--muted-foreground)] text-xs">
                        {new Date(call.callDate || call.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="px-4 py-3 font-medium text-[var(--foreground)] whitespace-nowrap">{call.name}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-[var(--muted-foreground)] text-xs">{call.phoneNumber}</td>
                      <td className="px-4 py-3 text-right">
                        <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full border ${
                          call.status === 'CONTACTED' ? 'bg-green-50 text-green-700 border-green-200' :
                          call.status === 'PENDING' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                          call.status === 'NOT_LIFTED' ? 'bg-red-50 text-red-700 border-red-200' :
                          'bg-gray-50 text-gray-700 border-gray-200'
                        }`}>
                          {call.status === 'NOT_LIFTED' ? 'Not Lifted' : call.status.charAt(0) + call.status.slice(1).toLowerCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {allCalls.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-12 text-center text-[var(--muted-foreground)]">
                        No calls added yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
