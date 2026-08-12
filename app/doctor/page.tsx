"use client";

import React, { useState, useEffect } from "react";
import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Visit {
  visitId: string;
  tokenNumber: number;
  visitDate: string;
  consultationStatus: string;
  patient: {
    name: string;
    age: number | null;
    gender: string | null;
    phoneNumber?: string | null;
    email?: string | null;
    emergencyContact?: string | null;
    previousDentalHistory?: string | null;
    medicalConditions?: string | null;
  };
  familyMember?: {
    name: string;
    age: number | null;
    gender: number | null;
    phoneNumber?: string | null;
    email?: string | null;
    previousDentalHistory?: string | null;
    medicalConditions?: string | null;
    relation?: string | null;
  } | null;
  problems?: string[];
  procedures?: string[];
}

interface Doctor {
  doctorId: string;
  name: string;
  email: string;
  phoneNo: string;
  isPresent: boolean;
  isQueuePaused: boolean;
}

export default function DoctorDashboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);

  const [predefinedProblems, setPredefinedProblems] = useState<{ id: string; name: string }[]>([]);
  const [predefinedProcedures, setPredefinedProcedures] = useState<{ id: string; name: string }[]>([]);

  const [isConsultationMode, setIsConsultationMode] = useState(false);
  const [selectedProblems, setSelectedProblems] = useState<string[]>([]);
  const [proc1, setProc1] = useState("");
  const [proc2, setProc2] = useState("");
  const [proc3, setProc3] = useState("");
  const [proc1Custom, setProc1Custom] = useState("");
  const [proc2Custom, setProc2Custom] = useState("");
  const [proc3Custom, setProc3Custom] = useState("");
  const [customProblemInput, setCustomProblemInput] = useState("");
  const [savingConsultation, setSavingConsultation] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated") {
      if (session?.user?.role !== "doctor") {
        router.push("/");
      }
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status !== "authenticated") return;

    const controller = new AbortController();
    const load = async () => {
      try {
        const [dashRes, probsRes, procsRes] = await Promise.all([
          fetch("/api/doctor/status", { signal: controller.signal }),
          fetch("/api/problems", { signal: controller.signal }),
          fetch("/api/procedures", { signal: controller.signal }),
        ]);
        if (dashRes.ok) {
          const data = await dashRes.json();
          setDoctor(data.doctor);
          setVisits(data.visits);
          setError("");
        } else {
          setError("Failed to retrieve queue dashboard details.");
        }
        if (probsRes.ok) setPredefinedProblems(await probsRes.json());
        if (procsRes.ok) setPredefinedProcedures(await procsRes.json());
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error(err);
          setError("Connection to clinic queue server lost.");
        }
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
  }, [status]);

  const initFormFromVisit = (visit: Visit) => {
    const mapProc = (val: string) => {
      if (!val) return { value: "", custom: "" };
      const isPredefined = predefinedProcedures.some((p) => p.name === val);
      return isPredefined ? { value: val, custom: "" } : { value: "OTHER", custom: val };
    };
    const procs = visit.procedures || [];
    const p1 = mapProc(procs[0] || "");
    const p2 = mapProc(procs[1] || "");
    const p3 = mapProc(procs[2] || "");
    setSelectedProblems(visit.problems || []);
    setProc1(p1.value);
    setProc1Custom(p1.custom);
    setProc2(p2.value);
    setProc2Custom(p2.custom);
    setProc3(p3.value);
    setProc3Custom(p3.custom);
  };

  const handleAddCustomProblem = async () => {
    if (!customProblemInput.trim()) return;
    const name = customProblemInput.trim();
    if (!selectedProblems.includes(name)) {
      setSelectedProblems([...selectedProblems, name]);
    }
    setCustomProblemInput("");
    try {
      const res = await fetch("/api/problems", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        const added = await res.json();
        if (!predefinedProblems.some((p) => p.id === added.id)) {
          setPredefinedProblems([...predefinedProblems, added]);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const refreshData = async () => {
    try {
      const res = await fetch("/api/doctor/status");
      if (res.ok) {
        const data = await res.json();
        setDoctor(data.doctor);
        setVisits(data.visits);
        setError("");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchConsultationOptions = async () => {
    try {
      const [probsRes, procsRes] = await Promise.all([
        fetch("/api/problems"),
        fetch("/api/procedures"),
      ]);
      if (probsRes.ok) setPredefinedProblems(await probsRes.json());
      if (procsRes.ok) setPredefinedProcedures(await procsRes.json());
    } catch (err) {
      console.error("Failed to load options", err);
    }
  };

  const handleStartConsultation = async (visitId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/doctor/consultation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitId, action: "START" }),
      });
      if (res.ok) {
        await refreshData();
        const visit = visits.find((v) => v.visitId === visitId);
        if (visit) {
          const updated = { ...visit, consultationStatus: "IN_CONSULTATION" };
          initFormFromVisit(updated);
          setSelectedVisit(updated);
          setIsConsultationMode(true);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handlePauseConsultation = async (visitId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/doctor/consultation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitId, action: "PAUSE" }),
      });
      if (res.ok) {
        await refreshData();
        setSelectedVisit(null);
        setIsConsultationMode(false);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleCallNext = async () => {
    if (waitingVisits.length === 0) return;
    setActionLoading(true);
    try {
      // If someone is actively in consultation, complete them first
      if (activeConsultation) {
        await fetch("/api/doctor/consultation", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitId: activeConsultation.visitId, action: "COMPLETE" }),
        });
      }
      // Start the next waiting patient (first in line)
      const next = waitingVisits[0];
      await fetch("/api/doctor/consultation", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitId: next.visitId, action: "START" }),
      });
      await refreshData();
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveConsultation = async () => {
    if (!selectedVisit) return;
    setSavingConsultation(true);
    try {
      const finalP1 = proc1 === "OTHER" ? proc1Custom.trim() : proc1;
      const finalP2 = proc2 === "OTHER" ? proc2Custom.trim() : proc2;
      const finalP3 = proc3 === "OTHER" ? proc3Custom.trim() : proc3;
      const selectedProcedures = [finalP1, finalP2, finalP3].filter(Boolean);

      const res = await fetch(`/api/patient/visit/${selectedVisit.visitId}/consultation`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ problems: selectedProblems, procedures: selectedProcedures }),
      });

      if (res.ok) {
        // Mark consultation as completed
        await fetch("/api/doctor/consultation", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitId: selectedVisit.visitId, action: "COMPLETE" }),
        });

        // Save custom procedures to predefined list
        const customProcs = [
          { key: proc1, val: proc1Custom.trim() },
          { key: proc2, val: proc2Custom.trim() },
          { key: proc3, val: proc3Custom.trim() },
        ].filter((p) => p.key === "OTHER" && p.val);

        for (const p of customProcs) {
          try {
            await fetch("/api/procedures", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ name: p.val }),
            });
          } catch (err) {
            console.error(err);
          }
        }

        await refreshData();
        await fetchConsultationOptions();
        setSelectedVisit(null);
        setIsConsultationMode(false);
      } else {
        alert("Failed to save consultation details.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while saving.");
    } finally {
      setSavingConsultation(false);
    }
  };

  const togglePresence = async () => {
    if (!doctor) return;
    try {
      const res = await fetch("/api/doctor/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPresent: !doctor.isPresent }),
      });
      if (res.ok) await refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  const toggleQueuePause = async () => {
    if (!doctor) return;
    try {
      const res = await fetch("/api/doctor/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isQueuePaused: !doctor.isQueuePaused }),
      });
      if (res.ok) await refreshData();
    } catch (err) {
      console.error(err);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-teal-600 border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Opening specialist portal...</p>
        </div>
      </div>
    );
  }

  if (error && !doctor) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-2xs max-w-sm text-center space-y-4">
          <p className="text-sm text-red-600 font-bold">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  const statusOf = (v: Visit) => v.consultationStatus || "WAITING";
  const waitingVisits = visits.filter((v) => statusOf(v) === "WAITING");
  const activeConsultation = visits.find((v) => statusOf(v) === "IN_CONSULTATION");
  const completedVisits = visits.filter((v) => statusOf(v) === "COMPLETED");
  // When queue is paused and no one is actively consulting, show empty
  const isQueuePaused = doctor?.isQueuePaused ?? false;
  const currentVisit = activeConsultation
    || (!isQueuePaused && waitingVisits.length > 0 ? waitingVisits[0] : null);
  // For the "Prepare Next" section
  const nextWaitingVisit = activeConsultation
    ? (waitingVisits.length > 0 ? waitingVisits[0] : null)
    : (!isQueuePaused && waitingVisits.length > 1 ? waitingVisits[1] : null);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 w-full bg-white text-slate-800 border-b border-slate-200 shadow-xs">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
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
              onClick={() => router.push("/doctor/schedule")}
              className="hidden sm:inline-flex h-9 px-3.5 items-center rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
            >
              📅 My Schedule
            </button>
            <button
              onClick={() => router.push("/board")}
              className="hidden sm:inline-flex h-9 px-3.5 items-center rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
            >
              🖥 Display Board
            </button>

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            <div className="text-right">
              <span className="text-[10px] text-slate-400 block">Signed in as</span>
              <span className="text-xs font-bold text-slate-800">{doctor?.name}</span>
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

      {/* Main Grid */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Section: Queue List */}
        <section className="lg:col-span-8 space-y-6">
          {/* Doctor Info Card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-slate-900">Welcome, Dr. {doctor?.name}</h2>
              <p className="text-xs text-slate-500">
                {doctor?.email} • {doctor?.phoneNo}
              </p>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-bold text-slate-600">Attendance:</span>
              <button
                onClick={togglePresence}
                className={`h-9 px-4 rounded-xl text-xs font-bold transition-all border ${
                  doctor?.isPresent
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                    : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                }`}
              >
                ● {doctor?.isPresent ? "Present (Active)" : "Absent (Inactive)"}
              </button>
              <button
                onClick={toggleQueuePause}
                className={`h-9 px-4 rounded-xl text-xs font-bold transition-all border ${
                  doctor?.isQueuePaused
                    ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100 animate-pulse"
                    : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {doctor?.isQueuePaused ? "⏸ Queue Paused" : "⏸ Pause Queue"}
              </button>
            </div>
          </div>

          {/* Queue Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
              <span className="text-2xl font-black text-amber-700 font-mono block">{waitingVisits.length}</span>
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Waiting</span>
            </div>
            <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-center">
              <span className="text-2xl font-black text-teal-700 font-mono block">{activeConsultation ? 1 : 0}</span>
              <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">In Consultation</span>
            </div>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
              <span className="text-2xl font-black text-emerald-700 font-mono block">{completedVisits.length}</span>
              <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Completed</span>
            </div>
          </div>

          {/* Queue Paused Banner */}
          {isQueuePaused && !activeConsultation && (
            <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6 shadow-2xs text-center space-y-3">
              <div className="flex items-center justify-center gap-2">
                <span className="text-2xl">⏸</span>
                <span className="text-sm font-bold text-red-800">Queue is Paused</span>
              </div>
              <p className="text-xs text-red-600/80">
                The queue is paused — the display board and patient view will show no active token.
                Resume the queue to continue calling patients.
              </p>
              <button
                onClick={toggleQueuePause}
                className="h-9 px-6 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all"
              >
                ▶ Resume Queue
              </button>
            </div>
          )}

          {/* Now Consulting */}
          {currentVisit && (
            <div className={`border-2 rounded-2xl p-6 shadow-2xs space-y-4 ${activeConsultation ? 'bg-teal-50 border-teal-300' : 'bg-amber-50 border-amber-300'}`}>
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold tracking-wider uppercase ${activeConsultation ? 'text-teal-800' : 'text-amber-800'}`}>
                  {activeConsultation ? 'Now Consulting' : 'Next Up — Ready to Start'}
                </span>
                <span className={`text-2xl font-black font-mono ${activeConsultation ? 'text-teal-900' : 'text-amber-900'}`}>
                  #{currentVisit.tokenNumber}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    {currentVisit.familyMember?.name || currentVisit.patient.name}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {currentVisit.familyMember?.age || currentVisit.patient.age
                      ? `${currentVisit.familyMember?.age || currentVisit.patient.age} yrs`
                      : "—"}{" "}
                    •{" "}
                    {currentVisit.familyMember?.gender || currentVisit.patient.gender || "—"}
                  </p>
                </div>
                <div className="flex gap-2">
                  {activeConsultation ? (
                    <>
                      <button
                        onClick={() => handlePauseConsultation(currentVisit.visitId)}
                        disabled={actionLoading}
                        className="h-10 px-4 border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                      >
                        ⏸ Pause
                      </button>
                      <button
                        onClick={() => {
                          initFormFromVisit(currentVisit);
                          setSelectedVisit(currentVisit);
                          setIsConsultationMode(true);
                        }}
                        className="h-10 px-4 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all"
                      >
                        ✏️ Consult
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => handleStartConsultation(currentVisit.visitId)}
                      disabled={actionLoading}
                      className="h-10 px-4 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                    >
                      ▶ Start Consultation
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Waiting Queue */}
          {(() => {
            // If no one is actively consulting, the first waiting is already shown in the "Now Consulting" card
            const displayedWaiting = activeConsultation ? waitingVisits : waitingVisits.slice(1);
            return (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-800">
                  Waiting Queue ({displayedWaiting.length})
                </h3>
                <span className="text-[10px] text-slate-400">Auto-refresh active</span>
              </div>

              {displayedWaiting.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-500 space-y-2">
                  <p>No patients waiting in queue.</p>
                  <p className="text-[10px] text-slate-400">
                    Patients appear here after QR verification at reception.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {displayedWaiting.map((visit, idx) => {
                    const patientName = visit.familyMember?.name || visit.patient.name;
                    return (
                      <div
                        key={visit.visitId}
                        className="flex items-center justify-between gap-4 p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center text-sm font-black font-mono">
                            #{visit.tokenNumber}
                          </span>
                          <div>
                            <p className="text-sm font-bold text-slate-900">{patientName}</p>
                            <p className="text-[10px] text-slate-400">
                              {idx === 0 ? "Next in line" : `#${idx + 1} in queue`}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleStartConsultation(visit.visitId)}
                          disabled={actionLoading || !!activeConsultation}
                          className="h-9 px-4 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-40"
                        >
                          Start Consultation
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            );
          })()}

          {/* Completed */}
          {completedVisits.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-4">
              <h3 className="text-sm font-bold text-slate-800 pb-3 border-b border-slate-100">
                Completed Today ({completedVisits.length})
              </h3>
              <div className="space-y-2">
                {completedVisits.map((visit) => (
                  <div
                    key={visit.visitId}
                    className="flex items-center justify-between gap-4 p-3 rounded-xl bg-emerald-50/50 border border-emerald-100"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">
                        ✓
                      </span>
                      <div>
                        <p className="text-xs font-bold text-slate-800">
                          #{visit.tokenNumber} — {visit.familyMember?.name || visit.patient.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {visit.problems?.length || 0} problems • {visit.procedures?.length || 0} procedures
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedVisit(visit);
                        setIsConsultationMode(false);
                      }}
                      className="text-[10px] font-bold text-teal-700 hover:text-teal-800 hover:underline"
                    >
                      View Details →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Right Section: Live Queue Console */}
        <section className="lg:col-span-4 space-y-6">
          {/* Now Consulting */}
          <div className={`border rounded-2xl p-6 shadow-2xs text-center space-y-3 ${activeConsultation ? 'bg-teal-50 border-teal-200' : currentVisit ? 'bg-amber-50 border-amber-200' : 'bg-teal-50 border-teal-200'}`}>
            <span className={`text-[10px] font-bold tracking-wider uppercase block ${activeConsultation ? 'text-teal-800' : currentVisit ? 'text-amber-800' : 'text-teal-800'}`}>
              {activeConsultation ? 'Now Consulting' : currentVisit ? 'Next Up' : 'Now Consulting'}
            </span>
            <span className={`text-5xl font-black font-mono tracking-tight block leading-none ${activeConsultation ? 'text-teal-900' : currentVisit ? 'text-amber-900' : 'text-teal-900'}`}>
              {currentVisit ? `#${currentVisit.tokenNumber}` : "—"}
            </span>
            {currentVisit && (
              <p className={`text-xs font-semibold ${activeConsultation ? 'text-teal-800' : 'text-amber-800'}`}>
                {currentVisit.familyMember?.name || currentVisit.patient.name}
              </p>
            )}
          </div>

          {/* Prepare Next */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 shadow-2xs text-center space-y-3">
            <span className="text-[10px] font-bold tracking-wider text-amber-800 uppercase block">
              Prepare Next
            </span>
            <span className="text-3xl font-black text-amber-900 font-mono tracking-tight block leading-none">
              {nextWaitingVisit ? `#${nextWaitingVisit.tokenNumber}` : "—"}
            </span>
            {nextWaitingVisit && (
              <p className="text-xs font-semibold text-amber-800">
                {nextWaitingVisit.familyMember?.name || nextWaitingVisit.patient.name}
              </p>
            )}
          </div>

          {/* Call Next Button */}
          <button
            onClick={() => void handleCallNext()}
            disabled={actionLoading || waitingVisits.length === 0}
            className="w-full h-13 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {actionLoading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
                <span>Call Next Patient</span>
              </>
            )}
          </button>

          {/* Queue Summary */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-2xs space-y-3">
            <h3 className="text-sm font-bold text-slate-800 pb-3 border-b border-slate-100">
              Queue Summary
            </h3>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Checked-in</span>
                <span className="font-bold text-slate-900">{visits.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Waiting</span>
                <span className="font-bold text-amber-700">{waitingVisits.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">In Consultation</span>
                <span className="font-bold text-teal-700">{activeConsultation ? 1 : 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Completed</span>
                <span className="font-bold text-emerald-700">{completedVisits.length}</span>
              </div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-[10px] text-slate-500 leading-relaxed">
            <span className="font-bold text-slate-700 block mb-1">How it works:</span>
            1. Patient scans QR → enters queue
            <br />
            2. Click <b>Call Next Patient</b> to start
            <br />
            3. Add problems &amp; select procedures
            <br />
            4. Save → completed, next patient ready
          </div>
        </section>
      </main>

      {/* Patient Profile & Consultation Modal */}
      {selectedVisit && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative text-left" style={{ maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4 shrink-0">
              <div>
                <span className="text-[10px] text-teal-700 font-bold tracking-wider uppercase block">
                  {isConsultationMode ? "Consultation Form" : "Patient Medical Summary"}
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-1">
                  {selectedVisit.familyMember?.name || selectedVisit.patient.name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 font-medium">
                  {selectedVisit.familyMember
                    ? `Family Member (${selectedVisit.familyMember.relation})`
                    : "Primary Account Holder"}{" "}
                  · Token #{selectedVisit.tokenNumber}
                </p>
              </div>
              <button
                onClick={() => setSelectedVisit(null)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="space-y-5 overflow-y-auto pr-1 py-4 flex-1 min-h-0">
              {/* Demographics */}
              <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Age</span>
                  <span className="text-slate-800 font-semibold">
                    {selectedVisit.familyMember?.age || selectedVisit.patient.age
                      ? `${selectedVisit.familyMember?.age || selectedVisit.patient.age} years`
                      : "Not provided"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Gender</span>
                  <span className="text-slate-800 font-semibold capitalize">
                    {selectedVisit.familyMember?.gender || selectedVisit.patient.gender || "Not provided"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Phone Number</span>
                  <span className="text-slate-800 font-semibold">
                    {selectedVisit.familyMember?.phoneNumber || selectedVisit.patient.phoneNumber || "Not provided"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Email Address</span>
                  <span className="text-slate-800 font-semibold truncate block">
                    {selectedVisit.familyMember?.email || selectedVisit.patient.email || "Not provided"}
                  </span>
                </div>
              </div>

              {/* Medical Conditions */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Medical Conditions & Allergies
                </h4>
                <p className="text-xs text-slate-800 bg-red-50/40 border border-red-100 p-3.5 rounded-xl leading-relaxed whitespace-pre-wrap">
                  {selectedVisit.familyMember?.medicalConditions || selectedVisit.patient.medicalConditions || "No significant medical conditions or allergies reported."}
                </p>
              </div>

              {/* Previous Dental History */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Previous Dental History
                </h4>
                <p className="text-xs text-slate-800 bg-slate-50 border border-slate-200 p-3.5 rounded-xl leading-relaxed whitespace-pre-wrap">
                  {selectedVisit.familyMember?.previousDentalHistory || selectedVisit.patient.previousDentalHistory || "No previous dental history reported."}
                </p>
              </div>

              {/* Consultation Form */}
              {isConsultationMode && (
                <div className="space-y-6 border-t border-slate-200 pt-5">
                  <h4 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
                    <svg className="w-4 h-4 text-teal-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Consultation Details
                  </h4>

                  {/* Problems */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Identified Problems
                    </label>
                    {selectedProblems.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {selectedProblems.map((prob, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-teal-50 text-teal-800 text-[11px] font-semibold border border-teal-200"
                          >
                            {prob}
                            <button
                              type="button"
                              onClick={() => setSelectedProblems(selectedProblems.filter((_, i) => i !== idx))}
                              className="hover:text-red-600 transition-colors ml-0.5"
                            >
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <select
                        className="flex-1 h-10 border border-slate-300 rounded-xl px-3 text-xs text-slate-800 bg-white focus:ring-2 focus:ring-teal-200 focus:border-teal-400 outline-none transition-all"
                        value=""
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val && !selectedProblems.includes(val)) {
                            setSelectedProblems([...selectedProblems, val]);
                          }
                        }}
                      >
                        <option value="">+ Select a problem...</option>
                        {predefinedProblems
                          .filter((p) => !selectedProblems.includes(p.name))
                          .map((p) => (
                            <option key={p.id} value={p.name}>
                              {p.name}
                            </option>
                          ))}
                      </select>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={customProblemInput}
                        onChange={(e) => setCustomProblemInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddCustomProblem();
                          }
                        }}
                        placeholder="Type a custom problem name..."
                        className="flex-1 h-10 border border-slate-300 rounded-xl px-3 text-xs text-slate-800 bg-white focus:ring-2 focus:ring-teal-200 focus:border-teal-400 outline-none transition-all"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomProblem}
                        disabled={!customProblemInput.trim()}
                        className="h-10 px-4 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-40"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Procedures (3 slots) */}
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                      Proposed Procedures (Select 3 Options)
                    </label>

                    {[
                      { label: "Procedure Option 1", value: proc1, set: setProc1, custom: proc1Custom, setCustom: setProc1Custom },
                      { label: "Procedure Option 2", value: proc2, set: setProc2, custom: proc2Custom, setCustom: setProc2Custom },
                      { label: "Procedure Option 3", value: proc3, set: setProc3, custom: proc3Custom, setCustom: setProc3Custom },
                    ].map((slot, i) => (
                      <div key={i} className="space-y-1.5">
                        <span className="text-[11px] font-semibold text-slate-500">{slot.label}</span>
                        <select
                          value={slot.value}
                          onChange={(e) => {
                            slot.set(e.target.value);
                            if (e.target.value !== "OTHER") slot.setCustom("");
                          }}
                          className="w-full h-10 border border-slate-300 rounded-xl px-3 text-xs text-slate-800 bg-white focus:ring-2 focus:ring-teal-200 focus:border-teal-400 outline-none transition-all"
                        >
                          <option value="">Select procedure...</option>
                          {predefinedProcedures.map((p) => (
                            <option key={p.id} value={p.name}>
                              {p.name}
                            </option>
                          ))}
                          <option value="OTHER">Other (custom)</option>
                        </select>
                        {slot.value === "OTHER" && (
                          <input
                            type="text"
                            value={slot.custom}
                            onChange={(e) => slot.setCustom(e.target.value)}
                            placeholder="Enter custom procedure name..."
                            className="w-full h-10 border border-slate-300 rounded-xl px-3 text-xs text-slate-800 bg-white focus:ring-2 focus:ring-teal-200 focus:border-teal-400 outline-none transition-all mt-1.5"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
              {isConsultationMode ? (
                <>
                  <button
                    onClick={() => setIsConsultationMode(false)}
                    className="h-11 px-5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
                  >
                    Back to Summary
                  </button>
                  <button
                    onClick={handleSaveConsultation}
                    disabled={savingConsultation}
                    className="h-11 px-6 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-50 flex items-center gap-2"
                  >
                    {savingConsultation ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span>Save & Complete</span>
                      </>
                    )}
                  </button>
                </>
              ) : (
                <>
                  {selectedVisit.consultationStatus === "IN_CONSULTATION" && (
                    <button
                      onClick={() => setIsConsultationMode(true)}
                      className="h-11 px-5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98] flex items-center gap-1.5"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Open Consultation Form</span>
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedVisit(null)}
                    className="h-11 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors"
                  >
                    Close
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
