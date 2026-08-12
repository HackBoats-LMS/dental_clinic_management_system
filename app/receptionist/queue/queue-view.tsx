"use client";

import { useState, useEffect } from "react";

type QueueVisit = {
  visitId: string;
  tokenNumber: number;
  patientName: string;
  phoneNumber: string | null;
  visitDate: string;
};

type QueueDoctor = {
  doctorId: string;
  name: string;
  isPresent: boolean;
  currentToken: number;
  queue: QueueVisit[];
};

export default function QueueView() {
  const [queueDoctors, setQueueDoctors] = useState<QueueDoctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchQueue = async () => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/receptionist/queue");
      if (res.ok) {
        const data = await res.json();
        setQueueDoctors(data.doctors);
        setError("");
        setLastUpdated(new Date());
      } else {
        setError("Failed to load queue.");
      }
    } catch (err) {
      console.error("Failed to fetch queue", err);
      setError("Unable to connect to the clinic queue server.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchQueue();

    const eventSource = new EventSource("/api/request/stream");
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data && data.type === "QUEUE_UPDATE") {
          void fetchQueue();
        }
      } catch {
        // Ignore initial connection messages
      }
    };
    eventSource.onerror = () => {
      // EventSource reconnects automatically
    };
    return () => {
      eventSource.close();
    };
  }, []);

  const totalTokens = queueDoctors.reduce((sum, d) => sum + d.queue.length, 0);

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
      <header className="mb-6 md:mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-[var(--foreground)]">
            Today&apos;s Token Queue
          </h1>
          <p className="text-[var(--muted-foreground)] mt-1 text-xs sm:text-sm md:text-base">
            {new Date().toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
            {" · "}
            {totalTokens} token{totalTokens === 1 ? "" : "s"} issued
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          {lastUpdated && (
            <span className="text-[10px] sm:text-xs text-[var(--muted-foreground)]">
              Updated {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
          <button
            type="button"
            onClick={() => void fetchQueue()}
            disabled={refreshing}
            className="h-10 px-4 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--foreground)] transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </header>

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 text-sm text-[var(--muted-foreground)]">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--primary)] border-t-transparent animate-spin mb-3"></div>
          Loading live queue...
        </div>
      ) : totalTokens === 0 ? (
        <div className="card p-6 md:p-12 text-center text-sm text-[var(--muted-foreground)]">
          No tokens issued yet today.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {queueDoctors.map((doc) => {
            if (doc.queue.length === 0) return null;
            const nextToken = doc.queue.find((v) => v.tokenNumber > doc.currentToken);
            return (
              <div
                key={doc.doctorId}
                className="rounded-xl border border-[var(--border)] overflow-hidden flex flex-col"
              >
                <div className="flex items-center justify-between gap-2 px-3 sm:px-4 py-3 bg-[var(--muted)] border-b border-[var(--border)]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className={`h-2 w-2 rounded-full shrink-0 ${
                        doc.isPresent ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    />
                    <p className="text-sm font-semibold text-[var(--foreground)] truncate">
                      Dr. {doc.name}
                    </p>
                  </div>
                  <span className="text-[10px] text-[var(--muted-foreground)] shrink-0">
                    {doc.queue.length} waiting
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 px-3 sm:px-4 py-2.5 border-b border-[var(--border)] bg-[var(--background)]">
                  <div className="text-center">
                    <p className="text-[9px] sm:text-[10px] font-bold tracking-wider text-teal-700 uppercase">
                      Now Consulting
                    </p>
                    <p className="text-lg sm:text-xl font-black font-mono text-[var(--foreground)]">
                      {doc.currentToken > 0 ? `#${doc.currentToken}` : "—"}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] sm:text-[10px] font-bold tracking-wider text-amber-700 uppercase">
                      Up Next
                    </p>
                    <p className="text-lg sm:text-xl font-black font-mono text-[var(--foreground)]">
                      {nextToken ? `#${nextToken.tokenNumber}` : "—"}
                    </p>
                  </div>
                </div>

                <ul className="divide-y divide-[var(--border)] flex-1 overflow-y-auto max-h-[320px]">
                  {doc.queue.map((v) => {
                    const isCurrent = v.tokenNumber === doc.currentToken;
                    const isCalled = v.tokenNumber < doc.currentToken;
                    return (
                      <li
                        key={v.visitId}
                        className={`flex items-center gap-3 px-3 sm:px-4 py-2.5 ${
                          isCurrent
                            ? "bg-teal-50/70"
                            : isCalled
                              ? "opacity-50"
                              : ""
                        }`}
                      >
                        <span
                          className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono text-sm font-black shrink-0 border ${
                            isCurrent
                              ? "bg-[var(--primary)] text-[var(--primary-foreground)] border-transparent"
                              : "bg-[var(--background)] border-[var(--border)] text-[var(--foreground)]"
                          }`}
                        >
                          {v.tokenNumber}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[var(--foreground)] truncate">
                            {v.patientName}
                          </p>
                          <p className="text-xs text-[var(--muted-foreground)] truncate">
                            {v.phoneNumber || "—"}
                            {isCurrent ? " · Now consulting" : isCalled ? " · Done" : ""}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
