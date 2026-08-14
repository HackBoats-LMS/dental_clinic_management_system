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

    const activePlans = await prisma.treatmentPlan.findMany({
      where: {
        status: { in: ["PENDING", "ACTIVE"] },
      },
      include: {
        sessions: {
          orderBy: { sessionNumber: "asc" },
        },
        visit: {
          include: {
            patient: { select: { patientId: true, name: true, phoneNumber: true } },
            familyMember: { select: { fId: true, name: true } },
            doctor: { select: { name: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ plans: activePlans });
  } catch (error) {
    console.error("Error fetching active plans:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
