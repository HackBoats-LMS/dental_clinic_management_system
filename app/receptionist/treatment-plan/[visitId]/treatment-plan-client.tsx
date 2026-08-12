"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

type VisitData = {
  visitId: string;
  visitDate: string;
  problems: string[];
  procedures: string[];
  patient: { patientId: string; name: string; phoneNumber: string | null };
  doctor: { doctorId: string; name: string };
  familyMember: { name: string; relation: string | null } | null;
};

type SessionData = {
  id: string;
  sessionNumber: number;
  scheduledDate: string;
  status: string;
};

type TreatmentPlanData = {
  id: string;
  selectedProcedure: string;
  totalSessions: number;
  status: string;
  sessions: SessionData[];
};

type AvailableDate = {
  date: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function TreatmentPlanClient({
  visit,
  existingPlan,
}: {
  visit: VisitData;
  existingPlan: TreatmentPlanData | null;
}) {
  const router = useRouter();
  const [plan, setPlan] = useState<TreatmentPlanData | null>(existingPlan);

  // Form state
  const [selectedProcedure, setSelectedProcedure] = useState(existingPlan?.selectedProcedure || "");
  const [totalSessions, setTotalSessions] = useState(existingPlan?.totalSessions || 1);
  const [firstSessionDate, setFirstSessionDate] = useState("");
  const [availableDates, setAvailableDates] = useState<AvailableDate[]>([]);
  const [loadingDates, setLoadingDates] = useState(false);

  const [creating, setCreating] = useState(false);
  const [addingSession, setAddingSession] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Fetch available dates when procedure is selected
  useEffect(() => {
    if (!selectedProcedure || !visit.doctor.doctorId) return;

    const fetchAvailability = async () => {
      setLoadingDates(true);
      try {
        const startDate = new Date().toISOString().split("T")[0];
        const endDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
          .toISOString()
          .split("T")[0];
        const res = await fetch(
          `/api/receptionist/doctor-availability?doctorId=${visit.doctor.doctorId}&startDate=${startDate}&endDate=${endDate}`
        );
        if (res.ok) {
          const data = await res.json();
          setAvailableDates(data.availableDates);
        }
      } catch (err) {
        console.error("Failed to fetch availability", err);
      } finally {
        setLoadingDates(false);
      }
    };

    void fetchAvailability();
  }, [selectedProcedure, visit.doctor.doctorId]);

  const handleCreatePlan = async () => {
    if (!selectedProcedure || !totalSessions) {
      setError("Please select a procedure and number of sessions.");
      return;
    }

    setCreating(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/receptionist/treatment-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitId: visit.visitId,
          selectedProcedure,
          totalSessions,
          firstSessionDate: firstSessionDate || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create treatment plan");
      }

      setPlan(data.plan);
      setSuccess("Treatment plan created successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create plan");
    } finally {
      setCreating(false);
    }
  };

  const handleAddSession = async (date: string) => {
    if (!plan) return;
    setAddingSession(true);
    setError("");

    try {
      const res = await fetch(`/api/receptionist/treatment-plan/${plan.id}/sessions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduledDate: date }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add session");
      }

      // Refresh the plan
      const planRes = await fetch(`/api/receptionist/treatment-plan?visitId=${visit.visitId}`);
      if (planRes.ok) {
        const planData = await planRes.json();
        setPlan(planData.plan);
      }
      setFirstSessionDate("");
      setSuccess("Session scheduled!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add session");
    } finally {
      setAddingSession(false);
    }
  };

  const handleCancelSession = async (sessionId: string) => {
    if (!plan) return;
    try {
      await fetch(`/api/receptionist/treatment-plan/${plan.id}/sessions`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, status: "CANCELLED" }),
      });

      const planRes = await fetch(`/api/receptionist/treatment-plan?visitId=${visit.visitId}`);
      if (planRes.ok) {
        const planData = await planRes.json();
        setPlan(planData.plan);
      }
    } catch (err) {
      console.error("Failed to cancel session", err);
    }
  };

  const handleMarkComplete = async () => {
    if (!plan) return;
    try {
      await fetch("/api/receptionist/treatment-plan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id, status: "COMPLETED" }),
      });

      const planRes = await fetch(`/api/receptionist/treatment-plan?visitId=${visit.visitId}`);
      if (planRes.ok) {
        const planData = await planRes.json();
        setPlan(planData.plan);
      }
      setSuccess("Treatment plan marked as completed!");
    } catch (err) {
      console.error("Failed to complete plan", err);
    }
  };

  const patientName = visit.familyMember?.name || visit.patient.name;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <header className="sticky top-0 z-30 w-full bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900">Treatment Plan</h1>
            <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
              {patientName} · Dr. {visit.doctor.name}
            </p>
          </div>
          <button
            onClick={() => router.back()}
            className="h-9 px-3.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors"
          >
            ← Back
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
            {success}
          </div>
        )}

        {/* Consultation Summary */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
          <h2 className="text-sm font-bold text-slate-800">Consultation Summary</h2>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 block font-medium">Patient</span>
              <span className="text-slate-800 font-semibold">{patientName}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Phone</span>
              <span className="text-slate-800 font-semibold">
                {visit.patient.phoneNumber || "—"}
              </span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Doctor</span>
              <span className="text-slate-800 font-semibold">Dr. {visit.doctor.name}</span>
            </div>
            <div>
              <span className="text-slate-400 block font-medium">Visit Date</span>
              <span className="text-slate-800 font-semibold">
                {new Date(visit.visitDate).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>

          {/* Problems */}
          <div>
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Problems Identified
            </h3>
            {visit.problems.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {visit.problems.map((p, i) => (
                  <span
                    key={i}
                    className="px-2.5 py-1 rounded-lg bg-red-50 text-red-800 text-[11px] font-semibold border border-red-200"
                  >
                    {p}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No problems recorded</p>
            )}
          </div>

          {/* Proposed Procedures */}
          <div>
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              Proposed Procedures
            </h3>
            {visit.procedures.length > 0 ? (
              <ol className="list-decimal pl-4 text-xs text-slate-700 space-y-1">
                {visit.procedures.map((p, i) => (
                  <li key={i} className="font-medium">
                    {p}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-slate-400 italic">No procedures proposed</p>
            )}
          </div>
        </div>

        {/* Treatment Plan */}
        {!plan ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
            <h2 className="text-sm font-bold text-slate-800">Create Treatment Plan</h2>
            <p className="text-xs text-slate-500">
              Select which procedure to proceed with and schedule sessions.
            </p>

            {/* Procedure Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Select Procedure
              </label>
              <div className="space-y-1.5">
                {visit.procedures.map((proc, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setSelectedProcedure(proc)}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-all ${
                      selectedProcedure === proc
                        ? "bg-teal-50 border-teal-300 text-teal-900"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    {proc}
                  </button>
                ))}
              </div>
            </div>

            {/* Total Sessions */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Total Sessions
              </label>
              <input
                type="number"
                min={1}
                max={20}
                value={totalSessions}
                onChange={(e) => setTotalSessions(parseInt(e.target.value) || 1)}
                className="w-24 h-10 px-3 rounded-xl border border-slate-300 text-sm text-slate-800 focus:ring-2 focus:ring-teal-200 focus:border-teal-400 outline-none"
              />
            </div>

            {/* First Session Date */}
            {selectedProcedure && (
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  First Session Date {loadingDates && "(Loading availability...)"}
                </label>
                {availableDates.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {availableDates.slice(0, 12).map((d) => {
                      const date = new Date(d.date);
                      const isSelected = firstSessionDate === d.date;
                      return (
                        <button
                          key={d.date}
                          type="button"
                          onClick={() => setFirstSessionDate(d.date)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            isSelected
                              ? "bg-teal-50 border-teal-300"
                              : "bg-white border-slate-200 hover:bg-slate-50"
                          }`}
                        >
                          <p className="text-xs font-bold text-slate-800">
                            {DAY_NAMES[date.getDay()]} {date.getDate()}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {date.toLocaleDateString("en-GB", { month: "short" })} ·{" "}
                            {d.startTime}–{d.endTime}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  !loadingDates && (
                    <p className="text-xs text-slate-400 italic">
                      No available dates found for this doctor in the next 60 days.
                    </p>
                  )
                )}
                <p className="text-[10px] text-slate-400">
                  Optional — you can also schedule the first session later.
                </p>
              </div>
            )}

            <button
              onClick={() => void handleCreatePlan()}
              disabled={creating || !selectedProcedure}
              className="h-12 px-6 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create Treatment Plan"}
            </button>
          </div>
        ) : (
          /* Existing Plan View */
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-800">Treatment Plan</h2>
              <span
                className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                  plan.status === "COMPLETED"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : plan.status === "ACTIVE"
                      ? "bg-teal-50 text-teal-700 border-teal-200"
                      : "bg-amber-50 text-amber-700 border-amber-200"
                }`}
              >
                {plan.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Procedure</span>
                <span className="text-slate-800 font-semibold">{plan.selectedProcedure}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Sessions</span>
                <span className="text-slate-800 font-semibold">
                  {plan.sessions.filter((s) => s.status !== "CANCELLED").length} / {plan.totalSessions}{" "}
                  scheduled
                </span>
              </div>
            </div>

            {/* Scheduled Sessions */}
            <div>
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">
                Scheduled Sessions
              </h3>
              {plan.sessions.length > 0 ? (
                <div className="space-y-2">
                  {plan.sessions.map((session) => {
                    const date = new Date(session.scheduledDate);
                    const isCancelled = session.status === "CANCELLED";
                    return (
                      <div
                        key={session.id}
                        className={`flex items-center justify-between gap-4 p-3 rounded-xl border ${
                          isCancelled
                            ? "bg-slate-50 border-slate-200 opacity-60"
                            : "bg-white border-slate-200"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                              isCancelled
                                ? "bg-slate-100 text-slate-400"
                                : "bg-teal-50 text-teal-700 border border-teal-200"
                            }`}
                          >
                            {session.sessionNumber}
                          </span>
                          <div>
                            <p
                              className={`text-sm font-semibold ${
                                isCancelled ? "text-slate-400 line-through" : "text-slate-800"
                              }`}
                            >
                              {date.toLocaleDateString("en-GB", {
                                weekday: "short",
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                            <p className="text-[10px] text-slate-400 capitalize">
                              {session.status.toLowerCase()}
                            </p>
                          </div>
                        </div>
                        {!isCancelled && session.status !== "COMPLETED" && (
                          <button
                            onClick={() => void handleCancelSession(session.id)}
                            className="text-[10px] font-semibold text-red-600 hover:text-red-800"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No sessions scheduled yet.</p>
              )}
            </div>

            {/* Add Session */}
            {plan.sessions.filter((s) => s.status !== "CANCELLED").length < plan.totalSessions && (
              <div className="border-t border-slate-100 pt-4">
                <h3 className="text-xs font-bold text-slate-700 mb-2">Add Next Session</h3>
                {loadingDates ? (
                  <p className="text-xs text-slate-400">Loading available dates...</p>
                ) : availableDates.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {availableDates.slice(0, 9).map((d) => {
                      const date = new Date(d.date);
                      return (
                        <button
                          key={d.date}
                          type="button"
                          onClick={() => void handleAddSession(d.date)}
                          disabled={addingSession}
                          className="p-3 rounded-xl border border-slate-200 bg-white hover:bg-teal-50 hover:border-teal-300 text-left transition-all disabled:opacity-50"
                        >
                          <p className="text-xs font-bold text-slate-800">
                            {DAY_NAMES[date.getDay()]} {date.getDate()}
                          </p>
                          <p className="text-[10px] text-slate-500">
                            {date.toLocaleDateString("en-GB", { month: "short" })} ·{" "}
                            {d.startTime}–{d.endTime}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">
                    No more available dates for this doctor.
                  </p>
                )}
              </div>
            )}

            {/* Mark Complete */}
            {plan.status !== "COMPLETED" &&
              plan.sessions.filter((s) => s.status === "COMPLETED").length >= plan.totalSessions && (
                <button
                  onClick={() => void handleMarkComplete()}
                  className="h-11 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98]"
                >
                  Mark Plan as Completed
                </button>
              )}
          </div>
        )}
      </main>
    </div>
  );
}
