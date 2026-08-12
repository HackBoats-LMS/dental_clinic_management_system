import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function GET() {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const doctors = await prisma.doctor.findMany({
            select: {
                doctorId: true,
                name: true,
                email: true,
                isPresent: true
            }
        });
        return NextResponse.json(doctors, { status: 200 });
    } catch (error) {
        console.error("Error fetching doctors", error);
        return NextResponse.json({ message: "Error fetching doctors" }, { status: 500 });
    }
}