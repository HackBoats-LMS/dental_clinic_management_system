"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import NavBar from "../../components/NavBar";

interface OpSlip {
  opId: string;
  createdAt: string;
  expiresAt: string;
  doctor: {
    name: string;
  };
  familyMember?: {
    name: string;
  } | null;
  requests: Array<{
    status: string;
  }>;
}

function CreateVisitContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [approvedOps, setApprovedOps] = useState<OpSlip[]>([]);
  const [selectedOpId, setSelectedOpId] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  useEffect(() => {
    const fetchApprovedOps = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/patient/op");
        if (res.ok) {
          const data: OpSlip[] = await res.json();
          const approved = data.filter(
            (op) => op.requests?.[0]?.status === "APPROVED"
          );
          setApprovedOps(approved);

          const preselectedOpId = searchParams?.get("opId");
          if (preselectedOpId && approved.some((op) => op.opId === preselectedOpId)) {
            setSelectedOpId(preselectedOpId);
          }
        }
      } catch (err) {
        console.error("Failed to load approved OPs", err);
        setError("Failed to load active OPs");
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchApprovedOps();
    }
  }, [status, searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedOpId) {
      setError("Please select an approved OP slip");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/patient/visit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ opId: selectedOpId }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create visit");
      }

      setSuccess("Visit created successfully! Scan QR code at the clinic to verify and get your token.");
      setTimeout(() => {
        router.push("/patient");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create visit");
    } finally {
      setSubmitting(false);
    }
  };

  const userName = session?.user?.name || "Patient";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <NavBar />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-5">
          <div>
            <span className="text-xs text-teal-700 font-bold tracking-wider uppercase block">
              Clinic Visit Check-in
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
              Create a Consult Visit
            </h1>
          </div>
          <button
            onClick={() => router.push("/patient")}
            className="h-10 px-4 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold shadow-2xs transition-colors"
          >
            ← Back
          </button>
        </div>

        {/* Form Container */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-8 space-y-6 shadow-2xs">
          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm shadow-2xs">
              {error}
            </div>
          )}
          {success && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm shadow-2xs">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-700">
                Select Active Approved OP Slip <span className="text-teal-700">*</span>
              </label>

              {loading ? (
                <div className="h-12 rounded-xl bg-slate-50 border border-slate-300 flex items-center px-4 text-xs text-slate-400">
                  Loading active OP slips...
                </div>
              ) : approvedOps.length === 0 ? (
                <div className="p-5 rounded-xl bg-slate-50 border border-slate-300 text-slate-600 text-center space-y-3">
                  <p className="text-xs">No active approved OP slips found.</p>
                  <button
                    type="button"
                    onClick={() => router.push("/patient/create/op")}
                    className="h-9 px-4 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    Register New OP
                  </button>
                </div>
              ) : (
                <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                  {approvedOps.map((op) => {
                    const isExpired = new Date(op.expiresAt) < new Date();
                    const isSelected = selectedOpId === op.opId;

                    return (
                      <div
                        key={op.opId}
                        onClick={() => {
                          if (!isExpired) {
                            setSelectedOpId(op.opId);
                          }
                        }}
                        className={`border rounded-xl p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-left ${
                          isExpired
                            ? "bg-slate-50 border-slate-200 opacity-60 cursor-not-allowed"
                            : isSelected
                            ? "border-teal-600 bg-teal-50/30 cursor-pointer shadow-2xs"
                            : "border-slate-200 hover:border-slate-300 cursor-pointer bg-white"
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-bold text-slate-900">
                              Dr. {op.doctor.name}
                            </span>
                            <span className="text-xs text-slate-500">
                              • For: <span className="font-semibold text-slate-700">{op.familyMember?.name || userName}</span>
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-[10px] text-slate-500 flex-wrap">
                            <span>Registered: {new Date(op.createdAt).toLocaleDateString()}</span>
                            <span>Expires: {new Date(op.expiresAt).toLocaleDateString()}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          {isExpired ? (
                            <span className="px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full text-[10px] font-bold">
                              Expired
                            </span>
                          ) : (
                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                              isSelected
                                ? "bg-teal-700 text-white"
                                : "bg-teal-50 text-teal-700 border border-teal-200"
                            }`}>
                              {isSelected ? "Selected" : "Select Active"}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {selectedOpId && (
              <div className="p-4 rounded-xl bg-teal-50/50 border border-teal-200 text-xs text-teal-800 space-y-2">
                <h4 className="font-bold">Next Steps for Verification:</h4>
                <ul className="list-disc pl-4 space-y-1">
                  <li>Creating this visit schedules your consultation under the selected OP.</li>
                  <li>When you arrive at the clinic, scan the verification QR code at the desk.</li>
                  <li>Once scanned, your token number will be generated and displayed live on your dashboard.</li>
                </ul>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || approvedOps.length === 0 || !selectedOpId}
              className="w-full h-12 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold transition-colors disabled:opacity-50 active:scale-[0.99] flex items-center justify-center gap-2"
            >
              {submitting ? (
                <span>Scheduling Visit...</span>
              ) : (
                <>
                  <span>Create Visit Check-in</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function CreateVisitPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center">Loading...</div>}>
      <CreateVisitContent />
    </Suspense>
  );
}
