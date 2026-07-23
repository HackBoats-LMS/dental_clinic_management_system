import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    const role = (session?.user as any)?.role;
    if (!session || (role !== 'admin' && role !== 'receptionist')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const recording = await prisma.recordings.findUnique({
      where: { recordId: id },
    });
    if (!recording) {
      return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
    }
    return NextResponse.json(recording);
  } catch (error) {
    console.error('Error fetching recording:', error);
    return NextResponse.json({ error: 'Failed to fetch recording' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const data = await request.json();
    const recording = await prisma.recordings.update({
      where: { recordId: id },
      data,
    });
    return NextResponse.json(recording);
  } catch (error) {
    console.error('Error updating recording:', error);
    return NextResponse.json({ error: 'Failed to update recording' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    await prisma.recordings.delete({
      where: { recordId: id },
    });
    return NextResponse.json({ message: 'Recording deleted successfully' });
  } catch (error) {
    console.error('Error deleting recording:', error);
    return NextResponse.json({ error: 'Failed to delete recording' }, { status: 500 });
  }
}
