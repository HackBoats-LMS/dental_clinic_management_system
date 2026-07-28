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

export default function TodaysCallsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const [allCalls, setAllCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });

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
        setAllCalls(data);
      }
    } catch (error) {
      console.error("Failed to fetch calls", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (id: string, newStatus: string) => {
    setAllCalls(allCalls.map(c => c.id === id ? { ...c, status: newStatus } : c));
    try {
      const res = await fetch("/api/calls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: newStatus }),
      });
      if (!res.ok) fetchCalls(); 
    } catch (error) {
      console.error("Failed to update status", error);
      fetchCalls();
    }
  };

  const handleNotesChange = (id: string, newNotes: string) => {
    setAllCalls(allCalls.map(c => c.id === id ? { ...c, notes: newNotes } : c));
  };

  const handleNotesBlur = async (id: string, notes: string) => {
    try {
      await fetch("/api/calls", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, notes }),
      });
    } catch (error) {
      console.error("Failed to update notes", error);
    }
  };

  if (loading || sessionStatus === "loading") {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const displayedCalls = allCalls.filter(call => {
    const callDate = new Date(call.createdAt);
    const callDateString = `${callDate.getFullYear()}-${String(callDate.getMonth() + 1).padStart(2, '0')}-${String(callDate.getDate()).padStart(2, '0')}`;
    return callDateString === selectedDate;
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
      <header className="mb-8 md:mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[var(--foreground)]">Call List</h1>
          <p className="text-[var(--muted-foreground)] mt-1 md:mt-2 text-sm md:text-base">View and manage the call list.</p>
        </div>
        <div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-[var(--border)] rounded-md bg-transparent outline-none focus:ring-2 focus:ring-[var(--primary)] text-sm"
          />
        </div>
      </header>

      <div className="card overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted)] border-b border-[var(--border)]">
              <tr>
                <th className="px-6 py-4 font-semibold text-[var(--foreground)] whitespace-nowrap">Name</th>
                <th className="px-6 py-4 font-semibold text-[var(--foreground)] whitespace-nowrap">Phone</th>
                <th className="px-6 py-4 font-semibold text-[var(--foreground)] min-w-[200px]">Notes</th>
                <th className="px-6 py-4 font-semibold text-[var(--foreground)] whitespace-nowrap text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {displayedCalls.map((call) => (
                <tr key={call.id} className="hover:bg-[var(--accent)]/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-[var(--foreground)] whitespace-nowrap">
                    {call.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-[var(--muted-foreground)]">
                    {call.phoneNumber}
                  </td>
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
              {displayedCalls.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-[var(--muted-foreground)]">
                    No calls scheduled for this date.
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
