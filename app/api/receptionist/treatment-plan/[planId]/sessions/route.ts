import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// POST /api/receptionist/treatment-plan/[planId]/sessions — add a session
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== "receptionist" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId } = await params;
    const body = await req.json();
    const { scheduledDate } = body as { scheduledDate: string };

    if (!scheduledDate) {
      return NextResponse.json({ error: "scheduledDate is required" }, { status: 400 });
    }

    const plan = await prisma.treatmentPlan.findUnique({
      where: { id: planId },
      include: { sessions: true },
    });

    if (!plan) {
      return NextResponse.json({ error: "Treatment plan not found" }, { status: 404 });
    }

    // Determine next session number
    const nextSessionNumber = plan.sessions.length + 1;

    if (nextSessionNumber > plan.totalSessions) {
      return NextResponse.json(
        { error: "All sessions are already scheduled" },
        { status: 400 }
      );
    }

    const treatmentSession = await prisma.treatmentSession.create({
      data: {
        treatmentPlanId: planId,
        sessionNumber: nextSessionNumber,
        scheduledDate: new Date(scheduledDate),
        status: "SCHEDULED",
      },
    });

    // If this is the first session and plan is PENDING, activate it
    if (nextSessionNumber === 1 && plan.status === "PENDING") {
      await prisma.treatmentPlan.update({
        where: { id: planId },
        data: { status: "ACTIVE" },
      });
    }

    return NextResponse.json({ session: treatmentSession }, { status: 201 });
  } catch (error) {
    console.error("Error adding treatment session:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PATCH /api/receptionist/treatment-plan/[planId]/sessions — update a session status
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== "receptionist" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId } = await params;
    const body = await req.json();
    const { sessionId, status, scheduledDate } = body as {
      sessionId: string;
      status?: string;
      scheduledDate?: string;
    };

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const existingSession = await prisma.treatmentSession.findUnique({
      where: { id: sessionId },
    });

    if (!existingSession || existingSession.treatmentPlanId !== planId) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (status !== undefined) data.status = status;
    if (scheduledDate !== undefined) data.scheduledDate = new Date(scheduledDate);

    const treatmentSession = await prisma.treatmentSession.update({
      where: { id: sessionId },
      data,
    });

    return NextResponse.json({ session: treatmentSession });
  } catch (error) {
    console.error("Error updating treatment session:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
