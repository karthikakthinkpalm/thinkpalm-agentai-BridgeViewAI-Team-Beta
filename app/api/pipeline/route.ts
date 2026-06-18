import { NextRequest, NextResponse } from 'next/server';
import { runPipeline } from '@/lib/agents/run-pipeline';
import { recommendationsToJson } from '@/lib/tools/visualization-recommender';

export async function POST(req: NextRequest) {
  try {
    const { prd, existingComponents, llmProvider } = await req.json();

    if (!prd || prd.trim() === '') {
      return NextResponse.json({ error: 'PRD text is required' }, { status: 400 });
    }

    const result = await runPipeline(prd, existingComponents, llmProvider);

    return NextResponse.json({
      schema: result.schema,
      components: result.components,
      tree: result.tree,
      hierarchy: result.hierarchy,
      prompts: result.prompts,
      detectedWidgets: result.detectedWidgets,
      visualizations: result.visualizationAnalysis
        ? recommendationsToJson(result.visualizationAnalysis)
        : [],
      visualizationAnalysis: result.visualizationAnalysis,
      uxReview: result.uxReview,
      maritimeReview: result.maritimeReview,
      featureDiscovery: result.featureDiscovery,
      agentTrace: result.agentTrace,
      debugTrace: result.debugTrace,
      warnings: result.warnings ?? [],
      fallbackWidgets: result.fallbackWidgets ?? [],
      adaptivePlan: result.adaptivePlan,
      provisionedTools: result.provisionedTools ?? [],
    });
  } catch (err) {
    console.error('Pipeline error:', err);
    return NextResponse.json(
      { error: 'Pipeline failed', detail: String(err) },
      { status: 500 }
    );
  }
}
