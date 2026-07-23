import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import * as xlsx from 'xlsx';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || (session.user as any).role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Read the file as an array buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Parse the Excel file with cellDates to automatically convert date cells to JS Dates
    const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Convert sheet to JSON
    const data = xlsx.utils.sheet_to_json(sheet);

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Excel file is empty or invalid' }, { status: 400 });
    }

    // Map the excel data to the database model
    // Assuming the Excel columns match the Prisma model field names
    let successCount = 0;
    const errors = [];

    for (const row of data as any[]) {
      try {
        let dateStr = '';
        const rawDate = row.Date || row.date;
        if (rawDate instanceof Date) {
          dateStr = rawDate.toISOString().split('T')[0];
        } else if (rawDate) {
          const d = new Date(rawDate);
          if (!isNaN(d.getTime())) {
            dateStr = d.toISOString().split('T')[0];
          } else {
            dateStr = String(rawDate);
          }
        }

        await prisma.recordings.create({
          data: {
            id: String(row.id || ''),
            fileName: String(row.Filename || row.fileName || ''),
            mimeType: String(row.mimeType || ''),
            driveLink: String(row.DriveLink || row.driveLink || ''),
            date: dateStr,
            phoneNumber: String(row.PhoneNumber || row.phoneNumber || ''),
            Transcript: row.Transcript || row.transcript ? String(row.Transcript || row.transcript) : null,
            Summary: row.Summary || row.summary ? String(row.Summary || row.summary) : null,
            Time: row.Time || row.time ? String(row.Time || row.time) : null,
          }
        });
        successCount++;
      } catch (err: any) {
        console.error('Error inserting row:', err);
        errors.push(`Row with id ${row.id} failed: ${err.message}`);
      }
    }

    return NextResponse.json({ 
      message: 'Upload complete', 
      successCount,
      errors: errors.length > 0 ? errors : undefined
    }, { status: 200 });

  } catch (error) {
    console.error('Error processing upload:', error);
    return NextResponse.json({ error: 'Failed to process file' }, { status: 500 });
  }
}
