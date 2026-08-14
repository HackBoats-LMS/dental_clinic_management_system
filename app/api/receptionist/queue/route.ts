import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || (session.user.role !== "receptionist" && session.user.role !== "admin")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [doctors, visits] = await Promise.all([
      prisma.doctor.findMany({
        orderBy: { name: "asc" },
        select: { doctorId: true, name: true, currentToken: true, isPresent: true },
      }),
      prisma.visit.findMany({
        where: {
          isVerified: true,
          visitDate: { gte: today },
          consultationStatus: { in: ["WAITING", "IN_CONSULTATION"] } // optionally filter out completed if needed, but keeping it same as view would be just all of today
        },
        include: {
          patient: { select: { name: true, phoneNumber: true } },
          familyMember: { select: { name: true, phoneNumber: true } }
        },
        orderBy: { tokenNumber: "asc" },
      })
    ]);

    const doctorsWithQueue = doctors.map((doc) => {
      const docVisits = visits.filter((v) => v.doctorId === doc.doctorId);
      const currentVisit = docVisits.find((v) => v.consultationStatus === "IN_CONSULTATION");
      const waitingVisits = docVisits.filter((v) => v.consultationStatus === "WAITING");
      
      const effectiveCurrent = currentVisit || (waitingVisits.length > 0 ? waitingVisits[0] : null);

      return {
        doctorId: doc.doctorId,
        name: doc.name,
        isPresent: doc.isPresent,
        currentToken: effectiveCurrent ? effectiveCurrent.tokenNumber : 0,
        queue: docVisits.map((v) => ({
          visitId: v.visitId,
          tokenNumber: v.tokenNumber,
          patientName: v.familyMember?.name || v.patient.name,
          phoneNumber: v.familyMember?.phoneNumber || v.patient.phoneNumber,
          visitDate: v.visitDate.toISOString(),
        })),
    }});

    return NextResponse.json(
      { doctors: doctorsWithQueue },
      { 
        headers: {
          "Cache-Control": "s-maxage=2, stale-while-revalidate=59"
        }
      }
    );
  } catch (error) {
    console.error("Error fetching receptionist queue:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
