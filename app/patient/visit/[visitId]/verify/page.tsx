"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import NavBar from "../../../components/NavBar";

interface VisitDetails {
  visitId: string;
  isVerified: boolean;
  tokenNumber: number;
  doctor: {
    name: string;
  };
  op?: {
    opId: string;
  } | null;
}

export default function VerifyVisitPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const visitId = params?.visitId as string;

  const [visit, setVisit] = useState<VisitDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [activeTab, setActiveTab] = useState<"QR" | "CODE">("QR");
  const [manualCode, setManualCode] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [assignedToken, setAssignedToken] = useState<number | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");

  const scannerRef = useRef<import("html5-qrcode").Html5Qrcode | null>(null);
  const scannerMountedRef = useRef(false);
  const hasScannedRef = useRef(false);

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
    const fetchVisitDetails = async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/patient/visit/verify?visitId=${visitId}`);
        if (res.ok) {
          const data = await res.json();
          setVisit(data);
          if (data.isVerified) {
            setAssignedToken(data.tokenNumber);
          }
        } else {
          setError("Failed to find check-in visit details.");
        }
      } catch (err) {
        console.error(err);
        setError("Error loading visit information.");
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated" && visitId) {
      fetchVisitDetails();
    }
  }, [status, visitId]);

  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        const state = scannerRef.current.getState();
        // State 2 = SCANNING, State 3 = PAUSED
        if (state === 2 || state === 3) {
          await scannerRef.current.stop();
        }
      } catch {
        // Ignore stop errors
      }
      try {
        scannerRef.current.clear();
      } catch {
        // Ignore clear errors
      }
      scannerRef.current = null;
    }
    scannerMountedRef.current = false;
  }, []);

  const startScanner = useCallback(async () => {
    // Prevent double-mounting
    if (scannerMountedRef.current) return;
    scannerMountedRef.current = true;
    hasScannedRef.current = false;
    setCameraReady(false);
    setCameraError("");

    try {
      const lib = await import("html5-qrcode");
      const Html5Qrcode = lib.Html5Qrcode;

      // Clean up any previous instance
      if (scannerRef.current) {
        try {
          const state = scannerRef.current.getState();
          if (state === 2 || state === 3) await scannerRef.current.stop();
          scannerRef.current.clear();
        } catch { /* ignore */ }
      }

      const scanner = new Html5Qrcode("qr-reader", /* verbose */ false);
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" }, // Always use back camera
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // Prevent multiple scans
          if (hasScannedRef.current) return;
          hasScannedRef.current = true;

          // Stop the scanner immediately after successful scan
          scanner.stop().then(() => {
            scanner.clear();
            scannerRef.current = null;
            scannerMountedRef.current = false;
          }).catch(() => {});

          verifyCode(decodedText);
        },
        () => {
          // QR scan error callback (frame with no QR) - ignore
        }
      );

      setCameraReady(true);
    } catch (err) {
      console.error("Camera error:", err);
      scannerMountedRef.current = false;
      setCameraError(
        err instanceof Error && err.message.includes("NotAllowedError")
          ? "Camera permission denied. Please allow camera access and try again."
          : "Could not start camera. Please use the manual code entry."
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTab === "QR" && !assignedToken && visit && !visit.isVerified) {
      // Small delay to ensure the DOM element exists
      const timeout = setTimeout(() => {
        startScanner();
      }, 100);
      return () => {
        clearTimeout(timeout);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [activeTab, assignedToken, visit, startScanner, stopScanner]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  async function verifyCode(codeToSubmit: string) {
    setError("");
    setSuccess("");
    setVerifying(true);

    try {
      const res = await fetch("/api/patient/visit/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitId, code: codeToSubmit }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to verify check-in code.");
      }

      setSuccess("Check-in verified successfully!");
      setAssignedToken(data.visit.tokenNumber);
      if (visit) {
        setVisit({ ...visit, isVerified: true, tokenNumber: data.visit.tokenNumber });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to verify check-in.");
    } finally {
      setVerifying(false);
    }
  }

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) {
      setError("Please enter the daily verification code.");
      return;
    }
    verifyCode(manualCode);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-teal-600 border-t-transparent animate-spin mx-auto"></div>
          <p className="text-xs text-slate-500 font-medium">Loading visit details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <NavBar />

      <main className="flex-1 max-w-xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-5">
          <div>
            <span className="text-xs text-teal-700 font-bold tracking-wider uppercase block">
              Clinic Check-in
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
              Verify Your Visit
            </h1>
          </div>
          <button
            onClick={() => router.push("/patient")}
            className="h-10 px-4 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold shadow-2xs transition-colors"
          >
            ← Cancel
          </button>
        </div>

        {visit && (
          <div className="bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xs">
            {/* Visit Context */}
            <div className="pb-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-400">Attending Specialist</p>
                <p className="text-sm font-bold text-slate-800">Dr. {visit.doctor.name}</p>
              </div>
              <div>
                <span className={`inline-flex px-2.5 py-1 rounded-full text-[10px] font-bold ${
                  visit.isVerified
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200"
                }`}>
                  {visit.isVerified ? "Verified" : "Verification Required"}
                </span>
              </div>
            </div>

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

            {assignedToken ? (
              /* Success / Token Card */
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 rounded-full flex items-center justify-center text-emerald-600 mx-auto text-2xl">
                  ✓
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Check-in Complete!</h3>
                  <p className="text-xs text-slate-500">Your consultation token has been generated.</p>
                </div>
                <div className="bg-teal-50 border border-teal-200 rounded-2xl p-6 max-w-[200px] mx-auto text-center shadow-xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-800 block">Token Number</span>
                  <span className="text-4xl font-black text-teal-900 font-mono mt-1 block">#{assignedToken}</span>
                </div>
                <button
                  onClick={() => router.push("/patient")}
                  className="px-6 h-11 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors mt-4"
                >
                  Return to Dashboard
                </button>
              </div>
            ) : (
              /* Verification Actions */
              <div className="space-y-6">
                {/* Tabs */}
                <div className="grid grid-cols-2 bg-slate-100 p-1.5 rounded-xl">
                  <button
                    onClick={() => setActiveTab("QR")}
                    className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === "QR"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    📷 Scan QR Code
                  </button>
                  <button
                    onClick={() => setActiveTab("CODE")}
                    className={`py-2 rounded-lg text-xs font-semibold transition-all ${
                      activeTab === "CODE"
                        ? "bg-white text-slate-900 shadow-xs"
                        : "text-slate-500 hover:text-slate-900"
                    }`}
                  >
                    ⌨ Enter Code
                  </button>
                </div>

                {activeTab === "QR" ? (
                  /* QR Scanner View */
                  <div className="space-y-4 text-center">
                    <div className="border border-slate-200 rounded-2xl bg-slate-950 overflow-hidden relative">
                      {/* Camera loading state */}
                      {!cameraReady && !cameraError && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950 gap-3">
                          <div className="w-8 h-8 rounded-full border-2 border-teal-400 border-t-transparent animate-spin"></div>
                          <p className="text-xs text-slate-400">Starting camera...</p>
                        </div>
                      )}

                      {/* Camera error state */}
                      {cameraError && (
                        <div className="p-8 text-center space-y-3">
                          <div className="text-3xl">📷</div>
                          <p className="text-xs text-red-400">{cameraError}</p>
                          <button
                            onClick={() => {
                              stopScanner().then(() => startScanner());
                            }}
                            className="h-9 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition-colors"
                          >
                            Retry Camera
                          </button>
                        </div>
                      )}

                      {/* Scanner container - Html5Qrcode renders video directly here */}
                      <div
                        id="qr-reader"
                        className="w-full"
                        style={{ minHeight: cameraError ? 0 : 300 }}
                      ></div>
                    </div>

                    {cameraReady && (
                      <p className="text-[10px] text-slate-400 max-w-[280px] mx-auto leading-relaxed">
                        Point your camera at the clinic&apos;s QR code on the display board. It will scan automatically.
                      </p>
                    )}

                    {verifying && (
                      <div className="flex items-center justify-center gap-2 text-teal-700">
                        <div className="w-4 h-4 rounded-full border-2 border-teal-600 border-t-transparent animate-spin"></div>
                        <span className="text-xs font-semibold">Verifying code...</span>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Manual Code Input */
                  <form onSubmit={handleManualSubmit} className="space-y-4">
                    <div className="space-y-1.5 text-left">
                      <label className="block text-xs font-semibold text-slate-700">
                        Daily Verification Code
                      </label>
                      <input
                        type="text"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value)}
                        placeholder="e.g. KOTHA-XXXXXX"
                        className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white transition-all uppercase"
                      />
                      <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
                        Get this code from the display screen or frontdesk receptionist. It changes daily.
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={verifying}
                      className="w-full h-12 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                    >
                      {verifying ? "Verifying..." : "Verify & Generate Token"}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
