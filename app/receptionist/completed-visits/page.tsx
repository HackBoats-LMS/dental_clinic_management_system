"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Visit = {
  visitId: string;
  visitDate: string;
  consultationStatus: string;
  patient: { name: string; phoneNumber: string | null };
  familyMember: { name: string } | null;
  doctor: { name: string };
  procedures: string[];
  treatmentPlan: { status: string } | null;
};

export default function CompletedVisitsPage() {
  const router = useRouter();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchVisits() {
      try {
        const res = await fetch("/api/receptionist/completed-visits");
        if (res.ok) {
          const data = await res.json();
          setVisits(data.visits);
        } else {
          setError("Failed to fetch completed visits.");
        }
      } catch (err) {
        console.error(err);
        setError("An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    }

    void fetchVisits();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <div className="inline-block animate-spin rounded-full h-6 w-6 border-2 border-slate-300 border-t-blue-600 mb-2"></div>
        <p className="text-xs">Loading completed consultations...</p>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto w-full">
      <header className="mb-6 md:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold tracking-tight text-[var(--foreground)]">
          Treatment Planning Dashboard
        </h1>
        <p className="text-[var(--muted-foreground)] mt-1 text-xs sm:text-sm md:text-base">
          Manage post-consultation procedures and schedule treatment plans for today's completed visits.
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
                <th className="px-6 py-3.5 text-left font-semibold text-[var(--muted-foreground)] uppercase text-xs tracking-wider">Doctor</th>
                <th className="px-6 py-3.5 text-left font-semibold text-[var(--muted-foreground)] uppercase text-xs tracking-wider">Proposed Procedures</th>
                <th className="px-6 py-3.5 text-left font-semibold text-[var(--muted-foreground)] uppercase text-xs tracking-wider">Status</th>
                <th className="px-6 py-3.5 text-right font-semibold text-[var(--muted-foreground)] uppercase text-xs tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {visits.map((visit) => {
                const patientName = visit.familyMember?.name || visit.patient.name;
                const hasTreatmentPlan = !!visit.treatmentPlan;
                
                return (
                  <tr key={visit.visitId} className="hover:bg-[var(--accent)]/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-[var(--foreground)]">{patientName}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{visit.patient.phoneNumber || "No phone"}</p>
                    </td>
                    <td className="px-6 py-4 font-medium text-[var(--foreground)] whitespace-nowrap">
                      Dr. {visit.doctor.name}
                    </td>
                    <td className="px-6 py-4">
                      {visit.procedures && visit.procedures.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {visit.procedures.filter(Boolean).map((proc, i) => (
                            <span key={i} className="inline-flex px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded text-[10px] font-medium">
                              {proc}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">No procedures proposed</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {hasTreatmentPlan ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                          Plan Finalized
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></div>
                          Needs Plan
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => router.push(`/receptionist/treatment-plan/${visit.visitId}`)}
                        className={`inline-flex items-center justify-center h-8 px-4 rounded-lg text-xs font-bold transition-all ${
                          hasTreatmentPlan
                            ? "bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200"
                            : "bg-teal-600 text-white hover:bg-teal-700 shadow-sm"
                        }`}
                      >
                        {hasTreatmentPlan ? "View Plan" : "Finalize Plan"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {visits.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      <p>No completed consultations for today.</p>
                    </div>
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
