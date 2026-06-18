import type { ComponentType } from 'react';
import { normalizeWidgetName } from '@/lib/tools/widget-mapper';

/** Maritime widgets that use curated graphical previews instead of LLM tabular output. */
export const CURATED_WIDGET_NAMES = new Set([
  'VoyageProgressTracker',
  'VoyageTracker',
  'FuelGaugeCards',
  'FuelAnalytics',
  'CrewCertificationStatus',
  'CrewPanel',
  'AlertPanel',
  'AlertCenter',
  'EngineMonitor',
  'SensorStreamPanel',
  'AISLiveFeed',
  'GPSTracker',
  'KPIDashboard',
  'WeatherWidget',
]);

const FUEL_WIDGETS = new Set(['FuelGaugeCards', 'FuelAnalytics']);
const VOYAGE_WIDGETS = new Set(['VoyageProgressTracker', 'VoyageTracker']);
const AIS_WIDGETS = new Set(['AISLiveFeed']);
const GPS_WIDGETS = new Set(['GPSTracker']);
const CREW_WIDGETS = new Set(['CrewCertificationStatus', 'CrewPanel']);
const ALERT_WIDGETS = new Set(['AlertPanel', 'AlertCenter']);
const STREAM_WIDGETS = new Set(['SensorStreamPanel']);

export function shouldUseCuratedPreview(widgetName: string): boolean {
  const canonical = normalizeWidgetName(widgetName);
  return CURATED_WIDGET_NAMES.has(canonical) || CURATED_WIDGET_NAMES.has(widgetName);
}

export function pickCuratedPreview(
  widgetName: string,
  previewMap: Record<string, ComponentType<any>>
): ComponentType<any> | null {
  const canonical = normalizeWidgetName(widgetName);

  // Exact canonical match only
  if (previewMap[canonical]) return previewMap[canonical];
  if (previewMap[widgetName]) return previewMap[widgetName];

  return null;
}

/** Resolve preview component identity for deduplication. */
export function previewIdentity(widgetName: string): string {
  const canonical = normalizeWidgetName(widgetName);
  return canonical;
}

export function dedupePreviewWidgets(widgets: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const w of widgets) {
    const id = previewIdentity(w);
    if (seen.has(id)) continue;
    seen.add(id);
    result.push(normalizeWidgetName(w));
  }
  return result;
}
