import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const recordings = await prisma.recordings.findMany();
    return NextResponse.json(recordings);
  } catch (error) {
    console.error('Error fetching recordings:', error);
    return NextResponse.json({ error: 'Failed to fetch recordings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const recording = await prisma.recordings.create({
      data,
    });
    return NextResponse.json(recording, { status: 201 });
  } catch (error) {
    console.error('Error creating recording:', error);
    return NextResponse.json({ error: 'Failed to create recording' }, { status: 500 });
  }
}
