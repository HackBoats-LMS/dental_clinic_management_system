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

  const { name, phoneNumber, notes, date } = await req.json();

  if (!name || !phoneNumber) {
    return NextResponse.json({ error: "Name and Phone Number are required" }, { status: 400 });
  }

  const newCall = await prisma.callList.create({
    data: {
      name,
      phoneNumber,
      notes: notes || "",
      ...(date ? { callDate: new Date(date) } : {}),
    }
  });

  return NextResponse.json(newCall);
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || ((session.user as any).role !== "receptionist" && (session.user as any).role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, status, notes, callDate } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  const dataToUpdate: any = {};
  if (status !== undefined) dataToUpdate.status = status;
  if (notes !== undefined) dataToUpdate.notes = notes;
  if (callDate !== undefined) dataToUpdate.callDate = new Date(callDate);

  const updatedCall = await prisma.callList.update({
    where: { id },
    data: dataToUpdate
  });

  return NextResponse.json(updatedCall);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || ((session.user as any).role !== "receptionist" && (session.user as any).role !== "admin")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  await prisma.callList.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
