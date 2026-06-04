'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { PreviewContextData } from './parse-prd';
import { parsePrdForPreview } from './parse-prd';

const PreviewContext = createContext<PreviewContextData | null>(null);

export function PreviewProvider({
  prd,
  schema,
  children,
}: {
  prd: string;
  schema?: { domain?: string; layout?: string; priority?: string; widgets?: string[] } | null;
  children: ReactNode;
}) {
  const data = parsePrdForPreview(prd, schema);
  return <PreviewContext.Provider value={data}>{children}</PreviewContext.Provider>;
}

export function usePreviewData(): PreviewContextData {
  const ctx = useContext(PreviewContext);
  if (!ctx) return parsePrdForPreview('');
  return ctx;
}
