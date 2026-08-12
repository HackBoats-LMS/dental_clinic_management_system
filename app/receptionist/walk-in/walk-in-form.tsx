"use client";

import { useState } from "react";

type Doctor = { doctorId: string; name: string };

type OpItem = {
  opId: string;
  createdAt: Date;
  patient: { name: string; phoneNumber: string | null };
  doctor: { name: string };
  visits: Array<{ tokenNumber: number }>;
  requests: Array<{ status: string }>;
};

type LookupOp = {
  opId: string;
  doctor: { name: string };
  requests: Array<{ status: string }>;
  checkedInToday: boolean;
  tokenNumber: number | null;
  expiresAt: string;
  expired: boolean;
};

type LookupPatient = {
  patient: {
    patientId: string;
    name: string;
    phoneNumber: string | null;
  };
  ops: LookupOp[];
};

type Result = {
  kind: "token" | "op";
  tokenNumber?: number;
  patientName: string;
};

export default function WalkInForm({
  doctors,
  todayOps,
}: {
  doctors: Doctor[];
  todayOps: OpItem[];
}) {
  const [name, setName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [email, setEmail] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const [ops, setOps] = useState<OpItem[]>(todayOps);

  // Lookup state
  const [lookupQuery, setLookupQuery] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState("");
  const [lookupResult, setLookupResult] = useState<LookupPatient[] | null>(null);
  const [expandedPatientId, setExpandedPatientId] = useState<string | null>(null);
  const [issuingOpId, setIssuingOpId] = useState<string | null>(null);
  const [quickDoctorId, setQuickDoctorId] = useState("");
  const [creatingQuickOp, setCreatingQuickOp] = useState(false);

  const runLookup = async (query: string) => {
    setLookupError("");
    setLookupResult(null);
    setExpandedPatientId(null);
    setLookupLoading(true);
    try {
      const trimmed = query.trim();
      const isPhone = /^[\d+\-\s()]+$/.test(trimmed);
      const res = await fetch(
        `/api/receptionist/walk-in?${isPhone ? `phone=${encodeURIComponent(trimmed)}` : `name=${encodeURIComponent(trimmed)}`}`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Lookup failed");
      }
      setLookupResult(data.patients);
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : "Lookup failed");
    } finally {
      setLookupLoading(false);
    }
  };

  const handleLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupQuery.trim()) return;
    void runLookup(lookupQuery);
  };

  const handleCheckInOp = async (opId: string) => {
    setIssuingOpId(opId);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/receptionist/walk-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ opId, issueToken: true }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to check in customer");
      }

      setResult({ kind: "token", tokenNumber: data.tokenNumber, patientName: data.patient.name });
      setOps((prev) => [
        {
          opId: data.op.opId,
          createdAt: new Date(),
          patient: { name: data.patient.name, phoneNumber: data.patient.phoneNumber },
          doctor: { name: data.op.doctor?.name || "" },
          visits: [{ tokenNumber: data.tokenNumber }],
          requests: [{ status: "APPROVED" }],
        },
        ...prev,
      ]);
      // Refresh the lookup so the OP shows as checked in.
      if (lookupQuery.trim()) {
        void runLookup(lookupQuery);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to check in customer");
    } finally {
      setIssuingOpId(null);
    }
  };

  const handleQuickCreateOp = async (patientId: string, patientName: string, patientPhone: string | null) => {
    if (!quickDoctorId) return;
    setCreatingQuickOp(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/receptionist/walk-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          patientId,
          name: patientName,
          phoneNumber: patientPhone || undefined,
          doctorId: quickDoctorId,
          issueToken: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create OP");
      }

      const doctorName = doctors.find((d) => d.doctorId === quickDoctorId)?.name || "";
      setResult({ kind: "token", tokenNumber: data.tokenNumber, patientName: data.patient.name });
      setOps((prev) => [
        {
          opId: data.op.opId,
          createdAt: new Date(data.op.createdAt),
          patient: { name: data.patient.name, phoneNumber: data.patient.phoneNumber },
          doctor: { name: doctorName },
          visits: [{ tokenNumber: data.tokenNumber }],
          requests: [{ status: "APPROVED" }],
        },
        ...prev,
      ]);
      setQuickDoctorId("");
      if (lookupQuery.trim()) {
        void runLookup(lookupQuery);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create OP");
    } finally {
      setCreatingQuickOp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const submitter = (e.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const issueToken = submitter?.value !== "op";

    setError("");
    setResult(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/receptionist/walk-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phoneNumber, email, doctorId, issueToken }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to register patient");
      }

      const doctorName = doctors.find((d) => d.doctorId === doctorId)?.name || "";
      setResult({
        kind: issueToken ? "token" : "op",
        tokenNumber: data.tokenNumber,
        patientName: data.patient.name,
      });
      setOps((prev) => [
        {
          opId: data.op.opId,
          createdAt: new Date(data.op.createdAt),
          patient: { name: data.patient.name, phoneNumber: data.patient.phoneNumber },
          doctor: { name: doctorName },
          visits: issueToken ? [{ tokenNumber: data.tokenNumber }] : [],
          requests: [{ status: "APPROVED" }],
        },
        ...prev,
      ]);
      setName("");
      setPhoneNumber("");
      setEmail("");
      setDoctorId("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register patient");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
      <header className="mb-8 md:mb-10">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[var(--foreground)]">
          Walk-in &amp; OP Registration
        </h1>
        <p className="text-[var(--muted-foreground)] mt-1 text-sm md:text-base">
          Look up an existing customer by name or phone, create OPs for walk-ins, and issue queue
          tokens.
        </p>
      </header>

      {result && (
        <div className="mb-6 rounded-xl border border-teal-200 bg-teal-50 p-6 text-center">
          <span className="text-[10px] font-bold tracking-wider text-teal-800 uppercase block">
            {result.kind === "token" ? "Token Issued" : "OP Created"}
          </span>
          {result.kind === "token" ? (
            <span className="text-5xl font-black text-teal-900 font-mono block mt-1">
              #{result.tokenNumber}
            </span>
          ) : (
            <span className="text-2xl font-bold text-teal-900 block mt-1">✓</span>
          )}
          <p className="text-sm text-teal-800 mt-1">{result.patientName}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Look up existing customer */}
      <section className="card p-6 mb-8">
        <h2 className="text-base font-semibold text-[var(--foreground)] mb-1">
          Look up existing customer
        </h2>
        <p className="text-xs text-[var(--muted-foreground)] mb-4">
          Search by phone number or name to reuse an active OP and issue a token.
        </p>
        <form onSubmit={handleLookup} className="flex gap-3">
          <input
            type="text"
            value={lookupQuery}
            onChange={(e) => setLookupQuery(e.target.value)}
            placeholder="Phone number or customer name"
            className="flex-1 px-3.5 h-11 rounded-xl bg-[var(--background)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] transition-colors"
          />
          <button
            type="submit"
            disabled={lookupLoading || !lookupQuery.trim()}
            className="h-11 px-5 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--foreground)] transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {lookupLoading ? "Searching..." : "Search"}
          </button>
        </form>

        {lookupError && (
          <p className="mt-4 text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg p-3">
            {lookupError}
          </p>
        )}

        {lookupResult &&
          (lookupResult.length === 0 ? (
            <p className="mt-4 text-sm text-[var(--muted-foreground)]">
              No customer found with this name or phone. Register below to create a new OP.
            </p>
          ) : (
            <div className="mt-4 space-y-2">
              {lookupResult.map((item) => {
                const isExpanded = expandedPatientId === item.patient.patientId;
                const hasOps = item.ops.length > 0;
                return (
                  <div
                    key={item.patient.patientId}
                    className="bg-[var(--background)] border border-[var(--border)] rounded-xl overflow-hidden"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedPatientId(isExpanded ? null : item.patient.patientId)
                      }
                      className={`w-full flex items-center justify-between gap-4 px-4 py-3 text-left transition-colors hover:bg-[var(--accent)] ${
                        isExpanded ? "border-b border-[var(--border)]" : ""
                      }`}
                    >
                      <p className="text-sm font-semibold text-[var(--foreground)]">
                        {item.patient.name}
                        <span className="ml-2 text-xs font-normal text-[var(--muted-foreground)]">
                          {item.patient.phoneNumber || "—"}
                        </span>
                      </p>
                      <span
                        className={`text-xs text-[var(--muted-foreground)] transition-transform ${
                          isExpanded ? "rotate-90" : ""
                        }`}
                      >
                        ▸
                      </span>
                    </button>

                    {isExpanded &&
                      (hasOps ? (
                        <div className="p-3 space-y-2">
                          {item.ops.map((op) => {
                            const status = op.requests[0]?.status || "PENDING";
                            const expiryLabel = new Date(op.expiresAt).toLocaleString([], {
                              day: "2-digit",
                              month: "short",
                              hour: "2-digit",
                              minute: "2-digit",
                            });
                            return (
                              <div
                                key={op.opId}
                                className="flex items-center justify-between gap-4 border border-[var(--border)] rounded-lg px-3 py-2.5"
                              >
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-[var(--foreground)] truncate">
                                    Dr. {op.doctor.name}
                                  </p>
                                  <p className="text-xs text-[var(--muted-foreground)]">
                                    {op.expired
                                      ? `Expired · ${expiryLabel}`
                                      : op.checkedInToday
                                        ? `Checked in today · Token #${op.tokenNumber} · Valid till ${expiryLabel}`
                                        : `Status: ${status} · Valid till ${expiryLabel}`}
                                  </p>
                                </div>
                                {op.expired ? (
                                  <span className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-full px-2.5 py-1 shrink-0">
                                    Expired
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => void handleCheckInOp(op.opId)}
                                    disabled={issuingOpId === op.opId || status !== "APPROVED"}
                                    className="h-10 px-4 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-semibold transition-all active:scale-[0.98] disabled:opacity-50 shrink-0"
                                  >
                                    {issuingOpId === op.opId
                                      ? "Issuing..."
                                      : op.checkedInToday
                                        ? "Issue Next Token"
                                        : "Issue Token"}
                                  </button>
                                )}
                              </div>
                            );
                          })}

                          <div className="border-t border-[var(--border)] pt-3">
                            <p className="text-xs text-[var(--muted-foreground)] mb-2">
                              Create a new OP for this customer:
                            </p>
                            <div className="flex gap-2">
                              <select
                                value={quickDoctorId}
                                onChange={(e) => setQuickDoctorId(e.target.value)}
                                className="flex-1 h-10 px-3 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                              >
                                <option value="">Select doctor</option>
                                {doctors.map((d) => (
                                  <option key={d.doctorId} value={d.doctorId}>
                                    {d.name}
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() =>
                                  void handleQuickCreateOp(
                                    item.patient.patientId,
                                    item.patient.name,
                                    item.patient.phoneNumber
                                  )
                                }
                                disabled={creatingQuickOp || !quickDoctorId}
                                className="h-10 px-4 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-semibold transition-all active:scale-[0.98] disabled:opacity-50 shrink-0"
                              >
                                {creatingQuickOp ? "Creating..." : "Create OP &amp; Token"}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 space-y-2">
                          <p className="text-sm text-[var(--muted-foreground)]">
                            No active OPs. Create one now:
                          </p>
                          <div className="flex gap-2">
                            <select
                              value={quickDoctorId}
                              onChange={(e) => setQuickDoctorId(e.target.value)}
                              className="flex-1 h-10 px-3 rounded-lg bg-[var(--background)] border border-[var(--border)] text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                            >
                              <option value="">Select doctor</option>
                              {doctors.map((d) => (
                                <option key={d.doctorId} value={d.doctorId}>
                                  {d.name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() =>
                                void handleQuickCreateOp(
                                  item.patient.patientId,
                                  item.patient.name,
                                  item.patient.phoneNumber
                                )
                              }
                              disabled={creatingQuickOp || !quickDoctorId}
                              className="h-10 px-4 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] text-xs font-semibold transition-all active:scale-[0.98] disabled:opacity-50 shrink-0"
                            >
                              {creatingQuickOp ? "Creating..." : "Create OP &amp; Token"}
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                );
              })}
            </div>
          ))}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Registration form */}
        <section className="lg:col-span-7 card p-6">
          <h2 className="text-base font-semibold text-[var(--foreground)] mb-4">
            New Walk-in / OP Registration
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">
                Full Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ravi Kumar"
                className="w-full px-3.5 h-11 rounded-xl bg-[var(--background)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] transition-colors"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">
                  Phone Number
                </label>
                <input
                  type="tel"
                  required
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3.5 h-11 rounded-xl bg-[var(--background)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">
                  Email (optional)
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@email.com"
                  className="w-full px-3.5 h-11 rounded-xl bg-[var(--background)] border border-[var(--border)] text-sm text-[var(--foreground)] placeholder-[var(--muted-foreground)] focus:outline-none focus:border-[var(--primary)] transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--muted-foreground)] mb-1.5">
                Attending Specialist
              </label>
              <select
                required
                value={doctorId}
                onChange={(e) => setDoctorId(e.target.value)}
                className="w-full px-3.5 h-11 rounded-xl bg-[var(--background)] border border-[var(--border)] text-sm text-[var(--foreground)] focus:outline-none focus:border-[var(--primary)] transition-colors"
              >
                <option value="">Select a doctor</option>
                {doctors.map((d) => (
                  <option key={d.doctorId} value={d.doctorId}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="submit"
                value="op"
                disabled={submitting}
                className="h-12 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--foreground)] transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? "Creating..." : "Create OP"}
              </button>
              <button
                type="submit"
                value="token"
                disabled={submitting}
                className="h-12 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? "Issuing token..." : "Create OP &amp; Issue Token"}
              </button>
            </div>
            <p className="text-xs text-[var(--muted-foreground)]">
              &quot;Create OP&quot; records the registration for a later visit. &quot;Create OP &amp;
              Issue Token&quot; also puts the customer in today&apos;s queue right now.
            </p>
          </form>
        </section>

        {/* Today's registrations */}
        <section className="lg:col-span-5 space-y-3">
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Today&apos;s Registrations
          </h2>
          {ops.length === 0 ? (
            <div className="card p-6 text-center text-sm text-[var(--muted-foreground)]">
              No registrations today.
            </div>
          ) : (
            ops.slice(0, 10).map((op) => {
              const token = op.visits[0]?.tokenNumber;
              const status = op.requests[0]?.status || "PENDING";
              return (
                <div key={op.opId} className="card p-4 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--foreground)] truncate">
                      {op.patient.name}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)] truncate">
                      Dr. {op.doctor.name} · {op.patient.phoneNumber || "—"}
                    </p>
                  </div>
                  {token ? (
                    <span className="text-lg font-black text-[var(--primary)] font-mono shrink-0">
                      #{token}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-teal-700 bg-teal-50 border border-teal-200 rounded-full px-2.5 py-1 shrink-0">
                      OP · {status}
                    </span>
                  )}
                </div>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}
