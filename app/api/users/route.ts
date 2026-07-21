import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admins = await prisma.admin.findMany();
    const receptionists = await prisma.receptionist.findMany();

    const formattedAdmins = admins.map(a => ({ id: a.adminId, name: a.name, email: a.email, role: 'Admin' }));
    const formattedReceptionists = receptionists.map(r => ({ id: r.receptionistId, name: r.name, email: r.email, role: 'Receptionist' }));

    return NextResponse.json([...formattedAdmins, ...formattedReceptionists]);
  } catch (error) {
    console.error("Failed to fetch users", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, email, phone, role } = await req.json();

  if (!name || !email || !role) {
    return NextResponse.json({ error: "Name, email, and role are required" }, { status: 400 });
  }

  try {
    if (role === 'admin') {
      const existing = await prisma.admin.findFirst({ where: { email } });
      if (existing) return NextResponse.json({ error: "Admin with this email already exists" }, { status: 400 });
      
      const newAdmin = await prisma.admin.create({
        data: { name, email, phone: phone || '' }
      });
      return NextResponse.json({ id: newAdmin.adminId, name: newAdmin.name, email: newAdmin.email, role: 'Admin' });
    } 
    
    if (role === 'receptionist') {
      const existing = await prisma.receptionist.findFirst({ where: { email } });
      if (existing) return NextResponse.json({ error: "Receptionist with this email already exists" }, { status: 400 });

      const newReceptionist = await prisma.receptionist.create({
        data: { name, email, phone: phone || '' }
      });
      return NextResponse.json({ id: newReceptionist.receptionistId, name: newReceptionist.name, email: newReceptionist.email, role: 'Receptionist' });
    }

    return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
  } catch (error) {
    console.error("Failed to create user", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
