import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["doctor", "receptionist", "admin"].includes(session.user.role as string)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let doctorId = session.user.id as string;
    if (session.user.role !== "doctor") {
      const url = new URL(req.url);
      const requestedDoctorId = url.searchParams.get("doctorId");
      if (!requestedDoctorId) {
        return NextResponse.json({ error: "doctorId is required for non-doctors" }, { status: 400 });
      }
      doctorId = requestedDoctorId;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const doctor = await prisma.doctor.findUnique({
      where: { doctorId },
    });

    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    const visits = await prisma.visit.findMany({
      where: {
        doctorId,
        isVerified: true,
        visitDate: {
          gte: today,
        },
      },
      include: {
        patient: {
          select: {
            patientId: true,
            name: true,
            age: true,
            gender: true,
            phoneNumber: true,
            email: true,
            emergencyContact: true,
            previousDentalHistory: true,
            medicalConditions: true,
            visits: {
              where: { treatmentPlan: { status: { in: ["PENDING", "ACTIVE"] } } },
              include: {
                treatmentPlan: {
                  include: { sessions: true }
                }
              }
            }
          },
        },
        familyMember: {
          select: {
            fId: true,
            name: true,
            age: true,
            gender: true,
            phoneNumber: true,
            email: true,
            previousDentalHistory: true,
            medicalConditions: true,
            relation: true,
            visits: {
              where: { treatmentPlan: { status: { in: ["PENDING", "ACTIVE"] } } },
              include: {
                treatmentPlan: {
                  include: { sessions: true }
                }
              }
            }
          },
        },
      },
      orderBy: { tokenNumber: "asc" },
    });

    const currentVisit = visits.find((v) => v.consultationStatus === "IN_CONSULTATION");
    const waitingVisits = visits.filter((v) => v.consultationStatus === "WAITING");

    const effectiveCurrent = currentVisit || (waitingVisits.length > 0 ? waitingVisits[0] : null);
    const dynamicCurrentToken = effectiveCurrent ? effectiveCurrent.tokenNumber : 0;

    const effectiveNext = currentVisit
      ? (waitingVisits.length > 0 ? waitingVisits[0].tokenNumber : null)
      : (waitingVisits.length > 1 ? waitingVisits[1].tokenNumber : null);

    // Override the stale DB value with today's dynamically calculated token
    doctor.currentToken = dynamicCurrentToken;

    return NextResponse.json({
      doctor,
      visits,
      nextToken: effectiveNext,
    });
  } catch (error) {
    console.error("Error fetching doctor dashboard data:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["doctor", "receptionist", "admin"].includes(session.user.role as string)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    let doctorId = session.user.id as string;
    
    if (session.user.role !== "doctor") {
      if (!body.doctorId) {
        return NextResponse.json({ error: "doctorId is required for non-doctors" }, { status: 400 });
      }
      doctorId = body.doctorId;
    }

    const { isPresent, isQueuePaused } = body;

    if (isPresent === undefined && isQueuePaused === undefined) {
      return NextResponse.json({ error: "isPresent or isQueuePaused value is required" }, { status: 400 });
    }

    const data: Record<string, boolean> = {};
    if (isPresent !== undefined) data.isPresent = isPresent;
    if (isQueuePaused !== undefined) data.isQueuePaused = isQueuePaused;

    const updatedDoctor = await prisma.doctor.update({
      where: { doctorId },
      data,
    });

    // Broadcast queue update so the board reflects pause/resume
    const { broadcast } = await import("@/lib/eventBus");
    broadcast({ type: "QUEUE_UPDATE", doctorId });

    return NextResponse.json(updatedDoctor);
  } catch (error) {
    console.error("Error updating doctor status:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
