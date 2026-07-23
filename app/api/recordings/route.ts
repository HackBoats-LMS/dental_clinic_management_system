import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;

    if (!session || (role !== 'admin' && role !== 'receptionist')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const recordings = await prisma.recordings.findMany({
      orderBy: { date: 'desc' },
    });
    return NextResponse.json(recordings);
  } catch (error) {
    console.error('Error fetching recordings:', error);
    return NextResponse.json({ error: 'Failed to fetch recordings' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    // Check session or API key for external webhook integrations
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;

    const apiKey = request.headers.get('x-api-key');
    const validApiKey = process.env.API_SECRET_KEY;

    const isAuthorized = 
      (role === 'admin') || 
      (validApiKey && apiKey === validApiKey);

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
