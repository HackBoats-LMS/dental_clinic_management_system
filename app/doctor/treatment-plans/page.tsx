"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

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
  updatedAt: string;
  visit: {
    visitId: string;
    patient: { name: string; phoneNumber: string | null };
    familyMember: { name: string; phoneNumber: string | null } | null;
  };
  sessions: Session[];
};

export default function DoctorTreatmentPlansPage() {
  const router = useRouter();
  const { data: session, status: authStatus } = useSession();
  
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
  const [plans, setPlans] = useState<TreatmentPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (authStatus === "unauthenticated") {
      router.push("/auth/signin");
    } else if (authStatus === "authenticated" && session?.user?.role !== "doctor") {
      router.push("/");
    }
  }, [authStatus, session, router]);

  useEffect(() => {
    if (authStatus !== "authenticated") return;

    async function fetchPlans() {
      setLoading(true);
      try {
        const res = await fetch(`/api/doctor/treatment-plans?status=${activeTab}`);
        if (res.ok) {
          const data = await res.json();
          setPlans(data.plans);
        } else {
          setError("Failed to fetch treatment plans.");
        }
      } catch (err) {
        console.error(err);
        setError("An unexpected error occurred.");
      } finally {
        setLoading(false);
      }
    }

    void fetchPlans();
  }, [activeTab, authStatus]);

  if (authStatus === "loading") return null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 w-full bg-white text-slate-800 border-b border-slate-200 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push("/doctor")}>
            <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 font-bold text-sm">
              ✦
            </div>
            <div>
              <span className="text-sm font-bold tracking-tight text-slate-950 block leading-tight">
                Specialist Dashboard
              </span>
              <span className="text-[9px] text-teal-700 font-semibold tracking-wider uppercase block">
                Kothamass Dental
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/doctor")}
              className="hidden sm:inline-flex h-9 px-3.5 items-center rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
            >
              ⬅ Back to Queue
            </button>

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">Signed in as</span>
              <span className="text-xs font-bold text-slate-800">{session?.user?.name || "Doctor"}</span>
            </div>

            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="h-9 px-3.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors"
            >
              Log out
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
              Treatment Plans
            </h1>
            <p className="text-sm text-slate-500 mt-1">
              Manage your patients' ongoing and completed procedures.
            </p>
          </div>

          <div className="flex bg-slate-200/50 p-1 rounded-xl w-fit">
            <button
              onClick={() => setActiveTab("active")}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === "active"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Upcoming / Active
            </button>
            <button
              onClick={() => setActiveTab("completed")}
              className={`px-5 py-2 rounded-lg text-sm font-bold transition-all ${
                activeTab === "completed"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Finished
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm font-semibold">
            {error}
          </div>
        )}

        {loading ? (
          <div className="py-12 text-center text-slate-400">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-2 border-teal-600 border-t-transparent mb-4"></div>
            <p className="text-sm font-semibold">Loading plans...</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {plans.length === 0 ? (
              <div className="py-12 text-center text-slate-500 bg-white border border-slate-200 rounded-2xl shadow-2xs">
                <p className="font-semibold">No {activeTab} treatment plans found.</p>
              </div>
            ) : (
              plans.map((plan) => {
                const patientName = plan.visit.familyMember?.name || plan.visit.patient.name;
                const phone = plan.visit.familyMember?.phoneNumber || plan.visit.patient.phoneNumber;
                
                const activeSessions = plan.sessions.filter(s => s.status !== "CANCELLED");
                const completedCount = activeSessions.filter(s => s.status === "COMPLETED").length;
                const upcomingSession = activeSessions.find(s => s.status === "SCHEDULED");

                return (
                  <div key={plan.id} className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-2xs hover:border-teal-200 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      
                      {/* Patient Info & Procedure */}
                      <div className="flex items-start gap-4 flex-1">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-lg font-black shrink-0">
                          {patientName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <h3 className="text-base font-extrabold text-slate-900">
                            {patientName}
                          </h3>
                          <p className="text-xs text-slate-500 font-medium mb-1">
                            {phone || "No phone"}
                          </p>
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-teal-50 text-teal-700 border border-teal-200">
                            {plan.selectedProcedure}
                          </span>
                        </div>
                      </div>

                      {/* Progress & Next Session */}
                      <div className="flex items-center gap-8 sm:pr-8">
                        {/* Progress */}
                        <div className="w-32">
                          <div className="flex justify-between text-[10px] font-bold tracking-wider text-slate-500 uppercase mb-1.5">
                            <span>Progress</span>
                            <span className="text-slate-800">{completedCount} / {plan.totalSessions}</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full transition-all duration-500 ${
                                plan.status === "COMPLETED" ? "bg-emerald-500" : "bg-teal-500"
                              }`}
                              style={{ width: `${Math.min(100, (completedCount / plan.totalSessions) * 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Next Session Date */}
                        <div className="min-w-[120px]">
                          <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block mb-1">
                            {plan.status === "COMPLETED" ? "Finished On" : "Next Session"}
                          </span>
                          {plan.status === "COMPLETED" ? (
                            <span className="text-sm font-semibold text-emerald-700">
                              {new Date(plan.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                            </span>
                          ) : upcomingSession ? (
                            <div>
                              <span className="text-sm font-semibold text-slate-900 block leading-tight">
                                {new Date(upcomingSession.scheduledDate).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                              </span>
                              <span className="text-[10px] font-bold text-teal-600">
                                Session {upcomingSession.sessionNumber}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs font-semibold text-amber-600">
                              Needs Scheduling
                            </span>
                          )}
                        </div>
                      </div>

                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>
    </div>
  );
}
