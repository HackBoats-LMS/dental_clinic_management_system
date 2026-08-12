import { prisma } from "@/lib/prisma";
import { getDailyCode } from "@/lib/dailyCode";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const doctors = await prisma.doctor.findMany({
      orderBy: { name: "asc" },
    });

    const boardData = await Promise.all(
      doctors.map(async (doc) => {
        const verifiedVisits = await prisma.visit.findMany({
          where: {
            doctorId: doc.doctorId,
            isVerified: true,
            visitDate: { gte: today },
          },
          orderBy: { tokenNumber: "asc" },
        });

        const statusOf = (v: { consultationStatus?: string | null }) =>
          v.consultationStatus || "WAITING";

        const currentVisit = verifiedVisits.find((v) => statusOf(v) === "IN_CONSULTATION");
        const waitingVisits = verifiedVisits.filter((v) => statusOf(v) === "WAITING");
        const completedCount = verifiedVisits.filter((v) => statusOf(v) === "COMPLETED").length;

        return {
          doctorId: doc.doctorId,
          name: doc.name,
          isPresent: doc.isPresent,
          currentToken: currentVisit ? currentVisit.tokenNumber : 0,
          nextToken: waitingVisits.length > 0 ? waitingVisits[0].tokenNumber : null,
          totalVerified: verifiedVisits.length,
          completedCount,
          waitingCount: waitingVisits.length,
        };
      })
    );

    return NextResponse.json({
      dailyCode: getDailyCode(),
      doctors: boardData,
    });
  } catch (error) {
    console.error("Error fetching board data:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
