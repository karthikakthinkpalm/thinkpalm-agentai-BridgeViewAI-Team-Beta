import { NextRequest, NextResponse } from 'next/server';
import { runAgent1 } from '@/lib/agents/agent1-parser';
import { runAgent2 } from '@/lib/agents/agent2-builder';
import { clearRegistry } from '@/lib/tools/registry';
import { buildWidgetHierarchy } from '@/lib/preview/hierarchy';

export async function POST(req: NextRequest) {
  try {
    const { prd } = await req.json();

    if (!prd || prd.trim() === '') {
      return NextResponse.json(
        { error: 'PRD text is required' },
        { status: 400 }
      );
    }

    clearRegistry();

    console.log('Agent 1 starting...');
    const agent1 = await runAgent1(prd);
    console.log('Agent 1 done:', agent1.schema);

    console.log('Agent 2 starting...');
    const agent2 = await runAgent2(agent1.schema);
    console.log('Agent 2 done. Components:', Object.keys(agent2.components));

    const hierarchy = buildWidgetHierarchy(agent1.schema);
    const prompts = [...agent1.prompts, ...agent2.prompts];

    return NextResponse.json({
      schema: agent1.schema,
      components: agent2.components,
      tree: Object.keys(agent2.components),
      hierarchy,
      prompts,
      detectedWidgets: agent1.detectedWidgets,
    });
  } catch (err) {
    console.error('Pipeline error:', err);
    return NextResponse.json(
      { error: 'Pipeline failed', detail: String(err) },
      { status: 500 }
    );
  }
}
