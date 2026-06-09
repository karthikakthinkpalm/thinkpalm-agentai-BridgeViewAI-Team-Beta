import sdk, { Project } from '@stackblitz/sdk';

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
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "lucide-react": "^0.344.0",
    "recharts": "^2.12.7",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
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

    'vite.config.ts': `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`,

    'tailwind.config.js': `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}`,

    'postcss.config.js': `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`,

    'src/index.css': `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --accent: 14 165 233;
  --accent-2: 56 189 248;
  --border: 51 65 85;
  --surface: 2 6 23;
}
`,

    'src/main.tsx': `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,

  };

  // Generate component files
  const imports: string[] = [];
  const renders: string[] = [];

  for (const w of activeWidgets) {
    if (components[w]) {
      files[`src/components/${w}.tsx`] = components[w];
      imports.push(`import ${w} from './components/${w}';`);
      renders.push(`        <div className="w-full">
          <${w} />
        </div>`);
    }
  }

  // Generate App.tsx
  files['src/App.tsx'] = `import React from 'react';
${imports.join('\n')}

export default function App() {
  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col gap-8">
      <h1 className="text-3xl font-bold text-sky-400 mb-4">Live Dashboard Preview</h1>
      <div className="flex flex-col gap-8">
${renders.join('\n')}
      </div>
    </div>
  );
}
`;

  return {
    title: 'BridgeView AI Preview',
    description: 'Generated dashboard preview',
    template: 'node',
    files,
  };
}

export function openStackBlitz(components: Record<string, string>, activeWidgets: string[]) {
  const project = buildStackBlitzProject(components, activeWidgets);
  sdk.openProject(project, { openFile: 'src/App.tsx', view: 'preview' });
}
