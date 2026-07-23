import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const receptionists = await prisma.receptionist.findMany();
    return NextResponse.json(receptionists);
  } catch (error) {
    console.error('Error fetching receptionists:', error);
    return NextResponse.json({ error: 'Failed to fetch receptionists' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
