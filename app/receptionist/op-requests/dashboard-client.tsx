"use client";

import { useEffect, useState } from "react";

type OpRequest = {
  id: string;
  createdAt: Date;
  familyMemberId?: string | null;
  patient?: { name: string } | null;
  familyMember?: { name: string } | null;
  op?: { doctor?: { name: string } | null } | null;
};

export default function ReceptionistDashboard({
  initialRequests,
  receptionistId,
}: {
  initialRequests: OpRequest[];
  receptionistId: string;
}) {
  const [requests, setRequests] = useState<OpRequest[]>(initialRequests);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/request/stream");

    es.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg === "connected") return;

        if (msg.type === "new-request") {
          setRequests((prev) => {
            if (prev.some((r) => r.id === msg.data.id)) return prev;
            return [msg.data, ...prev];
          });
        }

        if (msg.type === "approved") {
          setRequests((prev) => prev.filter((r) => r.id !== msg.id));
        }
      } catch (err) {
        console.error("Failed to parse SSE event:", err);
      }
    };

    return () => es.close();
  }, []);

  const approve = async (requestId: string) => {
    setApprovingId(requestId);
    try {
      const res = await fetch("/api/request/approve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, receptionistId }),
      });
      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== requestId));
      } else {
        alert("Failed to approve request");
      }
    } catch (err) {
      console.error("Error approving request:", err);
    } finally {
      setApprovingId(null);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
      <header className="mb-8 md:mb-10">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[var(--foreground)]">
          OP Consultation Requests
        </h1>
        <p className="text-[var(--muted-foreground)] mt-1 text-sm md:text-base">
          Approve patient self-registrations and grant consultation permissions in real time.
        </p>
      </header>

      <div className="card overflow-hidden !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted)] border-b border-[var(--border)]">
              <tr>
                <th className="px-6 py-4 font-semibold text-[var(--foreground)] text-left">Patient Name</th>
                <th className="px-6 py-4 font-semibold text-[var(--foreground)] text-left">Attending Specialist</th>
                <th className="px-6 py-4 font-semibold text-[var(--foreground)] text-left">Registration Type</th>
                <th className="px-6 py-4 font-semibold text-[var(--foreground)] text-left">Requested At</th>
                <th className="px-6 py-4 font-semibold text-[var(--foreground)] text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-[var(--accent)]/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-[var(--foreground)]">
                    {r.familyMember?.name ? (
                      <div>
                        <span className="font-semibold text-teal-700">{r.familyMember.name}</span>
                        <span className="text-xs text-slate-500 block">
                          Family of {r.patient?.name || "Patient"}
                        </span>
                      </div>
                    ) : (
                      r.patient?.name || "Patient"
                    )}
                  </td>
                  <td className="px-6 py-4 text-[var(--muted-foreground)]">
                    Dr. {r.op?.doctor?.name || "Specialist"}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                        r.familyMemberId
                          ? "bg-purple-50 text-purple-700 border border-purple-200"
                          : "bg-teal-50 text-teal-700 border border-teal-200"
                      }`}
                    >
                      {r.familyMemberId ? "Family" : "Self"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-[var(--muted-foreground)]">
                    {new Date(r.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => approve(r.id)}
                      disabled={approvingId === r.id}
                      className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-md text-xs font-semibold disabled:opacity-50 transition-all active:scale-[0.98]"
                    >
                      {approvingId === r.id ? "Approving..." : "Approve Request"}
                    </button>
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-[var(--muted-foreground)]">
                    No pending registration requests.
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
