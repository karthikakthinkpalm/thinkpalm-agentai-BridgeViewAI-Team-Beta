import { NextRequest, NextResponse } from 'next/server';
import { generateStitchPreview } from '@/lib/stitch/generate-preview';

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { prd, widgets, domain, layout, projectId } = await req.json();

    if (!prd || typeof prd !== 'string' || !prd.trim()) {
      return NextResponse.json({ error: 'PRD text is required' }, { status: 400 });
    }

    if (!process.env.STITCH_API_KEY?.trim()) {
      return NextResponse.json(
        { error: 'STITCH_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const result = await generateStitchPreview({
      prd: prd.trim(),
      widgets: Array.isArray(widgets) ? widgets : undefined,
      domain,
      layout,
      projectId,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('Stitch preview error:', err);
    return NextResponse.json(
      { error: 'Stitch preview failed', detail: String(err) },
      { status: 500 }
    );
  }
}
