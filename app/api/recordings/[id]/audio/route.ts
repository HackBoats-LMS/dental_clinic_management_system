import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

function extractDriveId(url: string) {
  if (!url) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const recording = await prisma.recordings.findUnique({
      where: { recordId: id },
    });

    if (!recording || !recording.driveLink) {
      return new NextResponse('Recording or drive link not found', { status: 404 });
    }

    const fileId = extractDriveId(recording.driveLink);
    if (!fileId) {
      return NextResponse.redirect(recording.driveLink);
    }

    // Try fetching direct audio stream from Google Drive's usercontent server
    const targetUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
    
    let driveRes = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    });

    // Fallback if drive.usercontent fails
    if (!driveRes.ok || driveRes.headers.get('content-type')?.includes('text/html')) {
      const fallbackUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
      const fallbackRes = await fetch(fallbackUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });
      if (fallbackRes.ok && !fallbackRes.headers.get('content-type')?.includes('text/html')) {
        driveRes = fallbackRes;
      }
    }

    // Secondary fallback
    if (!driveRes.ok || driveRes.headers.get('content-type')?.includes('text/html')) {
      const viewUrl = `https://docs.google.com/uc?export=open&id=${fileId}`;
      const viewRes = await fetch(viewUrl);
      if (viewRes.ok && !viewRes.headers.get('content-type')?.includes('text/html')) {
        driveRes = viewRes;
      }
    }

    if (!driveRes.ok || !driveRes.body) {
      return new NextResponse('Failed to stream audio from Google Drive', { status: 502 });
    }

    const contentType = driveRes.headers.get('content-type') || 'audio/mp4';

    return new NextResponse(driveRes.body as any, {
      headers: {
        'Content-Type': contentType.includes('text/html') ? 'audio/mp4' : contentType,
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Audio proxy error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
