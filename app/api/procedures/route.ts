import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const procedures = await prisma.predefinedProcedure.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json(procedures);
  } catch (error) {
    console.error("Error fetching predefined procedures:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== "doctor") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name } = await req.json();
    if (!name) {
      return NextResponse.json({ error: "Procedure name is required" }, { status: 400 });
    }

    const procedure = await prisma.predefinedProcedure.upsert({
      where: { name },
      update: {},
      create: { name },
    });

    return NextResponse.json(procedure);
  } catch (error) {
    console.error("Error adding predefined procedure:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
