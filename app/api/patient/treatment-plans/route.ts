import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "patient") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patientId = session.user.id as string;

    const plans = await prisma.treatmentPlan.findMany({
      where: {
        visit: {
          patientId,
        },
      },
      include: {
        sessions: {
          orderBy: { sessionNumber: "asc" },
        },
        visit: {
          select: {
            visitId: true,
            visitDate: true,
            doctor: { select: { name: true } },
            familyMember: { select: { name: true, relation: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ plans });
  } catch (error) {
    console.error("Error fetching patient treatment plans:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
