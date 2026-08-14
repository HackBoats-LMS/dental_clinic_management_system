import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const { name, email: rawEmail, phone, role } = await req.json();
  const email = rawEmail?.toLowerCase();

  if (!name || !email || !role || !id) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    const orConditions = [{ email }];
    const adminOr = [...orConditions, ...(phone ? [{ phone }] : [])];
    const doctorOr = [...orConditions, ...(phone ? [{ phoneNo: phone }] : [])];
    const receptionOr = [...orConditions, ...(phone ? [{ phone }] : [])];
    const patientOr = [...orConditions, ...(phone ? [{ phoneNumber: phone }] : [])];

    const [existingAdmin, existingDoctor, existingReceptionist, existingPatient] = await Promise.all([
      prisma.admin.findFirst({ where: { OR: adminOr, NOT: { adminId: id } } }),
      prisma.doctor.findFirst({ where: { OR: doctorOr, NOT: { doctorId: id } } }),
      prisma.receptionist.findFirst({ where: { OR: receptionOr, NOT: { receptionistId: id } } }),
      prisma.patient.findFirst({ where: { OR: patientOr, NOT: { patientId: id } } }),
    ]);

    if (existingAdmin || existingDoctor || existingReceptionist || existingPatient) {
      return NextResponse.json({ error: "A user with this email or phone number already exists in the system." }, { status: 400 });
    }

    if (role.toLowerCase() === 'admin') {
      const updated = await prisma.admin.update({ where: { adminId: id }, data: { name, email, phone: phone || '' } });
      return NextResponse.json({ id: updated.adminId, name: updated.name, email: updated.email, role: 'Admin' });
    } else if (role.toLowerCase() === 'receptionist') {
      const updated = await prisma.receptionist.update({ where: { receptionistId: id }, data: { name, email, phone: phone || '' } });
      return NextResponse.json({ id: updated.receptionistId, name: updated.name, email: updated.email, role: 'Receptionist' });
    } else if (role.toLowerCase() === 'doctor') {
      const updated = await prisma.doctor.update({ where: { doctorId: id }, data: { name, email, phoneNo: phone || '' } });
      return NextResponse.json({ id: updated.doctorId, name: updated.name, email: updated.email, role: 'Doctor' });
    } else if (role.toLowerCase() === 'patient') {
      const updated = await prisma.patient.update({ where: { patientId: id }, data: { name, email, phoneNumber: phone || '' } });
      return NextResponse.json({ id: updated.patientId, name: updated.name, email: updated.email, role: 'Patient' });
    }

    return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
  } catch (error) {
    console.error("Failed to update user", error);
    return NextResponse.json({ error: "Internal Server Error or Record Not Found" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const role = req.nextUrl.searchParams.get("role")?.toLowerCase();

  if (!id || !role) {
    return NextResponse.json({ error: "User ID and role are required" }, { status: 400 });
  }

  try {
    if (role === 'admin') {
      await prisma.admin.delete({ where: { adminId: id } });
    } else if (role === 'receptionist') {
      await prisma.receptionist.delete({ where: { receptionistId: id } });
    } else if (role === 'doctor') {
      await prisma.doctor.delete({ where: { doctorId: id } });
    } else if (role === 'patient') {
      await prisma.patient.delete({ where: { patientId: id } });
    } else {
      return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete user", error);
    if (error.code === 'P2003') {
      return NextResponse.json({ error: "Cannot delete this user because they are linked to existing medical records (appointments, visits, or treatment plans)." }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
