import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import UserManagement from "../UserManagement";

export default async function ControlPanelPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "admin") {
    redirect("/api/auth/signin");
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto w-full">
      <header className="mb-8">
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-[var(--foreground)]">Control Panel</h1>
        <p className="text-[var(--muted-foreground)] mt-1 md:mt-2 text-sm md:text-base">Manage receptionists and system admins.</p>
      </header>

      <main>
        <UserManagement />
      </main>
    </div>
  );
}
