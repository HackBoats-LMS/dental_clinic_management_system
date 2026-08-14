"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Doctor {
  doctorId: string;
  name: string;
  email: string;
  isPresent: boolean;
}

export default function ReceptionistDoctorDashboards() {
  const router = useRouter();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDoctors = async () => {
      try {
        const res = await fetch("/api/users/doctors");
        if (res.ok) {
          const data = await res.json();
          setDoctors(data);
        } else {
          setError("Failed to load doctors");
        }
      } catch (err) {
        console.error(err);
        setError("Error connecting to server");
      } finally {
        setLoading(false);
      }
    };
    fetchDoctors();
  }, []);

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-slate-500">Loading doctors...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">Manage Doctor Dashboards</h1>
      <p className="text-slate-500 text-sm">
        Select a doctor below to access their dashboard and manage their queue on their behalf.
      </p>

      {doctors.length === 0 ? (
        <div className="p-8 text-center bg-white border border-slate-200 rounded-xl">
          <p className="text-slate-500 text-sm">No doctors found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doc) => (
            <div
              key={doc.doctorId}
              onClick={() => router.push(`/receptionist/doctor-dashboard/${doc.doctorId}`)}
              className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm hover:shadow-md hover:border-teal-300 transition-all cursor-pointer flex flex-col gap-4"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-700 font-bold text-lg">
                  {doc.name[0]}
                </div>
                <div>
                  <h3 className="font-bold text-slate-900">Dr. {doc.name}</h3>
                  <p className="text-xs text-slate-500">{doc.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-auto">
                <span className={`w-2.5 h-2.5 rounded-full ${doc.isPresent ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                <span className="text-xs font-medium text-slate-600">
                  {doc.isPresent ? 'Present' : 'Absent'}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
