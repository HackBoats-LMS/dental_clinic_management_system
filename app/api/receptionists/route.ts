import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const receptionists = await prisma.receptionist.findMany();
    return NextResponse.json(receptionists);
  } catch (error) {
    console.error('Error fetching receptionists:', error);
    return NextResponse.json({ error: 'Failed to fetch receptionists' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const receptionist = await prisma.receptionist.create({
      data,
    });
    return NextResponse.json(receptionist, { status: 201 });
  } catch (error) {
    console.error('Error creating receptionist:', error);
    return NextResponse.json({ error: 'Failed to create receptionist' }, { status: 500 });
  }
}
