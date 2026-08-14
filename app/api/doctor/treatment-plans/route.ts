import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const doctorId = session.user.id as string;
    const { searchParams } = new URL(req.url);
    const filterStatus = searchParams.get("status"); // "active" or "completed"

    let statusFilter = {};
    if (filterStatus === "completed") {
      statusFilter = { status: "COMPLETED" };
    } else {
      statusFilter = { status: { in: ["PENDING", "ACTIVE"] } };
    }

    const plans = await prisma.treatmentPlan.findMany({
      where: {
        visit: { doctorId },
        ...statusFilter,
      },
      include: {
        sessions: {
          orderBy: { sessionNumber: "asc" },
        },
        visit: {
          include: {
            patient: { select: { patientId: true, name: true, phoneNumber: true } },
            familyMember: { select: { fId: true, name: true, phoneNumber: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ plans });
  } catch (error) {
    console.error("Error fetching doctor treatment plans:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
