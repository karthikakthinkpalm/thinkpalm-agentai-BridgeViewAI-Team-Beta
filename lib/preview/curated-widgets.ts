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
  if (CURATED_WIDGET_NAMES.has(canonical) || CURATED_WIDGET_NAMES.has(widgetName)) return true;

  const n = widgetName.toLowerCase();
  if (/\b(fuel|bunker|hfo|mdo|tank)\b/.test(n)) return true;
  if (/\b(voyage|route|ais|gps)\b/.test(n) && !/\b(crew|engine)\b/.test(n)) return true;
  if (/\b(crew|cert|roster|stcw)\b/.test(n)) return true;
  if (/\b(alert|alarm)\b/.test(n)) return true;
  if (/\b(engine|rpm|machinery)\b/.test(n)) return true;
  if (/\b(sensor|stream|timeseries|trend)\b/.test(n)) return true;
  return false;
}

export function pickCuratedPreview(
  widgetName: string,
  previewMap: Record<string, ComponentType>
): ComponentType | null {
  const canonical = normalizeWidgetName(widgetName);

  // Exact canonical match first — avoids two widgets collapsing to the same regex bucket
  if (previewMap[canonical]) return previewMap[canonical];
  if (previewMap[widgetName]) return previewMap[widgetName];

  if (STREAM_WIDGETS.has(canonical)) return previewMap.SensorStreamPanel ?? null;
  if (FUEL_WIDGETS.has(canonical)) return previewMap.FuelGaugeCards ?? null;
  if (AIS_WIDGETS.has(canonical)) return previewMap.AISLiveFeed ?? null;
  if (GPS_WIDGETS.has(canonical)) return previewMap.GPSTracker ?? null;
  if (VOYAGE_WIDGETS.has(canonical)) return previewMap.VoyageProgressTracker ?? null;
  if (CREW_WIDGETS.has(canonical)) return previewMap.CrewCertificationStatus ?? null;
  if (ALERT_WIDGETS.has(canonical)) return previewMap.AlertPanel ?? null;
  if (canonical === 'EngineMonitor') return previewMap.EngineMonitor ?? null;
  if (canonical === 'KPIDashboard') return previewMap.KPIDashboard ?? null;
  if (canonical === 'WeatherWidget') return previewMap.WeatherWidget ?? null;

  const n = widgetName.toLowerCase();
  if (/\b(sensor|stream|timeseries|trend|sog|speed)\b/.test(n)) {
    return previewMap.SensorStreamPanel ?? null;
  }
  if (/\b(fuel|bunker|hfo|mdo|tank)\b/.test(n)) {
    return previewMap.FuelGaugeCards ?? null;
  }
  if (/\b(voyage|route|ais|gps|progress)\b/.test(n) && !/\b(crew|engine)\b/.test(n)) {
    return previewMap.VoyageProgressTracker ?? null;
  }
  if (/\b(crew|cert|stcw|roster)\b/.test(n)) {
    return previewMap.CrewCertificationStatus ?? null;
  }
  if (/\b(alert|alarm)\b/.test(n)) {
    return previewMap.AlertPanel ?? null;
  }
  if (/\b(engine|rpm|machinery)\b/.test(n)) {
    return previewMap.EngineMonitor ?? null;
  }

  return null;
}

/** Resolve preview component identity for deduplication. */
export function previewIdentity(widgetName: string): string {
  const canonical = normalizeWidgetName(widgetName);
  if (STREAM_WIDGETS.has(canonical) || /\b(sensor|stream|sog|speed)\b/i.test(widgetName)) {
    return 'SensorStreamPanel';
  }
  if (FUEL_WIDGETS.has(canonical) || /\b(fuel|bunker|tank|hfo|mdo)\b/i.test(widgetName)) {
    return 'FuelGaugeCards';
  }
  if (AIS_WIDGETS.has(canonical)) return 'AISLiveFeed';
  if (GPS_WIDGETS.has(canonical)) return 'GPSTracker';
  if (VOYAGE_WIDGETS.has(canonical)) return 'VoyageProgressTracker';
  if (CREW_WIDGETS.has(canonical)) return 'CrewCertificationStatus';
  if (ALERT_WIDGETS.has(canonical)) return 'AlertPanel';
  if (canonical === 'EngineMonitor') return 'EngineMonitor';
  if (canonical === 'KPIDashboard') return 'KPIDashboard';
  if (canonical === 'WeatherWidget') return 'WeatherWidget';
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
