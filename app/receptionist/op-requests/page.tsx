import { prisma } from "@/lib/prisma";
import ReceptionistDashboard from "./dashboard-client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function OpRequestsPage() {
  const session = await getServerSession(authOptions);

  if (!session || session.user.role !== "receptionist") {
    redirect("/api/auth/signin");
  }

  const pending = await prisma.request.findMany({
    where: { status: "PENDING" },
    include: {
      patient: true,
      familyMember: true,
      op: {
        include: {
          doctor: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return <ReceptionistDashboard initialRequests={pending} receptionistId={session.user.id || ""} />;
}
