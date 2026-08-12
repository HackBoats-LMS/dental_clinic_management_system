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

    const doctors = await prisma.doctor.findMany({
      orderBy: { name: "asc" },
      select: { doctorId: true, name: true, currentToken: true, isPresent: true },
    });

    const visits = await prisma.visit.findMany({
      where: { isVerified: true, visitDate: { gte: today } },
      include: {
        patient: { select: { name: true, phoneNumber: true } },
        familyMember: { select: { name: true } },
      },
      orderBy: { tokenNumber: "asc" },
    });

    const doctorsWithQueue = doctors.map((doc) => ({
      doctorId: doc.doctorId,
      name: doc.name,
      isPresent: doc.isPresent,
      currentToken: doc.currentToken,
      queue: visits
        .filter((v) => v.doctorId === doc.doctorId)
        .map((v) => ({
          visitId: v.visitId,
          tokenNumber: v.tokenNumber,
          patientName: v.familyMember?.name || v.patient.name,
          phoneNumber: v.patient.phoneNumber,
          visitDate: v.visitDate.toISOString(),
        })),
    }));

    return NextResponse.json({ doctors: doctorsWithQueue });
  } catch (error) {
    console.error("Error fetching receptionist queue:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
