"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import NavBar from "./components/NavBar";

interface OpSlip {
  opId: string;
  createdAt: string;
  doctor?: { name: string } | null;
  familyMember?: { name: string } | null;
  requests?: Array<{ status: string }>;
  visits?: Array<{ visitId: string; isVerified: boolean; tokenNumber: number }>;
}

export default function PatientPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [opSlips, setOpSlips] = useState<OpSlip[]>([]);
  const [loadingOps, setLoadingOps] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchOPs = async () => {
    try {
      const res = await fetch("/api/patient/op");
      const data = res.ok ? await res.json() : [];
      setOpSlips(data);
    } catch (err) {
      console.error("Error fetching OPs:", err);
    } finally {
      setLoadingOps(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    if (status === "authenticated") {
      void fetchOPs();
    }
  }, [status]);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      const user = session?.user;
      if (!user?.profileComplete) {
        router.push("/patient/completeProfile");
      }
    }
  }, [status, session, router]);

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[#065268] border-t-transparent animate-spin"></div>
          <span className="text-xs text-slate-500 font-medium tracking-wide">Loading your profile...</span>
        </div>
      </div>
    );
  }

  const userName = session?.user?.name || "Patient";

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans selection:bg-[#065268] selection:text-white">
      <NavBar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 sm:px-8 py-12 md:py-16 space-y-12">
        {/* Welcome Banner */}
        <section className="relative w-full rounded-[32px] overflow-hidden bg-[#065268]">
          <div className="absolute inset-0 z-0">
             <div className="absolute inset-0 bg-gradient-to-br from-[#065268] to-[#043e4f]" />
          </div>
          <div className="relative z-10 px-8 py-12 md:py-16 md:px-12 max-w-3xl space-y-4">
            <span className="text-[10px] font-black tracking-widest text-white/80 uppercase block">
              PATIENT CARE CENTER
            </span>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-light tracking-tight text-white leading-[1.05]">
              Welcome, <br />
              <span className="font-semibold">{userName}</span>
            </h1>
            <p className="text-sm md:text-base text-white/80 font-light leading-relaxed max-w-lg pt-2">
              Book consultations, manage out-patient tokens, and register family members securely under your clinic profile.
            </p>
          </div>
        </section>

        {/* Quick Action Grid */}
        <section className="space-y-6">
          <h2 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[#065268]/80 block px-1">
            Clinical Services
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {/* Card 1: Out-Patient (OP) Registration */}
            <div className="bg-[#FAF9F6] rounded-[24px] sm:rounded-[32px] p-6 sm:p-8 flex flex-col justify-between text-left border border-slate-100/50 hover:border-[#065268]/20 transition-colors duration-300 shadow-sm hover:shadow-md">
              <div className="space-y-5">
                <div className="w-12 h-12 rounded-full bg-white border border-slate-100 text-[#065268] flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">New OP Consultation</h3>
                  <p className="text-xs sm:text-sm text-slate-500 font-light leading-relaxed mt-2">
                    Generate an Out Patient slip for yourself or a registered family member to consult with our specialists.
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push("/patient/create/op")}
                className="w-full h-12 mt-6 rounded-full bg-[#065268] hover:bg-[#043e4f] text-white text-[10px] sm:text-xs font-bold flex items-center justify-center gap-2 transition-colors active:scale-[0.99] uppercase tracking-wider shadow-sm"
              >
                <span>Register Slip</span>
                <span className="text-sm">→</span>
              </button>
            </div>

            {/* Card 2: Schedule Clinic Visit */}
            <div className="bg-[#FAF9F6] rounded-[24px] sm:rounded-[32px] p-6 sm:p-8 flex flex-col justify-between text-left border border-slate-100/50 hover:border-[#065268]/20 transition-colors duration-300 shadow-sm hover:shadow-md">
              <div className="space-y-5">
                <div className="w-12 h-12 rounded-full bg-white border border-slate-100 text-[#065268] flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">New Clinic Visit</h3>
                  <p className="text-xs sm:text-sm text-slate-500 font-light leading-relaxed mt-2">
                    Book a check-in visit using one of your active approved OP slips to consult with your specialist.
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push("/patient/create/visit")}
                className="w-full h-12 mt-6 rounded-full border border-slate-200 bg-white hover:border-[#065268]/30 hover:bg-[#FAF9F6] text-[#065268] text-[10px] sm:text-xs font-bold flex items-center justify-center gap-2 transition-colors active:scale-[0.99] uppercase tracking-wider"
              >
                <span>Check-in</span>
                <span className="text-sm">→</span>
              </button>
            </div>

            {/* Card 3: Family Records */}
            <div className="bg-[#FAF9F6] rounded-[24px] sm:rounded-[32px] p-6 sm:p-8 flex flex-col justify-between text-left border border-slate-100/50 hover:border-[#065268]/20 transition-colors duration-300 shadow-sm hover:shadow-md">
              <div className="space-y-5">
                <div className="w-12 h-12 rounded-full bg-white border border-slate-100 text-[#065268] flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">Family Records</h3>
                  <p className="text-xs sm:text-sm text-slate-500 font-light leading-relaxed mt-2">
                    Add children, spouse, or elderly parents to book seamless visits under your primary account.
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push("/patient/family")}
                className="w-full h-12 mt-6 rounded-full border border-slate-200 bg-white hover:border-[#065268]/30 hover:bg-[#FAF9F6] text-[#065268] text-[10px] sm:text-xs font-bold flex items-center justify-center gap-2 transition-colors active:scale-[0.99] uppercase tracking-wider"
              >
                <span>Manage Family</span>
                <span className="text-sm">→</span>
              </button>
            </div>

            {/* Card 4: Clinic Support */}
            <div className="bg-[#FAF9F6] rounded-[24px] sm:rounded-[32px] p-6 sm:p-8 flex flex-col justify-between text-left border border-slate-100/50 hover:border-[#065268]/20 transition-colors duration-300 shadow-sm hover:shadow-md">
              <div className="space-y-5">
                <div className="w-12 h-12 rounded-full bg-white border border-slate-100 text-[#065268] flex items-center justify-center shadow-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">Need Assistance?</h3>
                  <p className="text-xs sm:text-sm text-slate-500 font-light leading-relaxed mt-2">
                    Contact our reception counter directly for urgent dental pain or general inquiries.
                  </p>
                </div>
              </div>
              <div className="mt-6 p-4 rounded-[16px] bg-white border border-slate-100 flex flex-col gap-1 items-center justify-center text-center">
                <span className="text-[10px] font-black uppercase tracking-widest text-[#065268]/60">Frontdesk</span>
                <span className="font-bold text-[#065268] font-mono tracking-tight text-sm">+91 96402 52025</span>
              </div>
            </div>
          </div>
        </section>

        {/* Consultation Slips List */}
        <section className="space-y-6">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[10px] sm:text-xs font-black uppercase tracking-widest text-[#065268]/80 block">
              Your OP Slips & Tokens
            </h2>
            <button
              onClick={() => {
                setIsRefreshing(true);
                void fetchOPs();
              }}
              disabled={isRefreshing}
              className="text-xs font-bold text-[#065268] hover:text-[#043e4f] bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
            >
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          <div className="bg-[#FAF9F6] border border-slate-100/50 rounded-[24px] sm:rounded-[32px] p-6 sm:p-8 shadow-sm">
            {loadingOps ? (
              <div className="text-sm text-slate-500 font-light py-8 text-center">Loading slips...</div>
            ) : opSlips.length === 0 ? (
              <div className="text-sm text-slate-500 font-light py-8 text-center">No OP slips registered yet.</div>
            ) : (
              <div className="divide-y divide-slate-200/60">
                {opSlips.map((op) => {
                  const latestRequest = op.requests?.[0];
                  const latestVisit = op.visits?.[0];
                  const statusLabel = latestRequest?.status || "PENDING";
                  
                  return (
                    <div key={op.opId} className="py-5 sm:py-6 first:pt-0 last:pb-0 flex flex-row items-center justify-between gap-3 sm:gap-6">
                      <div className="space-y-1.5 sm:space-y-2 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                          <span className="text-sm sm:text-base font-bold text-slate-900 truncate">
                            Dr. {op.doctor?.name || "Specialist"}
                          </span>
                          <span className={`inline-flex px-2 py-0.5 sm:px-2.5 text-[9px] sm:text-[10px] font-black tracking-widest uppercase rounded-full shrink-0 ${ 
                            statusLabel === "APPROVED" 
                              ? "bg-emerald-100 text-emerald-800" 
                              : statusLabel === "REJECTED" 
                              ? "bg-rose-100 text-rose-800" 
                              : "bg-amber-100 text-amber-800"
                          }`}>
                            {statusLabel}
                          </span>
                        </div>
                        <p className="text-[11px] sm:text-sm text-slate-500 font-light truncate">
                          For: <span className="font-semibold text-slate-700">{op.familyMember?.name || userName}</span>
                          {op.familyMember && ` (Family)`}
                        </p>
                        <p className="text-[9px] sm:text-[10px] text-slate-400 font-light truncate">
                          {new Date(op.createdAt).toLocaleDateString()} {new Date(op.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>

                      {statusLabel === "APPROVED" && latestVisit && (
                        <div className="shrink-0">
                          {latestVisit.isVerified ? (
                            <div className="bg-white border border-slate-200 rounded-[12px] sm:rounded-[16px] px-3 py-2 sm:p-4 text-center min-w-[64px] sm:min-w-[120px] shadow-sm">
                              <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-[#065268]/60 block">Token</span>
                              <span className="text-xl sm:text-3xl font-light text-[#065268] leading-none mt-1 sm:mt-2 block">#{latestVisit.tokenNumber}</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => router.push(`/patient/visit/${latestVisit.visitId}/verify`)}
                              className="px-3 sm:px-6 py-2 sm:py-3 bg-[#065268] hover:bg-[#043e4f] text-white rounded-full text-[9px] sm:text-xs font-bold shadow-md transition-all flex items-center gap-1 sm:gap-2 uppercase tracking-wider"
                            >
                              <span className="hidden sm:inline">Verify Check-in</span>
                              <span className="sm:hidden">Verify</span>
                              <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {/* Security & Confidentiality Note */}
        <section className="px-6 py-5 rounded-[24px] bg-[#FAF9F6] border border-slate-100/50 text-xs sm:text-sm text-slate-500 font-light flex items-start gap-4">
          <div className="text-[#065268] mt-0.5 text-lg">🔒</div>
          <p className="leading-relaxed">
            <strong className="text-slate-900 font-bold">Confidential Medical Data:</strong> Your medical conditions and dental history are strictly protected under clinical privacy standards. Only assigned attending doctors and frontdesk personnel have authorized access.
          </p>
        </section>
      </main>
    </div>
  );
}
