"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import NavBar from "../components/NavBar";

type Session = {
  id: string;
  sessionNumber: number;
  scheduledDate: string;
  status: string;
};

type Plan = {
  id: string;
  selectedProcedure: string;
  totalSessions: number;
  status: string;
  createdAt: string;
  sessions: Session[];
  visit: {
    visitId: string;
    visitDate: string;
    doctor: { name: string };
    familyMember: { name: string; relation: string } | null;
  };
};

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED: "bg-blue-50 text-blue-700 border-blue-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CANCELLED: "bg-slate-100 text-slate-500 border-slate-200",
};

const PLAN_STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  ACTIVE: "bg-teal-50 text-teal-700 border-teal-200",
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function TreatmentPlansPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      if (!session?.user?.profileComplete) {
        router.push("/patient/completeProfile");
      }
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const fetchPlans = async () => {
      try {
        const res = await fetch("/api/patient/treatment-plans");
        if (res.ok) {
          const data = await res.json();
          setPlans(data.plans);
        }
      } catch (err) {
        console.error("Failed to fetch treatment plans", err);
      } finally {
        setLoading(false);
      }
    };

    void fetchPlans();
  }, [status]);

  const now = new Date();

  const getUpcomingSessions = (sessions: Session[]) =>
    sessions.filter(
      (s) => s.status === "SCHEDULED" && new Date(s.scheduledDate) >= now
    );

  const userName = session?.user?.name || "Patient";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <NavBar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-5">
          <div>
            <span className="text-xs text-teal-700 font-bold tracking-wider uppercase block">
              My Treatment Plans
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
              Upcoming Sessions
            </h1>
          </div>
          <button
            onClick={() => router.push("/patient")}
            className="h-10 px-4 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold shadow-2xs transition-colors"
          >
            ← Dashboard
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12 space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-teal-600 border-t-transparent animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Loading treatment plans...</p>
          </div>
        ) : plans.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-md mx-auto space-y-4 shadow-2xs">
            <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto">
              <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-sm text-slate-500">No treatment plans yet.</p>
            <p className="text-xs text-slate-400">
              Treatment plans are created after your consultation with a doctor.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {plans.map((plan) => {
              const upcoming = getUpcomingSessions(plan.sessions);
              const completedCount = plan.sessions.filter(
                (s) => s.status === "COMPLETED"
              ).length;
              const scheduledCount = plan.sessions.filter(
                (s) => s.status === "SCHEDULED"
              ).length;
              const patientLabel = plan.visit.familyMember?.name || userName;

              return (
                <div
                  key={plan.id}
                  className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden"
                >
                  {/* Plan Header */}
                  <div className="p-5 sm:p-6 bg-slate-50/50 border-b border-slate-100 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h2 className="text-base font-bold text-slate-900">
                            {plan.selectedProcedure}
                          </h2>
                          <span
                            className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                              PLAN_STATUS_STYLES[plan.status] || PLAN_STATUS_STYLES.PENDING
                            }`}
                          >
                            {plan.status}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Dr. {plan.visit.doctor.name} · For:{" "}
                          <span className="font-semibold text-slate-700">{patientLabel}</span>
                          {plan.visit.familyMember && " (Family)"}
                        </p>
                      </div>

                      {/* Progress */}
                      <div className="flex items-center gap-4 text-xs">
                        <div className="text-center">
                          <span className="text-lg font-black text-slate-900 font-mono leading-none block">
                            {completedCount}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">Done</span>
                        </div>
                        <div className="w-px h-8 bg-slate-200" />
                        <div className="text-center">
                          <span className="text-lg font-black text-teal-700 font-mono leading-none block">
                            {scheduledCount}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">Upcoming</span>
                        </div>
                        <div className="w-px h-8 bg-slate-200" />
                        <div className="text-center">
                          <span className="text-lg font-black text-slate-400 font-mono leading-none block">
                            {plan.totalSessions}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">Total</span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 rounded-full h-1.5">
                      <div
                        className="bg-teal-600 h-1.5 rounded-full transition-all"
                        style={{
                          width: `${plan.totalSessions > 0 ? (completedCount / plan.totalSessions) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Sessions */}
                  <div className="p-5 sm:p-6 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Session Schedule
                    </h3>

                    {plan.sessions.length === 0 ? (
                      <p className="text-xs text-slate-500 py-3">
                        No sessions scheduled yet. Please visit the reception to schedule your
                        sessions.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {plan.sessions.map((session) => {
                          const date = new Date(session.scheduledDate);
                          const isPast = date < now;
                          const isNext =
                            session.status === "SCHEDULED" &&
                            !isPast &&
                            upcoming.length > 0 &&
                            upcoming[0].id === session.id;

                          return (
                            <div
                              key={session.id}
                              className={`flex items-center justify-between gap-4 p-3.5 rounded-xl border transition-all ${
                                isNext
                                  ? "bg-teal-50 border-teal-300 ring-1 ring-teal-200"
                                  : session.status === "CANCELLED"
                                    ? "bg-slate-50 border-slate-200 opacity-60"
                                    : "bg-white border-slate-200"
                              }`}
                            >
                              <div className="flex items-center gap-3">
                                <span
                                  className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold ${
                                    session.status === "COMPLETED"
                                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                      : isNext
                                        ? "bg-teal-100 text-teal-800 border border-teal-300"
                                        : "bg-slate-100 text-slate-600 border border-slate-200"
                                  }`}
                                >
                                  {session.status === "COMPLETED" ? "✓" : session.sessionNumber}
                                </span>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p
                                      className={`text-sm font-semibold ${
                                        session.status === "CANCELLED"
                                          ? "text-slate-400 line-through"
                                          : "text-slate-800"
                                      }`}
                                    >
                                      {date.toLocaleDateString("en-GB", {
                                        weekday: "short",
                                        day: "numeric",
                                        month: "short",
                                        year: "numeric",
                                      })}
                                    </p>
                                    {isNext && (
                                      <span className="px-1.5 py-0.5 rounded bg-teal-600 text-white text-[9px] font-bold uppercase">
                                        Next
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-400">
                                    Session {session.sessionNumber} of {plan.totalSessions}
                                    {session.status !== "CANCELLED" &&
                                      ` · ${date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`}
                                  </p>
                                </div>
                              </div>

                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  STATUS_STYLES[session.status] || STATUS_STYLES.SCHEDULED
                                }`}
                              >
                                {session.status}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Note */}
        <section className="p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-600 flex items-start gap-3 shadow-2xs">
          <div className="text-teal-700 mt-0.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="leading-relaxed">
            <strong className="text-slate-900 font-semibold">Note:</strong> Session dates are
            scheduled by the reception desk based on doctor availability. If you need to reschedule,
            please contact the front desk.
          </p>
        </section>
      </main>
    </div>
  );
}
