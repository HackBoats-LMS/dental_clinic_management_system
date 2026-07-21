"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export default function SidebarLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // If not logged in, just return children without sidebar (e.g. for login page)
  if (status === "unauthenticated" || !session) {
    return <div className="min-h-screen bg-[var(--background)] flex flex-col">{children}</div>;
  }

  const role = (session.user as any)?.role;

  const navLinks = [
    { name: "Admin Dashboard", href: "/admin", show: role === "admin" },
    { name: "Receptionist Dashboard", href: "/receptionist", show: role === "receptionist" || role === "admin" },
  ];

  return (
    <div className="flex h-screen bg-[var(--background)] overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/50 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-30 w-64 bg-[var(--sidebar-bg)] border-r border-[var(--border)] transform transition-transform duration-300 md:relative md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex flex-col h-full">
          <div className="h-16 flex items-center px-6 border-b border-[var(--border)]">
            <span className="text-lg font-semibold tracking-tight text-[var(--foreground)]">Dental Clinic</span>
          </div>
          
          <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
            {navLinks.filter(link => link.show).map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    isActive 
                      ? "bg-[var(--primary)] text-[var(--primary-foreground)]" 
                      : "text-[var(--sidebar-fg)] hover:bg-[var(--accent)] hover:text-[var(--foreground)]"
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-[var(--border)]">
            <div className="flex items-center gap-3 mb-4 px-2">
              <div className="w-8 h-8 rounded-full bg-[var(--accent)] flex items-center justify-center text-[var(--primary)] font-bold uppercase">
                {session.user?.email?.[0] || 'U'}
              </div>
              <div className="overflow-hidden">
                <p className="text-sm font-medium text-[var(--foreground)] truncate">{session.user?.name || session.user?.email}</p>
                <p className="text-xs text-[var(--muted-foreground)] capitalize">{role}</p>
              </div>
            </div>
            <button 
              onClick={() => signOut({ callbackUrl: '/api/auth/signin' })}
              className="w-full btn btn-outline justify-center text-sm"
            >
              Log out
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header (Mobile Only for Hamburger) */}
        <header className="h-16 flex items-center justify-between px-4 border-b border-[var(--border)] bg-[var(--background)] md:hidden">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 -ml-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="text-lg font-semibold tracking-tight text-[var(--foreground)]">Dental Clinic</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-[var(--background)]">
          {children}
        </main>
      </div>
    </div>
  );
}
