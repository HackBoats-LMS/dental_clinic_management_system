import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const receptionist = await prisma.receptionist.findUnique({
      where: { receptionistId: id },
    });
    if (!receptionist) {
      return NextResponse.json({ error: 'Receptionist not found' }, { status: 404 });
    }
    return NextResponse.json(receptionist);
  } catch (error) {
    console.error('Error fetching receptionist:', error);
    return NextResponse.json({ error: 'Failed to fetch receptionist' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const data = await request.json();
    const receptionist = await prisma.receptionist.update({
      where: { receptionistId: id },
      data,
    });
    return NextResponse.json(receptionist);
  } catch (error) {
    console.error('Error updating receptionist:', error);
    return NextResponse.json({ error: 'Failed to update receptionist' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.receptionist.delete({
      where: { receptionistId: id },
    });
    return NextResponse.json({ message: 'Receptionist deleted successfully' });
  } catch (error) {
    console.error('Error deleting receptionist:', error);
    return NextResponse.json({ error: 'Failed to delete receptionist' }, { status: 500 });
  }
}
