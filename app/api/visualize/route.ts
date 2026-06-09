import { NextRequest, NextResponse } from 'next/server';
import { recommendFromDataset } from '@/lib/tools/dataset-viz-agent';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { dataset, domainContext, userGoal } = body;

    if (!dataset || typeof dataset !== 'object' || Array.isArray(dataset)) {
      return NextResponse.json(
        { error: 'dataset must be a non-null object, e.g. { "speed": [12, 14, 16] }' },
        { status: 400 }
      );
    }

    const result = recommendFromDataset({
      dataset,
      domainContext,
      userGoal,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error('Visualize error:', err);
    return NextResponse.json(
      { error: 'Visualization recommendation failed', detail: String(err) },
      { status: 500 }
    );
  }
}
