import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || ((session.user as any).role !== "receptionist" && (session.user as any).role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const calls = await prisma.callList.findMany({
    orderBy: { createdAt: 'desc' }
  });

  return NextResponse.json(calls);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || ((session.user as any).role !== "receptionist" && (session.user as any).role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name, phoneNumber, notes } = await req.json();

  if (!name || !phoneNumber) {
    return NextResponse.json({ error: "Name and Phone Number are required" }, { status: 400 });
  }

  const newCall = await prisma.callList.create({
    data: {
      name,
      phoneNumber,
      notes: notes || "",
    }
  });

  return NextResponse.json(newCall);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || ((session.user as any).role !== "receptionist" && (session.user as any).role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, status } = await req.json();

  if (!id || !status) {
    return NextResponse.json({ error: "ID and Status are required" }, { status: 400 });
  }

  const updatedCall = await prisma.callList.update({
    where: { id },
    data: { status }
  });

  return NextResponse.json(updatedCall);
}
