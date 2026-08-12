"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";

interface DoctorQueue {
  doctorId: string;
  name: string;
  isPresent: boolean;
  currentToken: number;
  nextToken: number | null;
  totalVerified: number;
  completedCount: number;
  waitingCount: number;
}

export default function ClinicBoardPage() {
  const { data: session, status } = useSession();
  const isAdmin = status === "authenticated" && session?.user?.role === "admin";
  const [dailyCode, setDailyCode] = useState("");
  const [doctors, setDoctors] = useState<DoctorQueue[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchBoardData = useCallback(async () => {
    try {
      const res = await fetch("/api/board");
      if (res.ok) {
        const data = await res.json();
        setDailyCode(data.dailyCode);
        setDoctors(data.doctors);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        const res = await fetch("/api/board", { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          setDailyCode(data.dailyCode);
          setDoctors(data.doctors);
        }
      } catch (err) {
        if (!controller.signal.aborted) console.error(err);
      } finally {
        setLoading(false);
      }
    };

    void load();

    const eventSource = new EventSource("/api/request/stream");
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data?.type === "QUEUE_UPDATE") void load();
      } catch {
        // Ignore
      }
    };
    eventSource.onerror = () => {};

    return () => {
      controller.abort();
      eventSource.close();
    };
  }, []);

  const handleCallNext = async (doctorId: string) => {
    setActionLoading(doctorId);
    try {
      const res = await fetch("/api/board/call", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ doctorId, action: "NEXT" }),
      });
      if (res.ok) {
        await fetchBoardData();
      }
    } catch (err) {
      console.error("Failed to call next", err);
    } finally {
      setActionLoading(null);
    }
  };

  const qrDataUrl = dailyCode || "KOTHA-";
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&data=${encodeURIComponent(qrDataUrl)}&color=0d9488&bgcolor=ffffff&qzone=1`;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col font-sans p-6 sm:p-10 justify-between">
      {/* Header */}
      <header className="flex flex-col sm:flex-row items-center justify-between border-b border-slate-800 pb-6 mb-8 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 font-bold text-xl">
            ✦
          </div>
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-extrabold tracking-tight text-white leading-none">
              Kothamass Dental Excellence
            </h1>
            <p className="text-xs text-teal-400 font-semibold tracking-widest uppercase mt-1">
              Live Queue Display Board
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300">
            ● Server Connected
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch mb-8">
        {/* Left Column: QR Code & Code */}
        <section className="lg:col-span-5 flex flex-col items-center justify-center bg-slate-900/40 border border-slate-900 rounded-3xl p-6 sm:p-10 text-center gap-8">
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-white">Scan to Check-in</h2>
            <p className="text-xs text-slate-400 max-w-[280px] mx-auto">
              Scan this QR with your phone camera to register a visit and claim your token.
            </p>
          </div>

          <div className="relative p-5 bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-[280px] sm:max-w-[320px] aspect-square flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrImageUrl}
              alt="Clinic Check-in QR"
              className="w-full h-full object-contain rounded-xl"
            />
          </div>

          <div className="w-full max-w-[320px] space-y-2.5">
            <span className="text-[10px] font-bold tracking-wider text-slate-500 uppercase block">
              Or Enter Verification Code Manually
            </span>
            <div className="bg-slate-950 border border-teal-500/20 text-teal-400 py-3.5 px-6 rounded-2xl font-mono text-xl sm:text-2xl font-black tracking-widest shadow-inner select-all">
              {dailyCode || "LOADING..."}
            </div>
          </div>
        </section>

        {/* Right Column: Queue Details */}
        <section className="lg:col-span-7 flex flex-col justify-start bg-slate-900/40 border border-slate-900 rounded-3xl p-6 sm:p-8 space-y-6">
          <h2 className="text-lg font-bold tracking-tight text-white pb-3 border-b border-slate-900">
            Attending Specialist Queues
          </h2>

          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center py-12 text-slate-500 text-sm">
              <div className="w-8 h-8 rounded-full border-2 border-teal-500 border-t-transparent animate-spin mb-3"></div>
              Loading live queue lists...
            </div>
          ) : doctors.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-12 text-slate-500 text-sm">
              No doctors listed in the clinic today.
            </div>
          ) : (
            <div className="space-y-4 flex-1 overflow-y-auto pr-1">
              {doctors.map((doc) => (
                <div
                  key={doc.doctorId}
                  className="bg-slate-950/80 border border-slate-900 hover:border-slate-800 transition-all rounded-2xl p-5 flex flex-col gap-4"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className={`w-2.5 h-2.5 rounded-full ${
                          doc.isPresent ? "bg-emerald-500" : "bg-slate-700"
                        }`}
                      ></div>
                      <span className="text-md font-bold text-white">Dr. {doc.name}</span>
                    </div>
                    <span className="text-[10px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded-full">
                      {doc.completedCount}/{doc.totalVerified} completed
                    </span>
                  </div>

                  {/* Token Status Board */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-teal-500/5 border border-teal-500/10 rounded-xl p-4 text-center">
                      <span className="text-[10px] font-bold tracking-wider text-teal-400 uppercase block">
                        Now Consulting
                      </span>
                      <span className="text-4xl sm:text-5xl font-black text-teal-400 font-mono tracking-tight mt-1.5 block leading-none">
                        {doc.currentToken > 0 ? `#${doc.currentToken}` : "—"}
                      </span>
                    </div>

                    <div className="bg-amber-500/5 border border-amber-500/10 rounded-xl p-4 text-center">
                      <span className="text-[10px] font-bold tracking-wider text-amber-400 uppercase block">
                        Prepare Next
                      </span>
                      <span className="text-4xl sm:text-5xl font-black text-amber-400 font-mono tracking-tight mt-1.5 block leading-none">
                        {doc.nextToken ? `#${doc.nextToken}` : "—"}
                      </span>
                    </div>
                  </div>

                  {/* Admin: Call Next */}
                  {isAdmin && doc.nextToken && (
                    <div className="pt-2 border-t border-slate-900/60">
                      <button
                        onClick={() => void handleCallNext(doc.doctorId)}
                        disabled={actionLoading === doc.doctorId}
                        className="w-full px-4 h-9 rounded-lg bg-teal-600 hover:bg-teal-500 text-xs font-semibold text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {actionLoading === doc.doctorId ? (
                          <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <>
                            <svg
                              className="w-3.5 h-3.5"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M14 5l7 7m0 0l-7 7m7-7H3"
                              />
                            </svg>
                            Call Next Patient
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Footer */}
      <footer className="text-center text-slate-600 text-xs pt-4 border-t border-slate-900">
        © {new Date().getFullYear()} Kothamass Dental Excellence. Live display board updates in real
        time.
      </footer>
    </div>
  );
}
