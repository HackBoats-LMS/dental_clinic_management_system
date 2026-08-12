"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

type ScheduleEntry = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function DoctorSchedulePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [schedule, setSchedule] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (status === "authenticated" && session?.user?.role !== "doctor") {
      router.push("/");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status !== "authenticated" || session?.user?.role !== "doctor") return;

    const controller = new AbortController();
    const load = async () => {
      try {
        const res = await fetch("/api/doctor/schedule", { signal: controller.signal });
        if (res.ok) {
          const data = await res.json();
          setSchedule(data.schedules);
        }
      } catch (err) {
        if (!controller.signal.aborted) console.error("Failed to fetch schedule", err);
      } finally {
        setLoading(false);
      }
    };

    void load();
    return () => controller.abort();
  }, [status, session]);

  const handleToggleDay = (dayOfWeek: number) => {
    const existing = schedule.find((s) => s.dayOfWeek === dayOfWeek);
    if (existing) {
      setSchedule((prev) =>
        prev.map((s) => (s.dayOfWeek === dayOfWeek ? { ...s, isAvailable: !s.isAvailable } : s))
      );
    } else {
      setSchedule((prev) => [
        ...prev,
        { id: "", dayOfWeek, startTime: "09:00", endTime: "17:00", isAvailable: true },
      ]);
    }
  };

  const handleTimeChange = (dayOfWeek: number, field: "startTime" | "endTime", value: string) => {
    setSchedule((prev) =>
      prev.map((s) => (s.dayOfWeek === dayOfWeek ? { ...s, [field]: value } : s))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      // Save each day's schedule
      const days = schedule.map((s) =>
        fetch("/api/doctor/schedule", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
            endTime: s.endTime,
            isAvailable: s.isAvailable,
          }),
        })
      );
      await Promise.all(days);
      setSuccess("Schedule saved successfully!");
      const refreshRes = await fetch("/api/doctor/schedule");
      if (refreshRes.ok) {
        const data = await refreshRes.json();
        setSchedule(data.schedules);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save schedule");
    } finally {
      setSaving(false);
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-teal-600 border-t-transparent animate-spin mx-auto"></div>
          <p className="text-xs text-slate-500 font-medium">Loading schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      <header className="sticky top-0 z-30 w-full bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-900">My Availability</h1>
            <p className="text-[10px] text-slate-400 font-semibold tracking-wider uppercase">
              Set your weekly schedule
            </p>
          </div>
          <button
            onClick={() => router.push("/doctor")}
            className="h-9 px-3.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors"
          >
            ← Back
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 py-8 space-y-6">
        {error && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm">
            {success}
          </div>
        )}

        <p className="text-sm text-slate-600">
          Set the days and hours you are available for appointments. The receptionist will see these
          when scheduling treatment sessions for your patients.
        </p>

        <div className="space-y-3">
          {DAY_NAMES.map((day, idx) => {
            const entry = schedule.find((s) => s.dayOfWeek === idx);
            const isOn = entry?.isAvailable ?? false;

            return (
              <div
                key={idx}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-colors ${
                  isOn
                    ? "bg-white border-slate-200 shadow-2xs"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <button
                  type="button"
                  onClick={() => handleToggleDay(idx)}
                  className={`w-12 h-7 rounded-full transition-colors relative shrink-0 ${
                    isOn ? "bg-teal-600" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${
                      isOn ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>

                <span
                  className={`text-sm font-semibold w-24 ${
                    isOn ? "text-slate-900" : "text-slate-400"
                  }`}
                >
                  {day}
                </span>

                {isOn && (
                  <div className="flex items-center gap-2 ml-auto">
                    <input
                      type="time"
                      value={entry?.startTime || "09:00"}
                      onChange={(e) => handleTimeChange(idx, "startTime", e.target.value)}
                      className="h-9 px-3 rounded-lg border border-slate-300 text-sm text-slate-800 focus:ring-2 focus:ring-teal-200 focus:border-teal-400 outline-none"
                    />
                    <span className="text-xs text-slate-400">to</span>
                    <input
                      type="time"
                      value={entry?.endTime || "17:00"}
                      onChange={(e) => handleTimeChange(idx, "endTime", e.target.value)}
                      className="h-9 px-3 rounded-lg border border-slate-300 text-sm text-slate-800 focus:ring-2 focus:ring-teal-200 focus:border-teal-400 outline-none"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={() => void handleSave()}
            disabled={saving}
            className="h-12 px-8 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-sm font-semibold transition-all active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Schedule"}
          </button>
        </div>
      </main>
    </div>
  );
}
