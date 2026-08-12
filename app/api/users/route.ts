import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admins = await prisma.admin.findMany();
    const receptionists = await prisma.receptionist.findMany();
    const doctors = await prisma.doctor.findMany()

    const formattedAdmins = admins.map(a => ({ id: a.adminId, name: a.name, email: a.email, role: 'Admin' }));
    const formattedReceptionists = receptionists.map(r => ({ id: r.receptionistId, name: r.name, email: r.email, role: 'Receptionist' }));
    const formattedDoctors = doctors.map(d => ({ id: d.doctorId, name: d.name, email: d.email, role: 'Doctor' }));

    return NextResponse.json([...formattedAdmins, ...formattedReceptionists, ...formattedDoctors]);
  } catch (error) {
    console.error("Failed to fetch users", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, email, phone, role } = await req.json();

  if (!name || !email || !role) {
    return NextResponse.json({ error: "Name, email, and role are required" }, { status: 400 });
  }

  try {
    // Check if email or phone already exists globally across all roles
    const orConditions = [{ email }];
    const adminOr = [...orConditions, ...(phone ? [{ phone }] : [])];
    const doctorOr = [...orConditions, ...(phone ? [{ phoneNo: phone }] : [])];
    const receptionOr = [...orConditions, ...(phone ? [{ phone }] : [])];
    const patientOr = [...orConditions, ...(phone ? [{ phoneNumber: phone }] : [])];

    const [existingAdmin, existingDoctor, existingReceptionist, existingPatient] = await Promise.all([
      prisma.admin.findFirst({ where: { OR: adminOr } }),
      prisma.doctor.findFirst({ where: { OR: doctorOr } }),
      prisma.receptionist.findFirst({ where: { OR: receptionOr } }),
      prisma.patient.findFirst({ where: { OR: patientOr } }),
    ]);

    if (existingAdmin || existingDoctor || existingReceptionist || existingPatient) {
      return NextResponse.json({ error: "A user with this email or phone number already exists in the system." }, { status: 400 });
    }

    if (role === 'admin') {
      const newAdmin = await prisma.admin.create({
        data: { name, email, phone: phone || '' }
      });
      return NextResponse.json({ id: newAdmin.adminId, name: newAdmin.name, email: newAdmin.email, role: 'Admin' });
    }

    if (role === 'receptionist') {
      const newReceptionist = await prisma.receptionist.create({
        data: { name, email, phone: phone || '' }
      });
      return NextResponse.json({ id: newReceptionist.receptionistId, name: newReceptionist.name, email: newReceptionist.email, role: 'Receptionist' });
    }

    if (role === 'doctor') {
      const newDoctor = await prisma.doctor.create({
        data: { name, email, phoneNo: phone || '' }
      });
      return NextResponse.json({ id: newDoctor.doctorId, name: newDoctor.name, email: newDoctor.email, role: 'Doctor' });
    }

    return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
  } catch (error) {
    console.error("Failed to create user", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
