"use client";

import React, { useState, useSyncExternalStore, useRef } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);

  const servicesRef = useRef<HTMLDivElement>(null);
  
  const scrollServices = (direction: 'left' | 'right') => {
    if (servicesRef.current) {
      const scrollAmount = direction === 'left' ? -350 : 350;
      servicesRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Form states
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [service, setService] = useState("");
  const [date, setDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");
    setSubmitting(true);

    if (!name || !phone) {
      setErrorMsg("Name and Phone Number are required.");
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/guest/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, phoneNumber: phone, service, date }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg(data.message || "Appointment request submitted successfully!");
        setName("");
        setPhone("");
        setService("");
        setDate("");
        setTimeout(() => {
          setIsBookingModalOpen(false);
          setSuccessMsg("");
        }, 2000);
      } else {
        setErrorMsg(data.error || "Failed to submit request.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("An error occurred. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePortalRedirect = () => {
    if (status === "authenticated" && session?.user) {
      const role = session.user.role;
      if (role === "patient") {
        router.push("/patient");
      } else if (role === "doctor") {
        router.push("/doctor");
      } else {
        router.push("/receptionist/todays-calls");
      }
    } else {
      router.push("/login");
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 rounded-full border-2 border-[#065268] border-t-transparent animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-800 flex flex-col font-sans relative selection:bg-[#065268] selection:text-white">
      {/* 1. Header / Navbar */}
      <nav className="bg-white/80 backdrop-blur-md sticky top-0 z-50 w-full border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 h-16 sm:h-20 md:h-24 flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 sm:gap-3 group shrink-0">
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#EBF5F3] flex items-center justify-center text-[#065268] transition-transform group-hover:scale-105 shadow-sm">
              <svg className="w-4 h-4 sm:w-5 sm:h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21a9 9 0 0 1 0-18c2 0 3 1 4 3.5 1 2.5 1.5 4 1.5 5.5 0 2-1 3.5-2.5 4.5C14 17.5 13 21 12 21z" />
                <path d="M12 3c-2 0-3 1-4 3.5-1 2.5-1.5 4-1.5 5.5 0 2 1 3.5 2.5 4.5C10 17.5 11 21 12 21" />
              </svg>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-base sm:text-lg md:text-xl font-bold tracking-[0.15em] text-[#065268] uppercase leading-none">
                KOTHAMAS
              </span>
              <span className="text-[8px] sm:text-[10px] font-bold tracking-[0.25em] text-[#065268]/70 uppercase leading-tight pt-0.5 sm:pt-1">
                Dental Care
              </span>
            </div>
          </Link>

          {/* Navigation Links */}
          <div className="hidden lg:flex items-center gap-10">
            <a href="#" className="text-sm font-medium text-slate-600 hover:text-[#065268] transition-colors">About Us</a>
            <a href="#" className="text-sm font-medium text-slate-600 hover:text-[#065268] transition-colors">Our Services</a>
            <a href="#" className="text-sm font-medium text-slate-600 hover:text-[#065268] transition-colors">Our Clinic</a>
            <a href="#" className="text-sm font-medium text-slate-600 hover:text-[#065268] transition-colors">For Patients</a>
            <a href="#" className="text-sm font-medium text-slate-600 hover:text-[#065268] transition-colors">Contact</a>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Book Appointment - hidden on mobile, shown in hamburger menu instead */}
            <button
              onClick={() => router.push("/login")}
              className="hidden sm:inline-flex h-10 sm:h-12 px-4 sm:px-6 items-center justify-center rounded-full bg-[#065268] hover:bg-[#043e4f] text-white text-[10px] sm:text-xs font-bold gap-2 shadow-sm transition-colors duration-200"
            >
              <span>BOOK APPOINTMENT</span>
              <span className="text-xs">↗</span>
            </button>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-slate-50 lg:hidden text-slate-700 focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-100 bg-white px-6 py-6 space-y-4 shadow-lg absolute w-full left-0">
            <a href="#" className="block text-sm font-medium text-slate-700" onClick={() => setMobileMenuOpen(false)}>About Us</a>
            <a href="#" className="block text-sm font-medium text-slate-700" onClick={() => setMobileMenuOpen(false)}>Our Services</a>
            <a href="#" className="block text-sm font-medium text-slate-700" onClick={() => setMobileMenuOpen(false)}>Our Clinic</a>
            <a href="#" className="block text-sm font-medium text-slate-700" onClick={() => setMobileMenuOpen(false)}>For Patients</a>
            <a href="#" className="block text-sm font-medium text-slate-700" onClick={() => setMobileMenuOpen(false)}>Contact</a>
            <hr className="border-slate-100" />
            <button 
              onClick={() => { setMobileMenuOpen(false); router.push("/login"); }}
              className="w-full h-12 rounded-full bg-[#065268] text-white font-bold text-xs"
            >
              Book Appointment
            </button>
          </div>
        )}
      </nav>

      {/* 2. Hero Section */}
      <header
        className="relative w-full"
        style={{
          backgroundImage: 'url(/images/hero-aligner.png)',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right center',
          backgroundSize: '50% auto',
        }}
      >
        {/* Soft left-edge fade so text area stays readable */}
        <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-transparent pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8 relative z-10">
          <div className="py-16 sm:py-20 md:py-28 lg:py-32 max-w-xl">
            <div className="space-y-6 sm:space-y-8 text-left">
              <div className="space-y-3">
                <span className="text-[10px] sm:text-xs font-black tracking-widest text-[#065268]/80 uppercase block">
                  HEALTHY SMILE. CONFIDENT YOU.
                </span>
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-light tracking-tight text-slate-900 leading-[1.05]">
                  Refined<br />
                  <span className="font-semibold text-[#065268]">Dental Care</span>
                </h1>
              </div>

              <p className="text-sm sm:text-base md:text-lg text-slate-500 font-light leading-relaxed max-w-md">
                Advanced care. Thoughtful approach.<br />
                Beautiful, lasting results.
              </p>

              <div>
                <button
                  onClick={() => router.push("/login")}
                  className="inline-flex h-12 sm:h-14 px-6 sm:px-8 rounded-full bg-[#065268] hover:bg-[#043e4f] text-white text-[10px] sm:text-xs font-bold tracking-wider shadow-md transition-colors duration-200 items-center justify-center gap-3"
                >
                  <span>DISCOVER OUR SERVICES</span>
                  <span>→</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 3. Core Features Row */}
      <section className="max-w-7xl mx-auto w-full px-6 sm:px-8 py-10 border-t border-slate-100/80">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4 py-4">
          {/* Feature 1 */}
          <div className="flex items-center gap-3.5 justify-start md:justify-center">
            <div className="text-[#065268] text-xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-slate-700">Advanced Technology</span>
          </div>

          {/* Feature 2 */}
          <div className="flex items-center gap-3.5 justify-start md:justify-center md:border-l border-slate-100">
            <div className="text-[#065268] text-xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-slate-700">Experienced Specialists</span>
          </div>

          {/* Feature 3 */}
          <div className="flex items-center gap-3.5 justify-start md:justify-center md:border-l border-slate-100">
            <div className="text-[#065268] text-xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-slate-700">Personalized Care</span>
          </div>

          {/* Feature 4 */}
          <div className="flex items-center gap-3.5 justify-start md:justify-center md:border-l border-slate-100">
            <div className="text-[#065268] text-xl">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            </div>
            <span className="text-sm font-semibold text-slate-700">Comfort Focused</span>
          </div>
        </div>
      </section>

      {/* 4. Services Section */}
      <section className="max-w-7xl mx-auto w-full px-6 sm:px-8 py-16 md:py-24 border-t border-slate-100">
        {/* Section Header */}
        <div className="text-center mb-12 md:mb-16 space-y-4">
          <span className="text-[10px] sm:text-xs font-black tracking-widest text-[#065268]/80 uppercase block">
            OUR SERVICES
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight text-slate-900 leading-tight">
            Comprehensive <span className="font-semibold">Dental Solutions</span>
          </h2>
          <p className="text-sm sm:text-base text-slate-500 font-light leading-relaxed max-w-lg mx-auto">
            Expert care across every aspect of your oral health and smile.
          </p>
        </div>

        {/* Services Horizontal Scroll */}
        <div className="relative group md:px-14 lg:px-20">
          {/* Scroll Buttons */}
          <button 
            onClick={() => scrollServices('left')}
            className="hidden md:flex absolute left-0 lg:left-4 top-1/2 -translate-y-1/2 z-20 items-center justify-center text-[#065268] hover:scale-110 transition-transform text-5xl sm:text-6xl font-light"
          >
            &lt;
          </button>
          <button 
            onClick={() => scrollServices('right')}
            className="hidden md:flex absolute right-0 lg:right-4 top-1/2 -translate-y-1/2 z-20 items-center justify-center text-[#065268] hover:scale-110 transition-transform text-5xl sm:text-6xl font-light"
          >
            &gt;
          </button>

          <div 
            ref={servicesRef}
            className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth gap-6 md:gap-8 pb-8 -mx-6 px-6 sm:-mx-8 sm:px-8 md:mx-0 md:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
          {/* Service 1 - Smile Designing & Cosmetic Dentistry */}
          <div className="shrink-0 snap-center w-[85vw] sm:w-[340px] lg:w-[400px] bg-[#FAF9F6] rounded-[24px] sm:rounded-[32px] p-6 sm:p-8 flex flex-col justify-between text-left border border-slate-100/50 hover:border-[#065268]/20 transition-colors duration-300">
            <div className="space-y-5">
              <div className="w-full aspect-[4/3] rounded-2xl bg-white overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/service-smile-designing.png"
                  alt="Smile Designing & Cosmetic Dentistry"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-2">
                <h4 className="text-base sm:text-lg font-bold text-slate-900">Smile Designing &amp; Cosmetic Dentistry</h4>
                <p className="text-xs sm:text-sm text-slate-500 font-light leading-relaxed">
                  Transform your smile with veneers, teeth whitening, and custom cosmetic treatments for a flawless, radiant look.
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push("/login")}
              className="text-xs font-bold text-[#065268]/60 hover:text-[#065268] flex items-center gap-1.5 mt-6 tracking-wider uppercase transition-colors duration-200"
            >
              <span>LEARN MORE</span>
              <span>→</span>
            </button>
          </div>

          {/* Service 2 - Orthodontics & Clear Aligners */}
          <div className="shrink-0 snap-center w-[85vw] sm:w-[340px] lg:w-[400px] bg-[#FAF9F6] rounded-[24px] sm:rounded-[32px] p-6 sm:p-8 flex flex-col justify-between text-left border border-slate-100/50 hover:border-[#065268]/20 transition-colors duration-300">
            <div className="space-y-5">
              <div className="w-full aspect-[4/3] rounded-2xl bg-white overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/service-orthodontics.png"
                  alt="Orthodontics & Clear Aligners"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-2">
                <h4 className="text-base sm:text-lg font-bold text-slate-900">Orthodontics &amp; Clear Aligners</h4>
                <p className="text-xs sm:text-sm text-slate-500 font-light leading-relaxed">
                  Discreet, comfortable solutions for straighter teeth and a healthier bite — customized for you.
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push("/login")}
              className="text-xs font-bold text-[#065268]/60 hover:text-[#065268] flex items-center gap-1.5 mt-6 tracking-wider uppercase transition-colors duration-200"
            >
              <span>LEARN MORE</span>
              <span>→</span>
            </button>
          </div>

          {/* Service 3 - Preventive & General Dentistry */}
          <div className="shrink-0 snap-center w-[85vw] sm:w-[340px] lg:w-[400px] bg-[#FAF9F6] rounded-[24px] sm:rounded-[32px] p-6 sm:p-8 flex flex-col justify-between text-left border border-slate-100/50 hover:border-[#065268]/20 transition-colors duration-300">
            <div className="space-y-5">
              <div className="w-full aspect-[4/3] rounded-2xl bg-white overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/service-preventive.png"
                  alt="Preventive & General Dentistry"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-2">
                <h4 className="text-base sm:text-lg font-bold text-slate-900">Preventive &amp; General Dentistry</h4>
                <p className="text-xs sm:text-sm text-slate-500 font-light leading-relaxed">
                  Regular check-ups, cleanings, and preventive care to maintain your oral health and catch issues early.
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push("/login")}
              className="text-xs font-bold text-[#065268]/60 hover:text-[#065268] flex items-center gap-1.5 mt-6 tracking-wider uppercase transition-colors duration-200"
            >
              <span>LEARN MORE</span>
              <span>→</span>
            </button>
          </div>

          {/* Service 4 - Restorative Dentistry */}
          <div className="shrink-0 snap-center w-[85vw] sm:w-[340px] lg:w-[400px] bg-[#FAF9F6] rounded-[24px] sm:rounded-[32px] p-6 sm:p-8 flex flex-col justify-between text-left border border-slate-100/50 hover:border-[#065268]/20 transition-colors duration-300">
            <div className="space-y-5">
              <div className="w-full aspect-[4/3] rounded-2xl bg-white overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/service-restorative.png"
                  alt="Restorative Dentistry"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-2">
                <h4 className="text-base sm:text-lg font-bold text-slate-900">Restorative Dentistry</h4>
                <p className="text-xs sm:text-sm text-slate-500 font-light leading-relaxed">
                  Crowns, bridges, implants, and fillings to restore the function and beauty of damaged or missing teeth.
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push("/login")}
              className="text-xs font-bold text-[#065268]/60 hover:text-[#065268] flex items-center gap-1.5 mt-6 tracking-wider uppercase transition-colors duration-200"
            >
              <span>LEARN MORE</span>
              <span>→</span>
            </button>
          </div>

          {/* Service 5 - Gum & Jaw Treatments */}
          <div className="shrink-0 snap-center w-[85vw] sm:w-[340px] lg:w-[400px] bg-[#FAF9F6] rounded-[24px] sm:rounded-[32px] p-6 sm:p-8 flex flex-col justify-between text-left border border-slate-100/50 hover:border-[#065268]/20 transition-colors duration-300">
            <div className="space-y-5">
              <div className="w-full aspect-[4/3] rounded-2xl bg-white overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/images/service-gum-jaw.png"
                  alt="Gum & Jaw Treatments"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="space-y-2">
                <h4 className="text-base sm:text-lg font-bold text-slate-900">Gum &amp; Jaw Treatments</h4>
                <p className="text-xs sm:text-sm text-slate-500 font-light leading-relaxed">
                  Expert periodontal and TMJ care to treat gum disease, jaw pain, and ensure long-term oral wellness.
                </p>
              </div>
            </div>
            <button
              onClick={() => router.push("/login")}
              className="text-xs font-bold text-[#065268]/60 hover:text-[#065268] flex items-center gap-1.5 mt-6 tracking-wider uppercase transition-colors duration-200"
            >
              <span>LEARN MORE</span>
              <span>→</span>
            </button>
          </div>
          </div>
        </div>

        {/* CTA below services */}
        <div className="text-center mt-10 md:mt-14">
          <button
            onClick={() => router.push("/login")}
            className="inline-flex h-12 sm:h-14 px-6 sm:px-8 rounded-full bg-[#065268] hover:bg-[#043e4f] text-white text-[10px] sm:text-xs font-bold tracking-wider shadow-md transition-colors duration-200 items-center justify-center gap-3"
          >
            <span>BOOK AN APPOINTMENT</span>
            <span>→</span>
          </button>
        </div>
      </section>

      {/* 5. Patient Portal & Banner */}
      <section className="max-w-7xl mx-auto w-full px-6 sm:px-8 py-16 md:py-24 border-t border-slate-100">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Image */}
          <div className="lg:col-span-6 rounded-[36px] overflow-hidden bg-slate-50 border border-slate-100 shadow-sm aspect-[1.6]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/clinic-interior.png"
              alt="Dental Chair Clinic Interior"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Right Action Panel */}
          <div className="lg:col-span-6 space-y-8 text-left lg:pl-8">
            <div className="space-y-3">
              <span className="text-xs font-black tracking-widest text-[#065268]/80 uppercase block">
                PATIENT PORTAL
              </span>
              <h2 className="text-4xl sm:text-5xl font-light tracking-tight text-slate-900 leading-tight">
                Your Health,<br />
                <span className="font-semibold text-[#065268]">All in One Place</span>
              </h2>
              <p className="text-sm text-slate-500 font-light leading-relaxed max-w-sm">
                Access your care portal to manage appointments and records.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={handlePortalRedirect}
                className="inline-flex h-12 px-6 items-center justify-center rounded-full bg-[#065268] hover:bg-[#043e4f] text-white text-xs font-bold gap-2 shadow-sm transition-colors duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>LOG IN</span>
              </button>

              <Link
                href="/login"
                className="inline-flex h-12 px-6 items-center justify-center rounded-full border border-[#065268] hover:bg-[#FAF9F6] text-[#065268] text-xs font-bold gap-2 transition-colors duration-200"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                <span>CREATE PATIENT PROFILE</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Bottom Features Banner */}
      <section className="bg-[#FAF9F6] border-t border-slate-100 py-10 w-full">
        <div className="max-w-7xl mx-auto px-6 sm:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="flex items-center gap-3">
              <span className="text-[#065268] text-xl font-bold">✓</span>
              <span className="text-xs font-semibold text-slate-700">State-of-the-Art Technology</span>
            </div>
            <div className="flex items-center gap-3 lg:border-l border-slate-200 lg:pl-6">
              <span className="text-[#065268] text-xl font-bold">✓</span>
              <span className="text-xs font-semibold text-slate-700">Highly Trained Professionals</span>
            </div>
            <div className="flex items-center gap-3 lg:border-l border-slate-200 lg:pl-6">
              <span className="text-[#065268] text-xl font-bold">✓</span>
              <span className="text-xs font-semibold text-slate-700">Personalized Treatment Plans</span>
            </div>
            <div className="flex items-center gap-3 lg:border-l border-slate-200 lg:pl-6">
              <span className="text-[#065268] text-xl font-bold">✓</span>
              <span className="text-xs font-semibold text-slate-700">Relaxing & Modern Environment</span>
            </div>
          </div>
        </div>
      </section>

      {/* Static Footer */}
      <footer className="border-t border-slate-100 py-12 text-center text-xs text-slate-400 bg-white">
        <div className="max-w-7xl mx-auto px-6 sm:px-8 space-y-4">
          <div className="flex flex-col items-center justify-center gap-2">
            <div className="w-7 h-7 rounded-full bg-[#EBF5F3] flex items-center justify-center text-[#065268]">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21a9 9 0 0 1 0-18c2 0 3 1 4 3.5 1 2.5 1.5 4 1.5 5.5 0 2-1 3.5-2.5 4.5C14 17.5 13 21 12 21z" />
                <path d="M12 3c-2 0-3 1-4 3.5-1 2.5-1.5 4-1.5 5.5 0 2 1 3.5 2.5 4.5C10 17.5 11 21 12 21" />
              </svg>
            </div>
            <span className="font-bold tracking-widest text-[#065268] uppercase text-sm">Kothamas Dental Care</span>
          </div>
          <p>&copy; {new Date().getFullYear()} Kothamas Dental Care. All rights reserved.</p>
        </div>
      </footer>




      {/* 7. Appointment Booking Modal Overlay */}
      {isBookingModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-[32px] w-full max-w-lg overflow-hidden shadow-2xl relative animate-in fade-in-50 zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-8 bg-[#065268] text-white text-left relative">
              <button
                onClick={() => { setIsBookingModalOpen(false); setErrorMsg(""); setSuccessMsg(""); }}
                className="absolute top-6 right-6 text-white/80 hover:text-white text-xl font-light w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10"
              >
                ✕
              </button>
              <h3 className="text-2xl font-bold tracking-tight">Book Your Appointment</h3>
              <p className="text-xs text-teal-100/80 font-light mt-1.5">
                Take the first step towards a healthier, brighter smile today.
              </p>
            </div>

            {/* Form */}
            <div className="p-8 space-y-6">
              {errorMsg && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-100 text-rose-800 text-xs text-left font-medium">
                  {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs text-left font-medium">
                  {successMsg}
                </div>
              )}

              <form onSubmit={handleBookingSubmit} className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Your Name"
                    required
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:outline-none focus:border-[#065268] focus:ring-1 focus:ring-[#065268]/30 transition-all text-sm text-slate-800"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Phone Number"
                    required
                    className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:outline-none focus:border-[#065268] focus:ring-1 focus:ring-[#065268]/30 transition-all text-sm text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Select Service</label>
                    <div className="relative">
                      <select
                        value={service}
                        onChange={(e) => setService(e.target.value)}
                        className="w-full h-12 px-3.5 rounded-xl border border-slate-200 focus:outline-none focus:border-[#065268] transition-all text-sm text-slate-800 appearance-none bg-transparent"
                      >
                        <option value="">Select Service</option>
                        <option value="General Dentistry">General Dentistry</option>
                        <option value="Dental Implants">Dental Implants</option>
                        <option value="Orthodontics">Orthodontics</option>
                        <option value="Cosmetic Consultation">Cosmetic Consultation</option>
                      </select>
                      <div className="absolute inset-y-0 right-4 flex items-center pointer-events-none text-slate-400">
                        ▼
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Preferred Date</label>
                    <input
                      type="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full h-12 px-4 rounded-xl border border-slate-200 focus:outline-none focus:border-[#065268] transition-all text-sm text-slate-800"
                    />
                  </div>
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full h-13 bg-[#065268] hover:bg-[#043e4f] text-white font-bold rounded-xl text-xs tracking-wider flex items-center justify-center gap-2 transition-colors duration-200 disabled:opacity-50"
                  >
                    {submitting ? "Booking..." : "SUBMIT APPOINTMENT REQUEST →"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

