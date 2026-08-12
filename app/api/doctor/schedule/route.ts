import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// GET /api/doctor/schedule — fetch the doctor's own weekly schedule
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const doctorId = session.user.id as string;
    const schedules = await prisma.doctorSchedule.findMany({
      where: { doctorId },
      orderBy: { dayOfWeek: "asc" },
    });

    return NextResponse.json({ schedules });
  } catch (error) {
    console.error("Error fetching doctor schedule:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST /api/doctor/schedule — set availability for a day
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || session.user.role !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const doctorId = session.user.id as string;
    const body = await req.json();
    const { dayOfWeek, startTime, endTime, isAvailable } = body as {
      dayOfWeek: number;
      startTime: string;
      endTime: string;
      isAvailable: boolean;
    };

    if (dayOfWeek === undefined || !startTime || !endTime) {
      return NextResponse.json(
        { error: "dayOfWeek, startTime, and endTime are required" },
        { status: 400 }
      );
    }

    const schedule = await prisma.doctorSchedule.upsert({
      where: {
        doctorId_dayOfWeek: { doctorId, dayOfWeek },
      },
      update: { startTime, endTime, isAvailable },
      create: { doctorId, dayOfWeek, startTime, endTime, isAvailable },
    });

    return NextResponse.json(schedule, { status: 201 });
  } catch (error) {
    console.error("Error updating doctor schedule:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
