"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";

const NavBar = () => {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const navLinks = [
    { name: "Dashboard", href: "/patient" },
    { name: "Register OP", href: "/patient/create/op" },
    { name: "Treatment Plans", href: "/patient/treatment-plans" },
    { name: "Family Records", href: "/patient/family" },
    { name: "Visit History", href: "/patient/visits" },
  ];

  return (
    <header className="sticky top-0 z-30 w-full bg-white text-slate-800 border-b border-slate-200 shadow-xs">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/patient" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 font-bold text-sm">
            ✦
          </div>
          <div>
            <span className="text-base font-bold tracking-tight text-slate-900 block leading-tight">
              Kothamass
            </span>
            <span className="text-[10px] text-teal-700 font-semibold tracking-widest uppercase block">
              Dental Excellence
            </span>
          </div>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-slate-100 text-slate-900 font-semibold"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* User Info & Logout */}
        <div className="hidden md:flex items-center gap-4">
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Signed in as</span>
            <span className="text-sm font-medium text-slate-800 truncate max-w-[160px] block">
              {session?.user?.name || session?.user?.email}
            </span>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="h-9 px-3.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors"
          >
            Log out
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileNavOpen(!mobileNavOpen)}
          aria-label="Toggle navigation"
          className="md:hidden p-2 text-slate-600 hover:text-slate-900 focus:outline-none"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {mobileNavOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      {/* Mobile Drawer Navigation */}
      {mobileNavOpen && (
        <div className="md:hidden bg-white border-b border-slate-200 px-4 py-4 space-y-2">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileNavOpen(false)}
                className={`block px-4 py-2.5 rounded-lg text-sm font-medium ${
                  isActive
                    ? "bg-teal-600 text-white font-semibold"
                    : "text-slate-700 hover:bg-slate-100"
                }`}
              >
                {link.name}
              </Link>
            );
          })}
          <div className="pt-3 border-t border-slate-100 flex flex-col gap-2">
            <span className="text-xs text-slate-500">
              Logged in as {session?.user?.name || session?.user?.email}
            </span>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="w-full h-9 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-600 transition-colors flex items-center justify-center"
            >
              Log out
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default NavBar;