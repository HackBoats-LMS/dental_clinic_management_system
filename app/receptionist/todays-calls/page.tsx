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
  callDate: string;
  createdAt: string;
};

export default function TodaysCallsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date().toLocaleDateString('en-CA'));

  useEffect(() => {
    if (sessionStatus === "unauthenticated") {
      router.push("/api/auth/signin");
    } else if (sessionStatus === "authenticated") {
      if ((session?.user as any)?.role !== "receptionist") {
        router.push("/");
      } else {
        fetchCalls();
      }
    }
  }, [sessionStatus, session, router]);

  const fetchCalls = async () => {
    try {
      const res = await fetch("/api/calls");
      if (res.ok) {
        const data: Call[] = await res.json();
        setCalls(data);
      }
    } catch (error) {
      console.error("Failed to fetch calls", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    setCalls(calls.map(c => c.id === id ? { ...c, status: newStatus } : c));
    try {
      const res = await fetch("/api/calls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (!res.ok) fetchCalls();
    } catch { fetchCalls(); }
  };

  const handleNotesChange = (id: string, newNotes: string) => {
    setCalls(calls.map(c => c.id === id ? { ...c, notes: newNotes } : c));
  };

  const handleNotesBlur = async (id: string, notes: string) => {
    try {
      await fetch("/api/calls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, notes }),
      });
    } catch (error) { console.error("Failed to update notes", error); }
  };

  const handleDateChange = async (id: string, newDate: string) => {
    setCalls(calls.map(c => c.id === id ? { ...c, callDate: newDate } : c));
    try {
      await fetch("/api/calls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, callDate: newDate }),
      });
    } catch (error) { console.error("Failed to update date", error); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this call?")) return;
    setCalls(calls.filter(c => c.id !== id));
    try {
      await fetch("/api/calls", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
    } catch (error) {
      console.error("Failed to delete", error);
      fetchCalls();
    }
  };

  if (loading || sessionStatus === "loading") {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const filteredCalls = calls.filter(call =>
    new Date(call.callDate || call.createdAt).toLocaleDateString('en-CA') === selectedDate
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
      <header className="mb-8 md:mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[var(--foreground)]">Today's Call List</h1>
          <p className="text-[var(--muted-foreground)] mt-1 md:mt-2 text-sm md:text-base">
            {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="px-3 py-2 border border-[var(--border)] rounded-md bg-transparent outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm self-start md:self-auto"
        />
      </header>

      <div className="card overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted)] border-b border-[var(--border)]">
              <tr>
                <th className="px-6 py-4 font-semibold text-[var(--foreground)] text-left whitespace-nowrap">Name</th>
                <th className="px-6 py-4 font-semibold text-[var(--foreground)] text-left whitespace-nowrap">Phone</th>
                <th className="px-6 py-4 font-semibold text-[var(--foreground)] text-left min-w-[180px]">Notes</th>
                <th className="px-6 py-4 font-semibold text-[var(--foreground)] text-left whitespace-nowrap">Call Date</th>
                <th className="px-6 py-4 font-semibold text-[var(--foreground)] text-center whitespace-nowrap">Status</th>
                <th className="px-6 py-4 font-semibold text-[var(--foreground)] text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {filteredCalls.map((call) => (
                <tr key={call.id} className="hover:bg-[var(--accent)]/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-[var(--foreground)] whitespace-nowrap">{call.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-[var(--muted-foreground)]">{call.phoneNumber}</td>
                  <td className="px-6 py-4 text-[var(--muted-foreground)]">
                    <input
                      type="text"
                      value={call.notes || ""}
                      onChange={(e) => handleNotesChange(call.id, e.target.value)}
                      onBlur={(e) => handleNotesBlur(call.id, e.target.value)}
                      placeholder="Click to add notes..."
                      className="w-full bg-transparent border-b border-transparent hover:border-[var(--border)] focus:border-[var(--primary)] outline-none px-1 py-0.5 transition-colors"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="date"
                      value={new Date(call.callDate || call.createdAt).toLocaleDateString('en-CA')}
                      onChange={(e) => handleDateChange(call.id, e.target.value)}
                      className="px-2 py-1 text-xs border border-[var(--border)] rounded bg-transparent outline-none focus:ring-1 focus:ring-[var(--primary)] text-[var(--muted-foreground)]"
                    />
                  </td>
                  <td className="px-6 py-4 text-center">
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
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleDelete(call.id)}
                      className="text-red-500 hover:text-red-700 transition-colors text-xs font-medium px-2 py-1 rounded hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {filteredCalls.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-[var(--muted-foreground)]">
                    No calls for this date.
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
