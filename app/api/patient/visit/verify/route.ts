import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { broadcast } from "@/lib/eventBus";
import { getDailyCode } from "@/lib/dailyCode";
import { Prisma } from "@/app/generated/prisma/client";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "patient") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patientId = session.user.id as string;
    const { searchParams } = new URL(req.url);
    const visitId = searchParams.get("visitId");

    if (!visitId) {
      return NextResponse.json({ error: "Visit ID is required" }, { status: 400 });
    }

    const visit = await prisma.visit.findUnique({
      where: { visitId },
      include: {
        doctor: true,
        op: true,
      },
    });

    if (!visit || visit.patientId !== patientId) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    return NextResponse.json(visit);
  } catch (error) {
    console.error("Error fetching visit:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "patient") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const patientId = session.user.id as string;
    const body = await req.json();
    const { visitId, code } = body;

    if (!visitId || !code) {
      return NextResponse.json({ error: "Visit ID and Code are required" }, { status: 400 });
    }

    // Verify code (case insensitive and trim spacing)
    const todayCode = getDailyCode();
    if (code.trim().toUpperCase() !== todayCode) {
      return NextResponse.json({ error: "Invalid verification code" }, { status: 400 });
    }

    // Find the visit
    const visit = await prisma.visit.findUnique({
      where: { visitId },
    });

    if (!visit || visit.patientId !== patientId) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    if (visit.isVerified) {
      return NextResponse.json({ error: "Visit is already verified", visit }, { status: 400 });
    }

    // Atomically assign the next token number for this doctor's queue today
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    try {
      const result = await prisma.$transaction(
        async (tx) => {
          const existing = await tx.visit.findUnique({ where: { visitId } });
          if (!existing || existing.patientId !== patientId) {
            return null;
          }
          if (existing.isVerified) {
            return { alreadyVerified: true, visit: existing };
          }

          const visitCount = await tx.visit.count({
            where: {
              doctorId: existing.doctorId,
              isVerified: true,
              visitDate: {
                gte: today,
              },
            },
          });

          const updated = await tx.visit.update({
            where: { visitId },
            data: {
              isVerified: true,
              visitDate: new Date(),
              tokenNumber: visitCount + 1,
            },
          });

          return { alreadyVerified: false, visit: updated };
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );

      if (!result) {
        return NextResponse.json({ error: "Visit not found" }, { status: 404 });
      }
      if (result.alreadyVerified) {
        return NextResponse.json(
          { error: "Visit is already verified", visit: result.visit },
          { status: 400 }
        );
      }

      // Broadcast queue update event
      broadcast({
        type: "QUEUE_UPDATE",
        doctorId: result.visit.doctorId,
      });

      return NextResponse.json({
        message: "Visit verified successfully",
        visit: result.visit,
      });
    } catch (txError) {
      console.error("Error verifying visit:", txError);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
  } catch (error) {
    console.error("Error verifying visit:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
