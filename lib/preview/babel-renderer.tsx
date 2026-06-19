'use client';

import React, { useState, useEffect, Component, type ErrorInfo } from 'react';
import * as Babel from '@babel/standalone';

class ErrorBoundary extends Component<
  { children: React.ReactNode; fallback: (error: Error) => React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Babel Preview Runtime Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return this.props.fallback(this.state.error);
    }
    return this.props.children;
  }
}

export function BabelWidgetPreview({ code, widgetName }: { code: string; widgetName: string }) {
  const [PreviewComponent, setPreviewComponent] = useState<React.ComponentType | null>(null);
  const [compileError, setCompileError] = useState<Error | null>(null);

  useEffect(() => {
    try {
      // 1. Transform the JSX/TSX to CommonJS using Babel
      const result = Babel.transform(code, {
        presets: [['env', { modules: 'commonjs' }], ['react', { runtime: 'classic' }], 'typescript'],
        filename: `${widgetName}.tsx`,
      });

      if (!result.code) throw new Error('Babel returned empty code.');

      // 2. Provide a custom require implementation that injects React
      const customRequire = (moduleName: string) => {
        if (moduleName === 'react') return React;
        throw new Error(
          `Module '${moduleName}' is not available in the Live Preview environment. Please only import 'react'.`
        );
      };

      // 3. Setup CommonJS module environment
      const exportsObj = {};
      const moduleObj = { exports: exportsObj };

      // 4. Evaluate the transformed code
      const renderFunc = new Function('require', 'exports', 'module', 'React', result.code);
      renderFunc(customRequire, exportsObj, moduleObj, React);

      // 5. Extract the default export
      const DefaultExport = (moduleObj.exports as any).default || moduleObj.exports;
      if (!DefaultExport || typeof DefaultExport !== 'function') {
        throw new Error('No valid default export found in component.');
      }

      setPreviewComponent(() => DefaultExport);
      setCompileError(null);
    } catch (err) {
      console.error('Babel compilation error:', err);
      setCompileError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [code, widgetName]);

  const ErrorFallback = (err: Error) => (
    <div className="flex h-full w-full min-h-[260px] flex-col items-center justify-center rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center shadow-lg shadow-black/30">
      <svg className="mb-3 h-8 w-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <h3 className="text-lg font-semibold text-red-200">Error rendering {widgetName}</h3>
      <p className="mt-2 text-xs text-red-400 font-mono break-all line-clamp-3 w-full bg-black/40 p-2 rounded text-left">
        {err.message}
      </p>
    </div>
  );

  if (compileError) {
    return ErrorFallback(compileError);
  }

  if (!PreviewComponent) {
    return (
      <div className="flex min-h-[260px] w-full items-center justify-center rounded-2xl border border-[rgb(var(--border)/0.14)] bg-[rgb(var(--surface)/0.55)] p-5">
        <p className="animate-pulse text-sm text-slate-400">Compiling with Babel...</p>
      </div>
    );
  }

  return (
    <ErrorBoundary fallback={ErrorFallback}>
      <PreviewComponent />
    </ErrorBoundary>
  );
}
