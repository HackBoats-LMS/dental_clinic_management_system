"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

function LoginContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams?.get("callbackUrl");

  useEffect(() => {
    if (status === "authenticated" && session) {
      const role = session.user?.role;
      const profileComplete = session.user?.profileComplete;

      if (role === "admin") {
        router.push("/admin");
      } else if (role === "receptionist") {
        router.push("/receptionist");
      } else if (role === "doctor") {
        router.push("/doctor");
      } else if (role === "patient") {
        if (!profileComplete) {
          router.push("/patient/completeProfile");
        } else {
          router.push("/patient");
        }
      } else if (callbackUrl) {
        router.push(callbackUrl);
      } else {
        router.push("/");
      }
    }
  }, [status, session, router, callbackUrl]);


  if (status === "loading") {
    return <div className="min-h-screen flex items-center justify-center bg-[var(--background)]">Loading...</div>;
  }

  return (
    <div className="min-h-screen flex text-slate-800 font-sans selection:bg-[#065268] selection:text-white">
      {/* Left Side: Visual / Branding */}
      <div className="hidden lg:flex w-1/2 relative bg-slate-50 border-r border-slate-100 items-end p-12">
        {/* Background Image */}
        <div className="absolute inset-0 z-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/clinic-interior.png"
            alt="Clinic Interior"
            className="w-full h-full object-cover"
          />
          {/* Overlay to ensure text readability if needed */}
          <div className="absolute inset-0 bg-[#065268]/20 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#065268]/90 via-[#065268]/40 to-transparent" />
        </div>

        {/* Branding content over image */}
        <div className="relative z-10 w-full max-w-lg">
          <span className="text-[10px] font-black tracking-widest text-white/80 uppercase block mb-3">
            KOTHAMAS DENTAL CARE
          </span>
          <h2 className="text-4xl md:text-5xl font-light tracking-tight text-white leading-[1.1] mb-4">
            Excellence in <br />
            <span className="font-semibold">Every Detail</span>
          </h2>
          <p className="text-white/80 font-light text-sm md:text-base leading-relaxed">
            Log in to manage appointments, access patient records, and streamline your clinic's daily operations.
          </p>
        </div>
      </div>

      {/* Right Side: Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-white relative">
        <div className="w-full max-w-sm space-y-10">
          
          {/* Logo Component */}
          <div className="flex items-center gap-3 group mx-auto w-fit lg:mx-0">
            <div className="w-10 h-10 rounded-full bg-[#EBF5F3] flex items-center justify-center text-[#065268] shadow-sm">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21a9 9 0 0 1 0-18c2 0 3 1 4 3.5 1 2.5 1.5 4 1.5 5.5 0 2-1 3.5-2.5 4.5C14 17.5 13 21 12 21z" />
                <path d="M12 3c-2 0-3 1-4 3.5-1 2.5-1.5 4-1.5 5.5 0 2 1 3.5 2.5 4.5C10 17.5 11 21 12 21" />
              </svg>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-xl font-bold tracking-[0.15em] text-[#065268] uppercase leading-none">
                KOTHAMAS
              </span>
              <span className="text-[10px] font-bold tracking-[0.25em] text-[#065268]/70 uppercase leading-tight pt-1">
                Dental Care
              </span>
            </div>
          </div>

          {/* Welcome Text */}
          <div className="text-center lg:text-left space-y-2">
            <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-slate-900">
              Welcome Back
            </h1>
            <p className="text-sm text-slate-500 font-light">
              Sign in with your authorized Google account to continue.
            </p>
          </div>

          {/* Login Actions */}
          <div className="space-y-6">
            <button
              onClick={() => signIn("google", callbackUrl ? { callbackUrl } : undefined)}
              className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 hover:bg-[#FAF9F6] hover:border-[#065268]/30 font-semibold h-12 rounded-xl transition-all shadow-sm text-sm"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                <path d="M1 1h22v22H1z" fill="none" />
              </svg>
              Continue with Google
            </button>
            
            <p className="text-xs text-slate-400 font-light text-center lg:text-left">
              Your role will be automatically determined based on your email address. New patients will be directed to create a profile.
            </p>
          </div>
          
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[var(--background)]">Loading...</div>}>
      <LoginContent />
    </Suspense>
  );
}
