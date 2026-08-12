import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import WalkInForm from "./walk-in-form";

export default async function WalkInPage() {
  const session = await getServerSession(authOptions);

  if (!session || (session.user.role !== "receptionist" && session.user.role !== "admin")) {
    redirect("/api/auth/signin");
  }

  const doctors = await prisma.doctor.findMany({
    orderBy: { name: "asc" },
    select: { doctorId: true, name: true },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayOps = await prisma.op.findMany({
    where: { createdAt: { gte: today } },
    include: {
      patient: { select: { name: true, phoneNumber: true } },
      doctor: { select: { name: true } },
      visits: { orderBy: { visitDate: "desc" }, take: 1, select: { tokenNumber: true } },
      requests: { orderBy: { createdAt: "desc" }, take: 1, select: { status: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return <WalkInForm doctors={doctors} todayOps={todayOps} />;
}
