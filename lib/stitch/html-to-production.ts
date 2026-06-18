import * as cheerio from 'cheerio';
import { stripNonActionableLinks } from './sanitize-preview-html';

export type ProductionBundle = {
  components: Record<string, string>;
  tree: string[];
  standaloneHtml: string;
};

function escapeTemplateLiteral(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/\$\{/g, '\\${');
}

function toPascalCase(raw: string): string {
  const words = raw
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) return 'Section';

  const name = words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');

  return /^[A-Z]/.test(name) ? name : `Section${name}`;
}

function uniqueComponentName(
  $: cheerio.CheerioAPI,
  el: cheerio.Element,
  index: number,
  used: Set<string>
): string {
  const node = $(el);
  const id = node.attr('id')?.trim();
  const firstClass = node.attr('class')?.split(/\s+/).find((c) => c && !c.startsWith('stitch-'));
  const tag = el.tagName?.toLowerCase() ?? 'section';

  let base = toPascalCase(id || firstClass || `${tag}-${index + 1}`);

  if (base === 'Div' || base === 'Section') {
    base = `DashboardSection${index + 1}`;
  }

  let name = base;
  let suffix = 2;
  while (used.has(name)) {
    name = `${base}${suffix++}`;
  }
  used.add(name);
  return name;
}

function isSplittableElement(el: cheerio.Element): boolean {
  const tag = el.tagName?.toLowerCase() ?? '';
  return !['script', 'style', 'link', 'meta', 'noscript'].includes(tag);
}

function buildSectionComponent(name: string, html: string): string {
  return `'use client';

/**
 * Generated from Google Stitch live preview.
 */
export default function ${name}() {
  return (
    <div
      className="stitch-section"
      data-stitch-section="${name}"
      dangerouslySetInnerHTML={{ __html: \`${escapeTemplateLiteral(html)}\` }}
    />
  );
}
`;
}

function buildStylesComponent(css: string): string {
  return `'use client';

/** Global styles extracted from Stitch live preview. */
export default function DashboardStyles() {
  return (
    <style
      data-stitch-dashboard-styles
      dangerouslySetInnerHTML={{ __html: \`${escapeTemplateLiteral(css)}\` }}
    />
  );
}
`;
}

function buildDashboardRoot(sectionNames: string[], includeStyles: boolean): string {
  const imports = [
    ...(includeStyles ? [`import DashboardStyles from './DashboardStyles';`] : []),
    ...sectionNames.map((name) => `import ${name} from './${name}';`),
  ].join('\n');

  return `'use client';

${imports}

/**
 * Root dashboard composed from Stitch live preview sections.
 */
export default function StitchDashboard() {
  return (
    <div className="stitch-dashboard-root min-h-screen w-full">
${includeStyles ? '      <DashboardStyles />\n' : ''}${sectionNames.map((name) => `      <${name} />`).join('\n')}
    </div>
  );
}
`;
}

function buildSingleDashboardComponent(bodyHtml: string, css: string): string {
  const styleBlock = css
    ? `      <style
        data-stitch-dashboard-styles
        dangerouslySetInnerHTML={{ __html: \`${escapeTemplateLiteral(css)}\` }}
      />\n`
    : '';

  return `'use client';

/**
 * Generated from Google Stitch live preview.
 */
export default function StitchDashboard() {
  return (
    <div className="stitch-dashboard-root min-h-screen w-full">
${styleBlock}      <div dangerouslySetInnerHTML={{ __html: \`${escapeTemplateLiteral(bodyHtml)}\` }} />
    </div>
  );
}
`;
}

function buildStandaloneHtml(bodyHtml: string, css: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>BridgeView Dashboard</title>
  ${css ? `<style>${css}</style>` : ''}
</head>
<body>
${bodyHtml}
</body>
</html>`;
}

/** Convert sanitized Stitch HTML into exportable React components. */
export function htmlToProductionComponents(rawHtml: string): ProductionBundle {
  const cleaned = stripNonActionableLinks(rawHtml);
  const $ = cheerio.load(cleaned, { xml: false });

  $('style[data-bridgeview-preview]').remove();
  $('script').remove();

  const styleChunks: string[] = [];
  $('style').each((_, el) => {
    const css = $(el).html()?.trim();
    if (css) styleChunks.push(css);
    $(el).remove();
  });
  const css = styleChunks.join('\n').trim();

  const body = $('body');
  const bodyRoot = body.length ? body : $.root();
  const main = bodyRoot.find('main').first();
  const splitRoot = main.length ? main : bodyRoot;

  const candidates = splitRoot
    .children()
    .toArray()
    .filter(isSplittableElement);

  const bodyHtml = (body.length ? body.html() : $.root().html())?.trim() ?? cleaned.trim();

  const components: Record<string, string> = {};
  const tree: string[] = [];
  const usedNames = new Set<string>();

  const hasStyles = css.length > 0;
  if (hasStyles) {
    components.DashboardStyles = buildStylesComponent(css);
  }

  if (candidates.length >= 2) {
    const sectionNames: string[] = [];

    candidates.forEach((el, index) => {
      const name = uniqueComponentName($, el, index, usedNames);
      const sectionHtml = $.html(el).trim();
      components[name] = buildSectionComponent(name, sectionHtml);
      sectionNames.push(name);
    });

    components.StitchDashboard = buildDashboardRoot(sectionNames, hasStyles);

    tree.push('StitchDashboard');
    if (hasStyles) tree.push('DashboardStyles');
    tree.push(...sectionNames);
  } else {
    components.StitchDashboard = buildSingleDashboardComponent(bodyHtml, css);
    tree.push('StitchDashboard');
  }

  return {
    components,
    tree,
    standaloneHtml: buildStandaloneHtml(bodyHtml, css),
  };
}
