"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import NavBar from "../../components/NavBar";

interface Doctor {
  doctorId: string;
  name: string;
  email: string;
  isPresent?: boolean;
}

interface FamilyMember {
  fId: string;
  name: string;
  relation: string;
}

export default function CreateOpPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedType, setSelectedType] = useState<"SELF" | "FAMILY">("SELF");
  const [selectedFamilyMemberId, setSelectedFamilyMemberId] = useState("");
  const [selectedDoctorId, setSelectedDoctorId] = useState("");

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
    const fetchData = async () => {
      try {
        setLoading(true);
        const [docRes, famRes] = await Promise.all([
          fetch("/api/users/doctors"),
          fetch("/api/patient/family")
        ]);

        if (docRes.ok) {
          const docData = await docRes.json();
          if (Array.isArray(docData)) setDoctors(docData);
        }

        if (famRes.ok) {
          const famData = await famRes.json();
          if (Array.isArray(famData)) setFamilyMembers(famData);
        }
      } catch (err) {
        console.error("Failed to load initial data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!selectedDoctorId) {
      setError("Please select an attending doctor");
      return;
    }

    if (selectedType === "FAMILY" && !selectedFamilyMemberId) {
      setError("Please select a registered family member");
      return;
    }

    

    setSubmitting(true);
    try {
      const res = await fetch("/api/patient/op", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          doctorId: selectedDoctorId,
          familyMemberId: selectedType === "FAMILY" ? selectedFamilyMemberId : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to register OP slip");
      }

      setSuccess("Out-Patient registration slip created successfully!");
      setTimeout(() => {
        router.push("/patient");
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register OP slip");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <NavBar />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-5">
          <div>
            <span className="text-xs text-teal-700 font-bold tracking-wider uppercase block">
              Consultation Slip
            </span>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight mt-1">
              Out-Patient (OP) Registration
            </h1>
          </div>
          <button
            onClick={() => router.push("/patient")}
            className="h-10 px-4 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold shadow-2xs transition-colors"
          >
            ← Back
          </button>
        </div>

        {/* Card */}
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
            {/* Beneficiary Toggle */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-700">
                Patient Registration For <span className="text-teal-700">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedType("SELF")}
                  className={`h-12 rounded-xl text-xs font-semibold border transition-colors flex items-center justify-center gap-2 ${
                    selectedType === "SELF"
                      ? "bg-teal-50 border-teal-600 text-teal-900 shadow-2xs"
                      : "bg-slate-50 border-slate-300 text-slate-600 hover:bg-white"
                  }`}
                >
                  <span>Myself</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedType("FAMILY")}
                  className={`h-12 rounded-xl text-xs font-semibold border transition-colors flex items-center justify-center gap-2 ${
                    selectedType === "FAMILY"
                      ? "bg-teal-50 border-teal-600 text-teal-900 shadow-2xs"
                      : "bg-slate-50 border-slate-300 text-slate-600 hover:bg-white"
                  }`}
                >
                  <span>Family Member</span>
                </button>
              </div>
            </div>

            {/* Family Select */}
            {selectedType === "FAMILY" && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Select Family Member <span className="text-teal-700">*</span>
                </label>
                {familyMembers.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-300 text-slate-600 text-xs flex items-center justify-between">
                    <span>No family members registered yet.</span>
                    <button
                      type="button"
                      onClick={() => router.push("/patient/family")}
                      className="text-teal-700 font-bold hover:underline"
                    >
                      + Add Member
                    </button>
                  </div>
                ) : (
                  <select
                    value={selectedFamilyMemberId}
                    onChange={(e) => setSelectedFamilyMemberId(e.target.value)}
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-teal-600 focus:bg-white transition-colors"
                  >
                    <option value="">Choose registered member</option>
                    {familyMembers.map((m) => (
                      <option key={m.fId} value={m.fId}>
                        {m.name} ({m.relation})
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {/* Attending Doctor */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Attending Specialist <span className="text-teal-700">*</span>
              </label>
              {loading ? (
                <div className="h-11 rounded-xl bg-slate-50 border border-slate-300 flex items-center px-4 text-xs text-slate-400">
                  Loading active doctors...
                </div>
              ) : doctors.length === 0 ? (
                <div className="h-11 rounded-xl bg-slate-50 border border-slate-300 flex items-center px-4 text-xs text-slate-500">
                  No doctors currently listed.
                </div>
              ) : (
                <select
                  value={selectedDoctorId}
                  onChange={(e) => setSelectedDoctorId(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-teal-600 focus:bg-white transition-colors"
                >
                  <option value="">Select attending specialist</option>
                  {doctors.map((doc) => (
                    <option key={doc.doctorId} value={doc.doctorId}>
                      Dr. {doc.name} {doc.isPresent ? " (On Duty)" : ""}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full h-12 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold transition-colors disabled:opacity-50 active:scale-[0.99] flex items-center justify-center gap-2"
            >
              {submitting ? (
                <span>Generating Slip...</span>
              ) : (
                <>
                  <span>Confirm OP Registration</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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