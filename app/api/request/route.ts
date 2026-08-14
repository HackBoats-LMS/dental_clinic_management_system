import { broadcast } from "@/lib/eventBus";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";


export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "patient") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // patientID,opId,familyMemberId
    const body = await request.json();
    const { patientId, opId, familyMemberId } = body;

    if (!patientId || !opId) {
      return NextResponse.json({ error: "patientId and opId are required" }, { status: 400 });
    }
    if (patientId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const [op, member] = await Promise.all([
      prisma.op.findUnique({ where: { opId }, select: { patientId: true } }),
      familyMemberId ? prisma.familyMembers.findUnique({ where: { fId: familyMemberId }, select: { patientId: true } }) : Promise.resolve(null)
    ]);

    if (!op || op.patientId !== patientId) {
      return NextResponse.json({ error: "Invalid OP registration" }, { status: 400 });
    }

    if (familyMemberId && (!member || member.patientId !== patientId)) {
      return NextResponse.json({ error: "Invalid family member" }, { status: 400 });
    }

    const newRequest = await prisma.request.create({
      data: {
        patientId,
        opId,
        familyMemberId: familyMemberId || null
      },
      include: {
        patient: true,
        familyMember: true
      }
    });

    broadcast({ type: "new-request", data: newRequest });

    return NextResponse.json({ message: "Request created successfully", data: newRequest }, { status: 200 });
  } catch (error) {
    console.log("error", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}