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

    const problems = await prisma.predefinedProblem.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json(problems);
  } catch (error) {
    console.error("Error fetching predefined problems:", error);
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
      return NextResponse.json({ error: "Problem name is required" }, { status: 400 });
    }

    // Upsert to avoid duplicate keys
    const problem = await prisma.predefinedProblem.upsert({
      where: { name },
      update: {},
      create: { name },
    });

    return NextResponse.json(problem);
  } catch (error) {
    console.error("Error adding predefined problem:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
