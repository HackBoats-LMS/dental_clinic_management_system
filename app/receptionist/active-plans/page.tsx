"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Session = {
  id: string;
  sessionNumber: number;
  scheduledDate: string;
  status: string;
};

type TreatmentPlan = {
  id: string;
  selectedProcedure: string;
  totalSessions: number;
  status: string;
  visit: {
    visitId: string;
    patient: { name: string; phoneNumber: string | null };
    familyMember: { name: string } | null;
    doctor: { name: string };
  };
  sessions: Session[];
};

export default function ActivePlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch("/api/receptionist/active-plans");
        if (res.ok) {
          const data = await res.json();
          setPlans(data.plans);
        } else {
          setError("Failed to fetch active plans.");
        }
      } catch (err) {
        console.error(err);
        setError("An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    }

    void fetchPlans();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-blue-600 mb-2"></div>
        <p className="text-xs">Loading active treatment plans...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
      <header className="mb-6 md:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-[var(--foreground)]">
          All Active Treatment Plans
        </h1>
        <p className="text-[var(--muted-foreground)] mt-1 text-xs sm:text-sm md:text-base">
          Manage all ongoing treatment plans across the clinic.
        </p>
      </header>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
          {error}
        </div>
      )}

      <div className="bg-[var(--background)] border border-[var(--border)] rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--muted)] border-b border-[var(--border)]">
              <tr>
                <th className="px-6 py-3.5 text-left font-semibold text-[var(--muted-foreground)] uppercase text-xs tracking-wider">Patient</th>
                <th className="px-6 py-3.5 text-left font-semibold text-[var(--muted-foreground)] uppercase text-xs tracking-wider">Doctor & Procedure</th>
                <th className="px-6 py-3.5 text-left font-semibold text-[var(--muted-foreground)] uppercase text-xs tracking-wider">Progress</th>
                <th className="px-6 py-3.5 text-left font-semibold text-[var(--muted-foreground)] uppercase text-xs tracking-wider">Next Session</th>
                <th className="px-6 py-3.5 text-right font-semibold text-[var(--muted-foreground)] uppercase text-xs tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {plans.map((plan) => {
                const patientName = plan.visit.familyMember?.name || plan.visit.patient.name;
                const activeSessions = plan.sessions.filter(s => s.status !== "CANCELLED");
                const completedCount = activeSessions.filter(s => s.status === "COMPLETED").length;
                const upcomingSession = activeSessions.find(s => s.status === "SCHEDULED");
                
                return (
                  <tr key={plan.id} className="hover:bg-[var(--accent)]/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-[var(--foreground)]">{patientName}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{plan.visit.patient.phoneNumber || "No phone"}</p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium text-[var(--foreground)] whitespace-nowrap">
                        Dr. {plan.visit.doctor.name}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)]">{plan.selectedProcedure}</p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-700">
                          {completedCount} / {plan.totalSessions}
                        </span>
                        <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-teal-500 rounded-full"
                            style={{ width: `${Math.min(100, (completedCount / plan.totalSessions) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {upcomingSession ? (
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {new Date(upcomingSession.scheduledDate).toLocaleDateString("en-GB", {
                              day: "numeric", month: "short", year: "numeric"
                            })}
                          </p>
                          <p className="text-[10px] text-teal-600 font-bold uppercase tracking-wider">
                            Session {upcomingSession.sessionNumber}
                          </p>
                        </div>
                      ) : activeSessions.length < plan.totalSessions ? (
                        <span className="text-xs text-amber-600 font-medium bg-amber-50 px-2 py-1 rounded border border-amber-200">
                          Needs Scheduling
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Fully Scheduled</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => router.push(`/receptionist/treatment-plan/${plan.visit.visitId}`)}
                        className="inline-flex items-center justify-center h-8 px-4 rounded-lg text-xs font-bold transition-all bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
                      >
                        Manage Plan
                      </button>
                    </td>
                  </tr>
                );
              })}
              {plans.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <p>No active treatment plans.</p>
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
