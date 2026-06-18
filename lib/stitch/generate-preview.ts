import { stitch, StitchError } from '@google/stitch-sdk';
import { buildStitchPrompt } from './build-prompt';
import { preparePreviewHtml } from './sanitize-preview-html';
import { htmlToProductionComponents } from './html-to-production';
import { buildStitchPromptRecords } from './build-prompt-records';
import type { PromptRecord } from '@/lib/prompts/maritime-prompts';

export type StitchPreviewResult = {
  projectId: string;
  screenId: string;
  imageUrl: string;
  html: string;
  components: Record<string, string>;
  tree: string[];
  standaloneHtml: string;
  prompts: PromptRecord[];
};

async function fetchTextFromUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch Stitch asset: ${res.status}`);
  return res.text();
}

async function resolveProjectId(existingId?: string): Promise<string> {
  if (existingId) return existingId;

  const envId = process.env.STITCH_PROJECT_ID?.trim();
  if (envId) return envId;

  const result = await stitch.callTool<{ name?: string; projectId?: string }>(
    'create_project',
    { title: 'BridgeView AI' }
  );

  const raw = result as Record<string, unknown>;
  const name = typeof raw.name === 'string' ? raw.name : undefined;
  const id =
    typeof raw.projectId === 'string'
      ? raw.projectId
      : name?.replace(/^projects\//, '');

  if (!id) {
    throw new Error('Stitch create_project did not return a project ID');
  }
  return id;
}

export async function generateStitchPreview(opts: {
  prd: string;
  widgets?: string[];
  domain?: string;
  layout?: string;
  projectId?: string;
}): Promise<StitchPreviewResult> {
  const apiKey = process.env.STITCH_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('STITCH_API_KEY is not configured');
  }

  const projectId = await resolveProjectId(opts.projectId);
  const project = stitch.project(projectId);
  const prompt = buildStitchPrompt(opts.prd, opts.widgets, opts.domain, opts.layout);

  try {
    const screen = await project.generate(prompt, 'DESKTOP');
    const [htmlUrl, imageUrl] = await Promise.all([
      screen.getHtml(),
      screen.getImage(),
    ]);

    const rawHtml = await fetchTextFromUrl(htmlUrl);
    const previewHtml = preparePreviewHtml(rawHtml);
    const production = htmlToProductionComponents(rawHtml);
    const prompts = buildStitchPromptRecords({
      prd: opts.prd,
      widgets: opts.widgets,
      domain: opts.domain,
      layout: opts.layout,
      componentTree: production.tree,
      screenId: screen.screenId,
      projectId,
    });

    return {
      projectId,
      screenId: screen.screenId,
      imageUrl,
      html: previewHtml,
      components: production.components,
      tree: production.tree,
      standaloneHtml: production.standaloneHtml,
      prompts,
    };
  } catch (err) {
    if (err instanceof StitchError) {
      throw new Error(`Stitch: ${err.message}`);
    }
    throw err;
  }
}
