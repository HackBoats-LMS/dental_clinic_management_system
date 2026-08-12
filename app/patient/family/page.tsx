"use client";

import React, { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import NavBar from "../components/NavBar";

interface FamilyMember {
  fId: string;
  name: string;
  relation: string;
  age?: number;
  gender?: string;
  phoneNumber?: string;
  email?: string;
  medicalConditions?: string;
  previousDentalHistory?: string;
}

export default function FamilyMembersPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Deletion modal state
  const [deletingMember, setDeletingMember] = useState<FamilyMember | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const [formData, setFormData] = useState({
    name: "",
    relation: "Spouse",
    age: "",
    gender: "MALE",
    phoneNumber: "",
    email: "",
    previousDentalHistory: "",
    medicalConditions: ""
  });

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/patient/family");
      if (res.ok) {
        const data = await res.json();
        setMembers(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMembers();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/patient/family", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to add family member");
      }

      setSuccess("Family member registered successfully!");
      setFormData({
        name: "",
        relation: "Spouse",
        age: "",
        gender: "MALE",
        phoneNumber: "",
        email: "",
        previousDentalHistory: "",
        medicalConditions: ""
      });
      fetchMembers();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDeleteMember = async () => {
    if (!deletingMember) return;
    setDeleting(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/patient/family", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: deletingMember.fId })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete family member");
      }

      setSuccess(`Removed ${deletingMember.name} from family records.`);
      setMembers((prev) => prev.filter((m) => m.fId !== deletingMember.fId));
      setDeletingMember(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Unable to delete record");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <NavBar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-8 md:py-10 space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-6">
          <div>
            <span className="text-xs text-teal-700 font-bold tracking-wider uppercase block">
              Patient Care
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight mt-1">
              Family Member Records
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              Register dependents and immediate family for streamlined clinic consultations.
            </p>
          </div>

          <button
            onClick={() => router.push("/patient")}
            className="self-start sm:self-auto h-10 px-4 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold shadow-2xs transition-colors flex items-center gap-2"
          >
            <span>← Dashboard</span>
          </button>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm flex items-center justify-between shadow-2xs">
            <span>{error}</span>
            <button onClick={() => setError("")} className="text-red-600 hover:text-red-900 font-bold">✕</button>
          </div>
        )}
        {success && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center justify-between shadow-2xs">
            <span>{success}</span>
            <button onClick={() => setSuccess("")} className="text-emerald-600 hover:text-emerald-900 font-bold">✕</button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Add Family Member Form */}
          <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-7 space-y-6 shadow-2xs">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Register Dependents</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Provide accurate medical details so doctors can tailor dental care appropriately.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Full Name <span className="text-teal-700">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Ananya Sharma"
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Relation <span className="text-teal-700">*</span>
                  </label>
                  <select
                    name="relation"
                    value={formData.relation}
                    onChange={handleChange}
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-teal-600 focus:bg-white transition-colors"
                  >
                    <option value="Spouse">Spouse</option>
                    <option value="Child">Child</option>
                    <option value="Parent">Parent</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">Age</label>
                  <input
                    type="number"
                    name="age"
                    min="0"
                    max="120"
                    value={formData.age}
                    onChange={handleChange}
                    placeholder="e.g. 28"
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">Gender</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-teal-600 focus:bg-white transition-colors"
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">Phone Number</label>
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">Email Address</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="email@domain.com"
                    className="w-full h-11 px-3.5 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Medical Conditions / Allergies</label>
                <textarea
                  name="medicalConditions"
                  rows={2}
                  value={formData.medicalConditions}
                  onChange={handleChange}
                  placeholder="Diabetes, Penicillin allergy, Hypertension..."
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">Previous Dental History</label>
                <textarea
                  name="previousDentalHistory"
                  rows={2}
                  value={formData.previousDentalHistory}
                  onChange={handleChange}
                  placeholder="Root canal (2023), Braces, Extractions..."
                  className="w-full p-3 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-teal-600 focus:bg-white transition-colors"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full h-12 rounded-xl bg-teal-700 hover:bg-teal-800 text-white text-sm font-semibold transition-colors disabled:opacity-50 active:scale-[0.99] flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <span>Saving Record...</span>
                ) : (
                  <>
                    <span>Add Family Member</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* List of Registered Family Members */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 sm:p-6 space-y-4 shadow-2xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h2 className="text-base font-bold text-slate-900">Registered Family</h2>
                <span className="text-xs text-slate-600 font-mono px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                  {members.length} {members.length === 1 ? "record" : "records"}
                </span>
              </div>

              {loading ? (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Retrieving clinical records...
                </div>
              ) : members.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-xs space-y-1">
                  <p className="font-semibold text-slate-700">No family members registered</p>
                  <p className="text-slate-500">Fill in the form on the left to add a member.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {members.map((m) => (
                    <div
                      key={m.fId}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-sm text-slate-900">{m.name}</h3>
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-50 text-teal-800 border border-teal-200">
                            {m.relation}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600">
                          {m.age && <span>{m.age} yrs</span>}
                          {m.gender && <span>• {m.gender}</span>}
                          {m.phoneNumber && <span>• 📞 {m.phoneNumber}</span>}
                        </div>
                      </div>

                      <button
                        onClick={() => setDeletingMember(m)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Record"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Confirmation Modal for Deletion */}
      {deletingMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-sm w-full space-y-4 text-center shadow-lg">
            <div className="w-12 h-12 rounded-full bg-red-50 border border-red-200 text-red-600 mx-auto flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Delete Family Member?</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Are you sure you want to remove <strong className="text-slate-900">{deletingMember.name}</strong> ({deletingMember.relation})? This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeletingMember(null)}
                disabled={deleting}
                className="flex-1 h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteMember}
                disabled={deleting}
                className="flex-1 h-10 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete Record"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}