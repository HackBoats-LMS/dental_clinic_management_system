import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const doctorId = session.user.id as string;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const doctor = await prisma.doctor.findUnique({
      where: { doctorId },
    });

    if (!doctor) {
      return NextResponse.json({ error: "Doctor not found" }, { status: 404 });
    }

    const visits = await prisma.visit.findMany({
      where: {
        doctorId,
        isVerified: true,
        visitDate: {
          gte: today,
        },
      },
      include: {
        patient: {
          select: {
            patientId: true,
            name: true,
            age: true,
            gender: true,
            phoneNumber: true,
            email: true,
            emergencyContact: true,
            previousDentalHistory: true,
            medicalConditions: true,
          },
        },
        familyMember: {
          select: {
            fId: true,
            name: true,
            age: true,
            gender: true,
            phoneNumber: true,
            email: true,
            previousDentalHistory: true,
            medicalConditions: true,
            relation: true,
          },
        },
      },
      orderBy: { tokenNumber: "asc" },
    });

    const nextVisit = visits.find((v) => v.tokenNumber > doctor.currentToken);

    return NextResponse.json({
      doctor,
      visits,
      nextToken: nextVisit ? nextVisit.tokenNumber : null,
    });
  } catch (error) {
    console.error("Error fetching doctor dashboard data:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const doctorId = session.user.id as string;
    const body = await req.json();
    const { isPresent } = body;

    if (isPresent === undefined) {
      return NextResponse.json({ error: "isPresent value is required" }, { status: 400 });
    }

    const updatedDoctor = await prisma.doctor.update({
      where: { doctorId },
      data: { isPresent },
    });

    return NextResponse.json(updatedDoctor);
  } catch (error) {
    console.error("Error updating doctor presence:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
