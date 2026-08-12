import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";


interface ExtendedSession {
  user?: {
    id: string;
    role?: string;
    name?: string;
    email?: string;
    phoneNumber?: string;
    profileComplete?: boolean;
  };
}

export async function POST(request: NextRequest) {
  try {
    const session = (await getServerSession(authOptions)) as ExtendedSession | null;
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "patient") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { name, phoneNumber, age, gender, emergencyContact } = await request.json();

    if (!name || !phoneNumber) {
      return NextResponse.json({ error: "Name and phone number are required" }, { status: 400 });
    }

    const parsedAge = age ? parseInt(age, 10) : null;
    if (parsedAge !== null && (Number.isNaN(parsedAge) || parsedAge < 0)) {
      return NextResponse.json({ error: "Invalid age" }, { status: 400 });
    }

    const result = await prisma.patient.update({
      where: {
        patientId: session.user.id
      },
      data: {
        name,
        phoneNumber,
        age: parsedAge,
        gender: gender || null,
        emergencyContact: emergencyContact || null,
        profileComplete: true
      }
    });

    if (!result) {
      return NextResponse.json({ error: "Profile update failed" }, { status: 400 });
    }
    return NextResponse.json({ result }, { status: 200 });
  } catch (error) {
    console.error("Error completing profile:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}