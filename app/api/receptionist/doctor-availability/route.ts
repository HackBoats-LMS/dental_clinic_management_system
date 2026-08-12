import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

// GET /api/receptionist/doctor-availability?doctorId=...&startDate=...&endDate=...
// Returns available dates for a doctor within the date range
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== "receptionist" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const doctorId = searchParams.get("doctorId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    if (!doctorId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "doctorId, startDate, and endDate are required" },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Get the doctor's weekly schedule
    const schedules = await prisma.doctorSchedule.findMany({
      where: { doctorId, isAvailable: true },
    });

    const availableDays = new Set(schedules.map((s) => s.dayOfWeek));

    // Generate available dates within the range
    const availableDates: Array<{ date: string; dayOfWeek: number; startTime: string; endTime: string }> = [];
    const current = new Date(start);

    while (current <= end) {
      const dayOfWeek = current.getDay();
      if (availableDays.has(dayOfWeek)) {
        const schedule = schedules.find((s) => s.dayOfWeek === dayOfWeek);
        if (schedule) {
          // Check if doctor is already booked for this date
          const dateStr = current.toISOString().split("T")[0];
          const existingVisit = await prisma.visit.findFirst({
            where: {
              doctorId,
              isVerified: true,
              visitDate: {
                gte: new Date(dateStr),
                lt: new Date(new Date(dateStr).getTime() + 24 * 60 * 60 * 1000),
              },
            },
          });

          // Also check existing treatment sessions
          const existingSession = await prisma.treatmentSession.findFirst({
            where: {
              treatmentPlan: {
                visit: { doctorId },
              },
              scheduledDate: {
                gte: new Date(dateStr),
                lt: new Date(new Date(dateStr).getTime() + 24 * 60 * 60 * 1000),
              },
              status: { not: "CANCELLED" },
            },
          });

          if (!existingVisit && !existingSession) {
            availableDates.push({
              date: dateStr,
              dayOfWeek,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
            });
          }
        }
      }
      current.setDate(current.getDate() + 1);
    }

    return NextResponse.json({ availableDates });
  } catch (error) {
    console.error("Error fetching doctor availability:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
