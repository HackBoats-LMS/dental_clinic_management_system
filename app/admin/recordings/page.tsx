import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import RecordingsTable from "../RecordingsTable";

export default async function RecordingsPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user as any).role !== "admin") {
    redirect("/api/auth/signin");
  }

  const recordings = await prisma.recordings.findMany({
    orderBy: { date: 'desc' }
  });

  const serializedRecordings = recordings.map(r => ({
    ...r,
    duration: r.duration ? Math.round(Number(r.duration)) : null
  }));

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[var(--foreground)]">Recordings & Transcripts</h1>
        <p className="text-[var(--muted-foreground)] mt-1 md:mt-2 text-sm md:text-base">View audio and full transcripts of clinic recordings.</p>
      </header>

      <main>
        <RecordingsTable recordings={serializedRecordings} isDevelopment={process.env.NODE_ENV === 'development'} viewMode="recordings" />
      </main>
    </div>
  );
}