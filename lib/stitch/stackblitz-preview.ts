import sdk, { Project } from '@stackblitz/sdk';

function ensureFullDocument(previewHtml: string): string {
  const fullscreenStyle = `
<style data-bridgeview-fullscreen>
  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    min-height: 100vh;
    overflow-x: hidden;
  }
</style>`;

  if (previewHtml.includes('<html')) {
    if (previewHtml.includes('</head>')) {
      return previewHtml.replace('</head>', `${fullscreenStyle}\n</head>`);
    }
    return `${fullscreenStyle}\n${previewHtml}`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  ${fullscreenStyle}
</head>
<body>
${previewHtml}
</body>
</html>`;
}

export function buildStitchPreviewStackBlitzProject(
  previewHtml: string,
  title = 'BridgeView Live Preview'
): Project {
  return {
    title,
    description: 'Stitch live preview — fullscreen',
    template: 'html',
    files: {
      'index.html': ensureFullDocument(previewHtml),
    },
  };
}

/** Open the Stitch live preview fullscreen in a new StackBlitz tab. */
export function openStitchPreviewStackBlitz(previewHtml: string, prd?: string): void {
  if (!previewHtml.trim()) return;

  const titleMatch = prd?.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].trim() : 'BridgeView Live Preview';
  const project = buildStitchPreviewStackBlitzProject(previewHtml, title);

  sdk.openProject(project, {
    openFile: 'index.html',
    view: 'preview',
    newWindow: true,
  });
}
