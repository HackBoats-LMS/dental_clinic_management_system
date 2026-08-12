import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// GET /api/receptionist/treatment-plan?visitId=... — fetch plan for a visit
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== "receptionist" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const visitId = searchParams.get("visitId");

    if (!visitId) {
      return NextResponse.json({ error: "visitId is required" }, { status: 400 });
    }

    const plan = await prisma.treatmentPlan.findUnique({
      where: { visitId },
      include: {
        sessions: { orderBy: { sessionNumber: "asc" } },
        visit: {
          include: {
            patient: { select: { name: true, phoneNumber: true } },
            doctor: { select: { name: true } },
            familyMember: { select: { name: true, relation: true } },
          },
        },
      },
    });

    return NextResponse.json({ plan: plan || null });
  } catch (error) {
    console.error("Error fetching treatment plan:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/receptionist/treatment-plan — create a new plan for a visit
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== "receptionist" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { visitId, selectedProcedure, totalSessions, firstSessionDate } = body as {
      visitId: string;
      selectedProcedure: string;
      totalSessions: number;
      firstSessionDate?: string;
    };

    if (!visitId || !selectedProcedure || !totalSessions) {
      return NextResponse.json(
        { error: "visitId, selectedProcedure, and totalSessions are required" },
        { status: 400 }
      );
    }

    const visit = await prisma.visit.findUnique({ where: { visitId } });
    if (!visit) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    // Check if plan already exists
    const existing = await prisma.treatmentPlan.findUnique({ where: { visitId } });
    if (existing) {
      return NextResponse.json({ error: "A treatment plan already exists for this visit" }, { status: 409 });
    }

    const plan = await prisma.treatmentPlan.create({
      data: {
        visitId,
        selectedProcedure,
        totalSessions,
        status: "PENDING",
      },
    });

    // If first session date provided, create the first session
    if (firstSessionDate) {
      await prisma.treatmentSession.create({
        data: {
          treatmentPlanId: plan.id,
          sessionNumber: 1,
          scheduledDate: new Date(firstSessionDate),
          status: "SCHEDULED",
        },
      });

      // Update plan status to ACTIVE since we have a scheduled session
      await prisma.treatmentPlan.update({
        where: { id: plan.id },
        data: { status: "ACTIVE" },
      });
    }

    const result = await prisma.treatmentPlan.findUnique({
      where: { id: plan.id },
      include: {
        sessions: { orderBy: { sessionNumber: "asc" } },
        visit: {
          include: {
            patient: { select: { name: true, phoneNumber: true } },
            doctor: { select: { name: true } },
            familyMember: { select: { name: true, relation: true } },
          },
        },
      },
    });

    return NextResponse.json({ plan: result }, { status: 201 });
  } catch (error) {
    console.error("Error creating treatment plan:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// PATCH /api/receptionist/treatment-plan — update a plan
export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== "receptionist" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { planId, totalSessions, status } = body as {
      planId: string;
      totalSessions?: number;
      status?: string;
    };

    if (!planId) {
      return NextResponse.json({ error: "planId is required" }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    if (totalSessions !== undefined) data.totalSessions = totalSessions;
    if (status !== undefined) data.status = status;

    const plan = await prisma.treatmentPlan.update({
      where: { id: planId },
      data,
      include: {
        sessions: { orderBy: { sessionNumber: "asc" } },
        visit: {
          include: {
            patient: { select: { name: true, phoneNumber: true } },
            doctor: { select: { name: true } },
            familyMember: { select: { name: true, relation: true } },
          },
        },
      },
    });

    return NextResponse.json({ plan });
  } catch (error) {
    console.error("Error updating treatment plan:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
