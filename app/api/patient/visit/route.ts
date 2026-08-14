import { prisma } from "@/lib/prisma";
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
    const { opId } = body;

    if (!opId) {
      return NextResponse.json({ error: "OP ID is required" }, { status: 400 });
    }

    // Fetch the OP to verify it belongs to patient and is approved
    const op = await prisma.op.findUnique({
      where: { opId },
      include: {
        requests: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        doctor: true,
      },
    });

    if (!op || op.patientId !== patientId) {
      return NextResponse.json({ error: "Invalid OP registration" }, { status: 400 });
    }

    if (op.doctor?.isQueuePaused) {
      return NextResponse.json(
        { error: `Dr. ${op.doctor.name} has temporarily paused taking new patients. Please try again later.` }, 
        { status: 400 }
      );
    }

    if (op.expiresAt < new Date()) {
      return NextResponse.json({ error: "OP registration has expired" }, { status: 400 });
    }

    const latestRequest = op.requests[0];
    if (!latestRequest || latestRequest.status !== "APPROVED") {
      return NextResponse.json({ error: "OP registration is not approved yet" }, { status: 400 });
    }

    const existingUnverified = await prisma.visit.findFirst({
      where: { opId: op.opId, isVerified: false },
    });
    if (existingUnverified) {
      return NextResponse.json(
        { error: "A pending check-in already exists for this OP registration", visit: existingUnverified },
        { status: 409 }
      );
    }

    // Create the visit record
    const newVisit = await prisma.visit.create({
      data: {
        visitDate: new Date(),
        isVerified: false, // will be verified via QR code scan later
        tokenNumber: 0,    // placeholder until verified
        doctorId: op.doctorId,
        patientId: op.patientId,
        familyMemberId: op.familyMemberId || null,
        opId: op.opId,
      },
    });

    return NextResponse.json(newVisit);
  } catch (error) {
    console.error("Error creating visit:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
