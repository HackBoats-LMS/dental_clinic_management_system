import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phoneNumber, service, date } = body;

    if (!name || !phoneNumber) {
      return NextResponse.json({ error: "Name and Phone Number are required" }, { status: 400 });
    }

    const notes = `[Public Booking Request] Service: ${service || "General"} | Preferred Date: ${date || "Anytime"}`;

    const newCall = await prisma.callList.create({
      data: {
        name,
        phoneNumber,
        notes,
        callDate: date ? new Date(date) : new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Booking request received. A receptionist will call you shortly to confirm your slot!",
      call: newCall,
    });
  } catch (error) {
    console.error("Error creating guest booking:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
