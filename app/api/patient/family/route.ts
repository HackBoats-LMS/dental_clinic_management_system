import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

async function getPatientId(session: { user?: { id?: string; email?: string | null } }): Promise<string | null> {
  if (session.user?.id) return session.user.id;
  if (session.user?.email) {
    const patient = await prisma.patient.findUnique({ where: { email: session.user.email } });
    return patient?.patientId ?? null;
  }
  return null;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "patient") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const patientId = await getPatientId(session);
    if (!patientId) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const patient = await prisma.patient.findUnique({
      where: { patientId },
      include: { familyMembers: true }
    });

    if (!patient) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    return NextResponse.json(patient.familyMembers);
  } catch (error) {
    console.error("Failed to fetch family members", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "patient") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { name, relation, age, gender, phoneNumber, email, previousDentalHistory, medicalConditions } = body;

    if (!name || !relation) {
      return NextResponse.json({ error: "Name and relation are required" }, { status: 400 });
    }

    const patientId = await getPatientId(session);
    if (!patientId) {
      return NextResponse.json({ error: "Patient profile not found" }, { status: 404 });
    }

    const member = await prisma.familyMembers.create({
      data: {
        name,
        relation,
        age: age ? parseInt(age) : null,
        gender: gender || null,
        phoneNumber: phoneNumber || null,
        email: email || null,
        previousDentalHistory: previousDentalHistory || null,
        medicalConditions: medicalConditions || null,
        patientId
      }
    });

    return NextResponse.json(member, { status: 201 });
  } catch (error) {
    console.error("Failed to add family member", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== "patient") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { memberId } = await req.json();
    if (!memberId) {
      return NextResponse.json({ error: "memberId is required" }, { status: 400 });
    }

    const patientId = await getPatientId(session);
    if (!patientId) {
      return NextResponse.json({ error: "Patient not found" }, { status: 404 });
    }

    const member = await prisma.familyMembers.findUnique({ where: { fId: memberId } });
    if (!member) {
      return NextResponse.json({ error: "Family member not found" }, { status: 404 });
    }
    if (member.patientId !== patientId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.familyMembers.delete({ where: { fId: memberId } });
    return NextResponse.json({ message: "Family member deleted" }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete family member", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
