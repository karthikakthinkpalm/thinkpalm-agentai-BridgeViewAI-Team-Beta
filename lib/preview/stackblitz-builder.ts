import sdk, { Project } from '@stackblitz/sdk';
import type { PreviewContextData } from './parse-prd';
import { buildCuratedStackBlitzProject } from './stackblitz-curated';

/** @deprecated Use openCuratedStackBlitz — LLM components diverge from live preview. */
export function buildStackBlitzProject(components: Record<string, string>, activeWidgets: string[]): Project {
  const files: Record<string, string> = {
    'index.html': `<!DOCTYPE html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>BridgeView AI Preview</title>
  </head>
  <body class="bg-slate-950 text-slate-100 min-h-screen">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>`,
    'package.json': `{
  "name": "bridgeview-ai-preview",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": { "dev": "vite", "build": "tsc && vite build", "preview": "vite preview" },
  "dependencies": { "react": "^18.2.0", "react-dom": "^18.2.0" },
  "devDependencies": {
    "@types/react": "^18.2.64",
    "@types/react-dom": "^18.2.21",
    "@vitejs/plugin-react": "^4.2.1",
    "autoprefixer": "^10.4.18",
    "postcss": "^8.4.35",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.2.2",
    "vite": "^5.1.6"
  }
}`,
    'vite.config.ts': `import { defineConfig } from 'vite'\nimport react from '@vitejs/plugin-react'\nexport default defineConfig({ plugins: [react()] })`,
    'tailwind.config.js': `export default { content: ["./index.html","./src/**/*.{js,ts,jsx,tsx}"], theme: { extend: {} }, plugins: [] }`,
    'postcss.config.js': `export default { plugins: { tailwindcss: {}, autoprefixer: {} } }`,
    'src/index.css': `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`,
    'src/main.tsx': `import React from 'react'\nimport ReactDOM from 'react-dom/client'\nimport App from './App.tsx'\nimport './index.css'\nReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>)`,
  };

  const imports: string[] = [];
  const renders: string[] = [];

  for (const w of activeWidgets) {
    if (components[w]) {
      files[`src/components/${w}.tsx`] = components[w];
      imports.push(`import ${w} from './components/${w}';`);
      renders.push(`        <div className="flex flex-col"><${w} /></div>`);
    }
  }

  files['src/App.tsx'] = `import React from 'react';\n${imports.join('\n')}\nexport default function App() {\n  return (\n    <div className="p-8 max-w-[1600px] mx-auto">\n      <h1 className="text-3xl font-bold text-sky-400 mb-8">Live Dashboard Preview</h1>\n      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 auto-rows-max">\n${renders.join('\n')}\n      </div>\n    </div>\n  );\n}\n`;

  return { title: 'BridgeView AI Preview', description: 'Generated dashboard preview', template: 'node', files };
}

/** Open StackBlitz with curated components that match the in-app Live Preview. */
export function openCuratedStackBlitz(previewData: PreviewContextData, activeWidgets: string[]) {
  const project = buildCuratedStackBlitzProject(previewData, activeWidgets);
  sdk.openProject(project, { openFile: 'src/App.tsx', view: 'preview' });
}

export function openStackBlitz(components: Record<string, string>, activeWidgets: string[]) {
  const project = buildStackBlitzProject(components, activeWidgets);
  sdk.openProject(project, { openFile: 'src/App.tsx', view: 'preview' });
}
