import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "receptionist") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const completedVisits = await prisma.visit.findMany({
      where: {
        consultationStatus: "COMPLETED",
        visitDate: { gte: today },
      },
      include: {
        patient: { select: { patientId: true, name: true, phoneNumber: true } },
        familyMember: { select: { fId: true, name: true } },
        doctor: { select: { name: true } },
        treatmentPlan: true,
      },
      orderBy: { visitDate: "desc" },
    });

    return NextResponse.json({ visits: completedVisits });
  } catch (error) {
    console.error("Error fetching completed visits:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
