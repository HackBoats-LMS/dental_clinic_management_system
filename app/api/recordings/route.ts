import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { Prisma } from '@/app/generated/prisma/client';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;

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

const CREATABLE_FIELDS = [
  'fileName',
  'mimeType',
  'driveLink',
  'date',
  'phoneNumber',
  'Transcript',
  'Time',
  'source',
  'callType',
  'details',
  'followUp',
  'outcome',
  'purpose',
  'duration',
] as const;

export async function POST(request: Request) {
  try {
    // Check session or API key for external webhook integrations
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;

    const apiKey = request.headers.get('x-api-key');
    const validApiKey = process.env.API_SECRET_KEY;

    const isAuthorized =
      (role === 'admin') ||
      (validApiKey && apiKey === validApiKey);

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const data = {} as Prisma.RecordingsUncheckedCreateInput;
    for (const field of CREATABLE_FIELDS) {
      if (body[field] !== undefined) {
        data[field] = body[field];
      }
    }

    for (const field of ['fileName', 'mimeType', 'driveLink', 'phoneNumber', 'date'] as const) {
      if (!data[field]) {
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    const recording = await prisma.recordings.create({
      data,
    });
    return NextResponse.json(recording, { status: 201 });
  } catch (error) {
    console.error('Error creating recording:', error);
    return NextResponse.json({ error: 'Failed to create recording' }, { status: 500 });
  }
}
