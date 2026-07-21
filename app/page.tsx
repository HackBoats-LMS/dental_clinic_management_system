"use client";

import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (status === "authenticated") {
      const role = (session?.user as any)?.role;
      if (role === "admin") {
        router.push("/admin");
      } else if (role === "receptionist") {
        router.push("/receptionist");
      }
    }
  }, [status, session, router]);

  if (!mounted || status === "loading" || status === "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">
        <div className="w-6 h-6 border-2 border-[var(--primary)] border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Navigation */}
      <nav className="border-b border-[var(--border)] bg-white/50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="font-semibold text-xl tracking-tight text-[var(--foreground)]">
            DentalCare<span className="text-blue-600">.</span>
          </div>
          <div>
            <Link href="/login" className="text-sm font-medium text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors mr-6">
              Staff Portal
            </Link>
            <Link href="/login" className="btn btn-primary text-sm shadow-sm">
              Log In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 flex items-center justify-center p-6 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-600 text-sm font-medium mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            System Online & Active
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-[var(--foreground)] leading-[1.1] mb-6">
            Modernizing dental <br className="hidden md:block" /> clinic management.
          </h1>
          
          <p className="text-lg md:text-xl text-[var(--muted-foreground)] mb-10 max-w-2xl mx-auto font-light leading-relaxed">
            A seamless, unified platform to handle patient calls, transcriptions, and administrative tasks. Designed for efficiency and clarity.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/login" className="btn btn-primary px-8 py-3.5 text-base w-full sm:w-auto shadow-md">
              Access Dashboard
            </Link>
            <a href="mailto:support@dentalcare.com" className="btn btn-outline px-8 py-3.5 text-base w-full sm:w-auto">
              Contact Support
            </a>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-[var(--border)] py-8 text-center text-sm text-[var(--muted-foreground)]">
        <p>&copy; {new Date().getFullYear()} DentalCare Clinic Management System. All rights reserved.</p>
      </footer>
    </div>
  );
}
