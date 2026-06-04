/**
 * Export generated React components to downloadable production-ready files.
 */

export function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9_-]/g, '');
}

export function ensureTsxExtension(name: string): string {
  const base = sanitizeFilename(name);
  return base.endsWith('.tsx') ? base : `${base}.tsx`;
}

function triggerDownload(filename: string, content: string, mime = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Ensure exported code has React import for standalone use */
export function productionizeComponent(code: string, componentName: string): string {
  const trimmed = code.trim();
  const hasReactImport = /import\s+.*\s+from\s+['"]react['"]/.test(trimmed);

  const header = `// BridgeView AI — production export
// Component: ${componentName}
// Generated: ${new Date().toISOString()}

`;

  if (hasReactImport) {
    return header + trimmed + '\n';
  }

  return `${header}import React from 'react';

${trimmed}
`;
}

export function downloadComponent(name: string, code: string): void {
  const filename = ensureTsxExtension(name);
  const body = productionizeComponent(code, name);
  triggerDownload(filename, body, 'application/typescript');
}

export function downloadAllComponents(components: Record<string, string>): void {
  const bundle = Object.entries(components)
    .map(([name, code]) => {
      const sep = '='.repeat(60);
      return `${sep}\n// File: ${ensureTsxExtension(name)}\n${sep}\n\n${productionizeComponent(code, name)}`;
    })
    .join('\n\n');

  triggerDownload(
    `bridgeview-dashboard-${Date.now()}.tsx`,
    `// BridgeView AI — full dashboard export\n// Files: ${Object.keys(components).join(', ')}\n\n${bundle}`,
    'application/typescript'
  );
}

export function buildIndexFile(components: Record<string, string>): string {
  const names = Object.keys(components);
  const imports = names
    .map((n) => `import ${n} from './${sanitizeFilename(n)}';`)
    .join('\n');
  const exports = `export { ${names.join(', ')} };`;
  const dashboard = `
export default function MaritimeDashboard() {
  return (
    <div className="grid gap-4 p-4 sm:grid-cols-2 bg-slate-950 min-h-screen">
${names.map((n) => `      <${n} />`).join('\n')}
    </div>
  );
}
`;
  return `// BridgeView AI — index barrel + dashboard layout\n${imports}\n\n${exports}\n${dashboard}`;
}

export function downloadWithIndex(components: Record<string, string>): void {
  downloadAllComponents(components);
  const index = buildIndexFile(components);
  setTimeout(() => triggerDownload('MaritimeDashboard.tsx', index, 'application/typescript'), 300);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
