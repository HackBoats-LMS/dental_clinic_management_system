"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AddCallsPage() {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();

  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newNotes, setNewNotes] = useState("");
  const [newDate, setNewDate] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  if (sessionStatus === "unauthenticated") {
    router.push("/api/auth/signin");
    return null;
  }

  if (sessionStatus === "authenticated" && (session?.user as any)?.role !== "receptionist") {
    router.push("/");
    return null;
  }

  const handleAddCall = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMsg("");

    try {
      const res = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, phoneNumber: newPhone, notes: newNotes, date: newDate }),
      });
      if (res.ok) {
        setNewName("");
        setNewPhone("");
        setNewNotes("");
        setSuccessMsg("Call successfully added!");
        
        // Hide success message after 3 seconds
        setTimeout(() => {
          setSuccessMsg("");
        }, 3000);
      }
    } catch (error) {
      console.error("Failed to add call", error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
      <header className="mb-8 md:mb-10">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[var(--foreground)]">Add New Call</h1>
        <p className="text-[var(--muted-foreground)] mt-1 md:mt-2 text-sm md:text-base">Add a new person to the call list.</p>
      </header>

      <div className="card max-w-2xl bg-white border-[var(--border)] p-6 md:p-8">
        {successMsg && (
          <div className="mb-6 p-4 bg-green-50 text-green-700 rounded-md border border-green-200 flex items-center gap-2">
            <span>✅</span> {successMsg}
          </div>
        )}
        
        <form onSubmit={handleAddCall} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Date</label>
              <input 
                required
                type="date" 
                value={newDate} 
                onChange={e => setNewDate(e.target.value)}
                className="w-full px-4 py-2 border border-[var(--border)] rounded-md bg-transparent outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Name</label>
              <input 
                required
                type="text" 
                value={newName} 
                onChange={e => setNewName(e.target.value)}
                className="w-full px-4 py-2 border border-[var(--border)] rounded-md bg-transparent outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
                placeholder="John Doe"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Phone Number</label>
            <input 
              required
              type="text" 
              value={newPhone} 
              onChange={e => setNewPhone(e.target.value)}
              className="w-full px-4 py-2 border border-[var(--border)] rounded-md bg-transparent outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
              placeholder="+1 234 567 890"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">Notes (Optional)</label>
            <textarea 
              value={newNotes} 
              onChange={e => setNewNotes(e.target.value)}
              rows={4}
              className="w-full px-4 py-2 border border-[var(--border)] rounded-md bg-transparent outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition-all"
              placeholder="Called about..."
            />
          </div>
          <div className="pt-2">
            <button 
              type="submit" 
              disabled={isSaving}
              className="btn btn-primary px-8 shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Save Contact"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
