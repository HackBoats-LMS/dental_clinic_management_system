import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { broadcast } from "@/lib/eventBus";
import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const role = session.user.role;
    const callerId = session.user.id;

    const body = await req.json();
    const { doctorId, action } = body;

    if (!doctorId || !action) {
      return NextResponse.json({ error: "Doctor ID and Action are required" }, { status: 400 });
    }

    const isAdmin = role === "admin";
    const isOwnDoctor = role === "doctor" && callerId === doctorId;

    if (!isAdmin && !isOwnDoctor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (action === "NEXT") {
      // Find current IN_CONSULTATION visit and complete it
      const currentVisit = await prisma.visit.findFirst({
        where: {
          doctorId,
          isVerified: true,
          visitDate: { gte: today },
          consultationStatus: "IN_CONSULTATION",
        },
      });

      if (currentVisit) {
        await prisma.visit.update({
          where: { visitId: currentVisit.visitId },
          data: { consultationStatus: "COMPLETED" },
        });
      }

      // Find next WAITING visit and start it
      const nextVisit = await prisma.visit.findFirst({
        where: {
          doctorId,
          isVerified: true,
          visitDate: { gte: today },
          consultationStatus: "WAITING",
        },
        orderBy: { tokenNumber: "asc" },
      });

      if (nextVisit) {
        await prisma.visit.update({
          where: { visitId: nextVisit.visitId },
          data: { consultationStatus: "IN_CONSULTATION" },
        });
      }
    } else if (action === "RESET") {
      // Reset all visits for this doctor today back to WAITING
      await prisma.visit.updateMany({
        where: {
          doctorId,
          isVerified: true,
          visitDate: { gte: today },
        },
        data: { consultationStatus: "WAITING" },
      });
    }

    broadcast({
      type: "QUEUE_UPDATE",
      doctorId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating board:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
