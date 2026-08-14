import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { broadcast } from "@/lib/eventBus";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !["doctor", "receptionist", "admin"].includes(session.user.role as string)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { visitId, action } = body as { visitId: string; action: "START" | "PAUSE" | "COMPLETE" };

    if (!visitId || !action) {
      return NextResponse.json({ error: "visitId and action are required" }, { status: 400 });
    }

    const visit = await prisma.visit.findUnique({ where: { visitId } });
    if (!visit) {
      return NextResponse.json({ error: "Visit not found" }, { status: 404 });
    }

    if (session.user.role === "doctor" && visit.doctorId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden: Not your visit" }, { status: 403 });
    }

    const currentStatus = visit.consultationStatus || "WAITING";

    let newStatus: string;
    if (action === "START") {
      if (currentStatus !== "WAITING") {
        return NextResponse.json({ error: "Visit is not in WAITING status" }, { status: 400 });
      }
      newStatus = "IN_CONSULTATION";
    } else if (action === "PAUSE") {
      if (currentStatus !== "IN_CONSULTATION") {
        return NextResponse.json({ error: "Visit is not in IN_CONSULTATION status" }, { status: 400 });
      }
      newStatus = "WAITING";
    } else {
      // COMPLETE
      if (currentStatus !== "IN_CONSULTATION") {
        return NextResponse.json({ error: "Visit is not in IN_CONSULTATION status" }, { status: 400 });
      }
      newStatus = "COMPLETED";
    }

    const updated = await prisma.visit.update({
      where: { visitId },
      data: { consultationStatus: newStatus },
    });

    broadcast({
      type: "QUEUE_UPDATE",
      doctorId: visit.doctorId,
    });

    return NextResponse.json({ visit: updated });
  } catch (error) {
    console.error("Error updating consultation status:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
