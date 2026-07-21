import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import UserManagement from "./UserManagement";
import RecordingsTable from "./RecordingsTable";

export default async function AdminDashboard({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).role !== "admin") {
    redirect("/api/auth/signin");
  }
  
  const resolvedParams = await searchParams;
  const tab = resolvedParams?.tab || "recordings";

  const recordings = await prisma.recordings.findMany({
    orderBy: { date: 'desc' }
  });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
      <header className="mb-6 flex flex-col md:flex-row md:justify-between md:items-end gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[var(--foreground)]">Admin Center</h1>
          <p className="text-[var(--muted-foreground)] mt-1 md:mt-2 text-sm md:text-base">Manage clinic data and system settings.</p>
        </div>
      </header>

      <div className="flex gap-4 border-b border-[var(--border)] mb-8">
        <Link href="?tab=recordings" className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${tab === 'recordings' ? 'border-[var(--primary)] text-[var(--foreground)]' : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}>
          Recordings
        </Link>
        <Link href="?tab=users" className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${tab === 'users' ? 'border-[var(--primary)] text-[var(--foreground)]' : 'border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]'}`}>
          User Management
        </Link>
      </div>

      <main>
        {tab === "recordings" ? (
          <RecordingsTable recordings={recordings} isDevelopment={process.env.NODE_ENV === 'development'} />
        ) : (
          <UserManagement />
        )}
      </main>
    </div>
  );
}
