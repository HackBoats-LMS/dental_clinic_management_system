"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import NavBar from "../components/NavBar";

interface Visit {
  visitId: string;
  visitDate: string;
  isVerified: boolean;
  tokenNumber: number;
  problems?: string[];
  procedures?: string[];
}

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
  visits: Visit[];
}

export default function VisitsHistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [opSlips, setOpSlips] = useState<OpSlip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

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
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/patient/op");
        if (res.ok) {
          const data = await res.json();
          setOpSlips(data);
        } else {
          setError("Failed to retrieve consultation history.");
        }
      } catch (err) {
        console.error("Error loading visits history", err);
        setError("Error loading consult history.");
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchHistory();
    }
  }, [status]);

  const userName = session?.user?.name || "Patient";

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <NavBar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-5">
          <div>
            <span className="text-xs text-teal-700 font-bold tracking-wider uppercase block">
              Consultation Slips & Check-ins
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
              OP & Visit History
            </h1>
          </div>
          <button
            onClick={() => router.push("/patient")}
            className="h-10 px-4 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold shadow-2xs transition-colors"
          >
            ← Dashboard
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm shadow-2xs">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-12 space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-teal-600 border-t-transparent animate-spin mx-auto"></div>
            <p className="text-xs text-slate-500 font-medium">Loading consultation history...</p>
          </div>
        ) : opSlips.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center max-w-md mx-auto space-y-4 shadow-2xs">
            <p className="text-sm text-slate-500">You haven&apos;t registered any OP slips yet.</p>
            <button
              onClick={() => router.push("/patient/create/op")}
              className="px-6 h-11 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Register OP Slip
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {opSlips.map((op) => {
              const latestRequest = op.requests?.[0];
              const statusLabel = latestRequest?.status || "PENDING";
              const isExpired = new Date(op.expiresAt) < new Date();

              return (
                <div key={op.opId} className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden">
                  {/* OP Header Card */}
                  <div className="p-5 sm:p-6 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-base font-bold text-slate-900">
                          Dr. {op.doctor.name}
                        </span>
                        <span className={`inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full border ${
                          statusLabel === "APPROVED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : statusLabel === "REJECTED"
                            ? "bg-rose-50 text-rose-700 border-rose-200"
                            : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          Status: {statusLabel}
                        </span>
                        {isExpired && (
                          <span className="inline-flex px-2 py-0.5 text-[10px] font-bold rounded-full bg-red-50 text-red-700 border border-red-200">
                            Expired
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        For: <span className="font-semibold text-slate-700">{op.familyMember?.name || userName}</span>
                        {op.familyMember && ` (Family)`}
                      </p>
                      <div className="flex items-center gap-4 text-[10px] text-slate-400 pt-1">
                        <span>Registered: {new Date(op.createdAt).toLocaleDateString()}</span>
                        <span>Expires: {new Date(op.expiresAt).toLocaleDateString()}</span>
                      </div>
                    </div>

                    {statusLabel === "APPROVED" && !isExpired && (
                      <button
                        onClick={() => router.push(`/patient/create/visit?opId=${op.opId}`)}
                        className="h-9 px-4 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-semibold transition-colors self-start sm:self-auto flex items-center gap-1.5"
                      >
                        <span>Book Visit</span>
                        <span>+</span>
                      </button>
                    )}
                  </div>

                  {/* Visits List */}
                  <div className="p-5 sm:p-6 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Visits History under this OP
                    </h3>

                    {op.visits.length === 0 ? (
                      <p className="text-xs text-slate-500 py-3">No visits booked under this OP slip yet.</p>
                    ) : (
                      <div className="overflow-x-auto border border-slate-100 rounded-xl">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-slate-50 border-b border-slate-100 text-slate-500">
                            <tr>
                              <th className="px-4 py-3 font-semibold">Visit Date</th>
                              <th className="px-4 py-3 font-semibold">Verification Status</th>
                              <th className="px-4 py-3 font-semibold text-center">Token</th>
                              <th className="px-4 py-3 font-semibold">Diagnosed Problems</th>
                              <th className="px-4 py-3 font-semibold">Proposed Procedures (Options)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {op.visits.map((visit) => (
                              <tr key={visit.visitId} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-4 py-3 text-slate-700 font-medium">
                                  {new Date(visit.visitDate).toLocaleDateString()} {new Date(visit.visitDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </td>
                                <td className="px-4 py-3">
                                  {visit.isVerified ? (
                                    <span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 font-medium">
                                      Verified
                                    </span>
                                  ) : (
                                    <div className="flex items-center gap-2">
                                      <span className="inline-flex px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 font-medium">
                                        Pending Scan
                                      </span>
                                      <button
                                        onClick={() => router.push(`/patient/visit/${visit.visitId}/verify`)}
                                        className="text-teal-700 hover:text-teal-800 hover:underline font-bold"
                                      >
                                        Verify Now →
                                      </button>
                                    </div>
                                  )}
                                </td>
                                <td className="px-4 py-3 text-center font-bold text-slate-900 font-mono">
                                  {visit.isVerified ? `#${visit.tokenNumber}` : "-"}
                                </td>
                                <td className="px-4 py-3">
                                  {visit.problems && visit.problems.length > 0 ? (
                                    <div className="flex flex-wrap gap-1">
                                      {visit.problems.map((prob, pIdx) => (
                                        <span key={pIdx} className="px-2 py-0.5 rounded-md bg-teal-50 text-teal-800 border border-teal-200 text-[10px] font-semibold">
                                          {prob}
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="text-slate-400 italic text-[11px]">Not diagnosed yet</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {visit.procedures && visit.procedures.length > 0 ? (
                                    <ol className="list-decimal pl-4 text-slate-800 text-[11px] font-semibold space-y-0.5">
                                      {visit.procedures.map((proc, prIdx) => (
                                        <li key={prIdx}>{proc}</li>
                                      ))}
                                    </ol>
                                  ) : (
                                    <span className="text-slate-400 italic text-[11px]">No procedures proposed yet</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
