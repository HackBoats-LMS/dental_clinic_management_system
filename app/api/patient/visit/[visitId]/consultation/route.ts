import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { broadcast } from "@/lib/eventBus";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ visitId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { visitId } = await params;
    const { problems, procedures } = await request.json();

    if (
      !Array.isArray(problems) ||
      !Array.isArray(procedures) ||
      !problems.every((p) => typeof p === "string") ||
      !procedures.every((p) => typeof p === "string")
    ) {
      return NextResponse.json(
        { error: "problems and procedures must be arrays of strings" },
        { status: 400 }
      );
    }

    const existingVisit = await prisma.visit.findUnique({ where: { visitId } });
    if (!existingVisit) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }
    if (existingVisit.doctorId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const updatedVisit = await prisma.visit.update({
      where: { visitId },
      data: {
        problems,
        procedures,
      },
    });

    // Broadcast queue update event to update the dashboard of other listening clients
    broadcast({
      type: "QUEUE_UPDATE",
      doctorId: updatedVisit.doctorId,
    });

    return NextResponse.json(updatedVisit);
  } catch (error) {
    console.error("Error updating visit consultation:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
