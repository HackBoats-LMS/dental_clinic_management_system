import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
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
    const session = await getServerSession(authOptions);
    const role = session?.user?.role;
    if (!session || (role !== 'admin' && role !== 'receptionist')) {
      return new NextResponse('Unauthorized', { status: 401 });
    }

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

    // Forward client range request if present (vital for iOS Safari and mobile streaming)
    const clientRange = request.headers.get('range');
    const forwardHeaders: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };
    if (clientRange) {
      forwardHeaders['Range'] = clientRange;
    }

    // Try fetching direct audio stream from Google Drive's usercontent server
    const targetUrl = `https://drive.usercontent.google.com/download?id=${fileId}&export=download&confirm=t`;
    
    let driveRes = await fetch(targetUrl, {
      headers: forwardHeaders,
    });

    // Fallback if drive.usercontent fails
    if (!driveRes.ok || driveRes.headers.get('content-type')?.includes('text/html')) {
      const fallbackUrl = `https://drive.google.com/uc?export=download&id=${fileId}&confirm=t`;
      const fallbackRes = await fetch(fallbackUrl, {
        headers: forwardHeaders,
      });
      if (fallbackRes.ok && !fallbackRes.headers.get('content-type')?.includes('text/html')) {
        driveRes = fallbackRes;
      }
    }

    // Secondary fallback
    if (!driveRes.ok || driveRes.headers.get('content-type')?.includes('text/html')) {
      const viewUrl = `https://docs.google.com/uc?export=open&id=${fileId}`;
      const viewRes = await fetch(viewUrl, {
        headers: forwardHeaders,
      });
      if (viewRes.ok && !viewRes.headers.get('content-type')?.includes('text/html')) {
        driveRes = viewRes;
      }
    }

    if (!driveRes.ok || !driveRes.body) {
      return new NextResponse('Failed to stream audio from Google Drive', { status: 502 });
    }

    const contentType = driveRes.headers.get('content-type') || 'audio/mp4';
    const contentLength = driveRes.headers.get('content-length');
    const contentRange = driveRes.headers.get('content-range');

    const headers: Record<string, string> = {
      'Content-Type': contentType.includes('text/html') ? 'audio/mp4' : contentType,
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, no-store',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type, Authorization',
      'Access-Control-Expose-Headers': 'Content-Range, Content-Length, Accept-Ranges',
      'Accept-Ranges': 'bytes',
    };

    if (contentLength) {
      headers['Content-Length'] = contentLength;
    }
    if (contentRange) {
      headers['Content-Range'] = contentRange;
    }

    const responseStatus =
      driveRes.status === 206 || (clientRange && contentRange)
        ? 206
        : driveRes.status === 200
        ? 200
        : driveRes.status;

    return new NextResponse(driveRes.body, {
      status: responseStatus,
      headers,
    });
  } catch (error) {
    console.error('Audio proxy error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, Content-Type, Authorization',
      'Access-Control-Max-Age': '86400',
    },
  });
}
