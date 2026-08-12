import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/eventBus";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "patient") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patientId = session.user.id as string;
    const body = await req.json();
    const { doctorId, familyMemberId } = body;

    if (!doctorId) {
      return NextResponse.json({ error: "Doctor ID is required" }, { status: 400 });
    }

    const doctor = await prisma.doctor.findUnique({ where: { doctorId } });
    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 400 });
    }

    if (familyMemberId) {
      const familyMember = await prisma.familyMembers.findUnique({
        where: { fId: familyMemberId },
      });
      if (!familyMember || familyMember.patientId !== patientId) {
        return NextResponse.json({ error: "Invalid family member" }, { status: 400 });
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create OP
      const newOp = await tx.op.create({
        data: {
          patientId,
          doctorId,
          familyMemberId: familyMemberId || null,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        },
      });

      // 2. Create Request linked to the newly created OP
      const newRequest = await tx.request.create({
        data: {
          patientId,
          opId: newOp.opId,
          familyMemberId: familyMemberId || null,
        },
        include: {
          patient: true,
          familyMember: true,
          op: {
            include: {
              doctor: true,
            },
          },
        },
      });

      return { newOp, newRequest };
    });

    // Broadcast the new request to all connected receptionists
    broadcast({ type: "new-request", data: result.newRequest });

    return NextResponse.json(
      { message: "OP Registration requested successfully", data: result },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error creating OP and request:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "patient") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patientId = session.user.id as string;

    const ops = await prisma.op.findMany({
      where: { patientId },
      include: {
        doctor: true,
        familyMember: true,
        requests: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        visits: {
          orderBy: { visitDate: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(ops);
  } catch (error) {
    console.error("Error fetching patient OPs:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
