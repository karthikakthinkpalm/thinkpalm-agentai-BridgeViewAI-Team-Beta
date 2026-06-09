import { NextRequest, NextResponse } from 'next/server';
import { runAgent1 } from '@/lib/agents/agent1-parser';
import { runAgent1_5 } from '@/lib/agents/agent1_5-strategist';
import { runAgent2 } from '@/lib/agents/agent2-builder';
import { runAgent3 } from '@/lib/agents/agent3-auditor';
import { clearRegistry } from '@/lib/tools/registry';
import { buildWidgetHierarchy } from '@/lib/preview/hierarchy';

export async function POST(req: NextRequest) {
  try {
    const { prd, provider = 'groq' } = await req.json();

    if (!prd || prd.trim() === '') {
      return NextResponse.json(
        { error: 'PRD text is required' },
        { status: 400 }
      );
    }

    clearRegistry();

    console.log('Agent 1 starting...');
    const agent1 = await runAgent1(prd, provider);
    console.log('Agent 1 done:', agent1.schema);

    console.log('Agent 1.5 starting...');
    const agent1_5 = await runAgent1_5(agent1.schema, provider);
    console.log('Agent 1.5 done. Theme:', agent1_5.result.theme);

    console.log('Agent 2 starting...');
    const agent2 = await runAgent2(agent1.schema, provider);
    console.log('Agent 2 done. Components:', Object.keys(agent2.components));

    console.log('Agent 3 starting...');
    const agent3 = await runAgent3(agent2, provider);
    console.log('Agent 3 done. Score:', agent3.result.score);

    const hierarchy = buildWidgetHierarchy(agent1.schema);
    const prompts = [
      ...agent1.prompts, 
      agent1_5.prompt,
      ...agent2.prompts,
      agent3.prompt
    ];

    return NextResponse.json({
      schema: agent1.schema,
      layoutStrategy: agent1_5.result,
      auditReport: agent3.result,
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
