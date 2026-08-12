import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import * as xlsx from 'xlsx';

function excelSerialToDate(serial: number): Date {
  return new Date(Date.UTC(1899, 11, 30) + serial * 86400000);
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
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
    const data = xlsx.utils.sheet_to_json<Record<string, unknown>>(sheet);

    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Excel file is empty or invalid' }, { status: 400 });
    }

    let successCount = 0;
    const errors: string[] = [];

    for (const row of data) {
      try {
        // Handle Excel serial numbers, JS Dates, ISO strings and missing values
        const rawDate = row.Date || row.date;
        let dateStr = '';
        if (rawDate instanceof Date) {
          dateStr = rawDate.toISOString().split('T')[0];
        } else if (typeof rawDate === 'number' && isFinite(rawDate)) {
          const d = excelSerialToDate(rawDate);
          dateStr = isNaN(d.getTime()) ? String(rawDate) : d.toISOString().split('T')[0];
        } else if (rawDate) {
          const d = new Date(String(rawDate));
          dateStr = isNaN(d.getTime()) ? String(rawDate) : d.toISOString().split('T')[0];
        }

        const fileName = String(row.Filename || row.fileName || '');
        const mimeType = String(row.mimeType || '');
        const driveLink = String(row.DriveLink || row.driveLink || '');
        const phoneNumber = String(row.PhoneNumber || row.phoneNumber || '');
        const summary = String(row.Summary || row.summary || '');

        const required = { fileName, mimeType, driveLink, phoneNumber, date: dateStr };
        for (const [field, value] of Object.entries(required)) {
          if (!value) {
            throw new Error(`Missing required column value: ${field}`);
          }
        }

        await prisma.recordings.create({
          data: {
            id: String(row.id || ''),
            fileName,
            mimeType,
            driveLink,
            date: dateStr,
            phoneNumber,
            Transcript: row.Transcript || row.transcript ? String(row.Transcript || row.transcript) : null,
            callType: row.callType || row.CallType ? String(row.callType || row.CallType) : null,
            purpose: row.purpose || row.Purpose ? String(row.purpose || row.Purpose) : null,
            // The documented "Summary" column maps to details (backwards compatible)
            details: summary || (row.details || row.Details ? String(row.details || row.Details) : ''),
            outcome: row.outcome || row.Outcome ? String(row.outcome || row.Outcome) : null,
            followUp: row.followUp || row.FollowUp ? String(row.followUp || row.FollowUp) : null,
            Time: row.Time || row.time ? String(row.Time || row.time) : null,
          }
        });
        successCount++;
      } catch (err) {
        console.error('Error inserting row:', err);
        errors.push(`Row ${row.id ?? ''} failed: ${err instanceof Error ? err.message : 'unknown error'}`);
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
