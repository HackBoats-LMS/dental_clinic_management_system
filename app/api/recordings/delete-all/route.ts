import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    // Only allow in development
    if (process.env.NODE_ENV !== 'development') {
      return NextResponse.json({ error: 'Forbidden. Only available in development environment.' }, { status: 403 });
    }

    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await prisma.recordings.deleteMany({});
    
    return NextResponse.json({ message: 'All recordings deleted successfully.' });
  } catch (error) {
    console.error('Error deleting recordings:', error);
    return NextResponse.json({ error: 'Failed to delete recordings' }, { status: 500 });
  }
}
