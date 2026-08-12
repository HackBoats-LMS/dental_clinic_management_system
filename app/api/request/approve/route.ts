import { prisma } from "@/lib/prisma";
import { broadcast } from "@/lib/eventBus";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "receptionist") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rawId = session.user.id;
    const validatedReceptionistId = (rawId && UUID_REGEX.test(rawId)) ? rawId : null;

    const result = await prisma.request.update({
      where: { id: body.requestId },
      data: {
        status: "APPROVED",
        approvedById: validatedReceptionistId,
        approvedAt: new Date(),
      },
    });

    if (result) {
      broadcast({ type: "approved", id: result.id });
    }

    return NextResponse.json(
      { message: "Request approved successfully", data: result },
      { status: 200 }
    );
  } catch (error) {
    console.log("error ", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}