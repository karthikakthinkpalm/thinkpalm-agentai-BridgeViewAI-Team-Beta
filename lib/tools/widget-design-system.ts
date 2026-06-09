import { getWidgetDesignSystemConfig } from './config-loader';

export const WIDGET_TEMPLATES = getWidgetDesignSystemConfig();

export const WIDGET_TYPE_KEYS = Object.keys(WIDGET_TEMPLATES);

/** Sync config lookup — returns template JSON or error object. */
export function getDesignSystemTemplateFromConfig(type: string): string {
  const template = WIDGET_TEMPLATES[type.toLowerCase()];
  if (!template) {
    return JSON.stringify({
      error: `Unknown widget type '${type}'. Available types: ${WIDGET_TYPE_KEYS.join(', ')}`,
      guidance: 'Fallback to default CardShell structure with generic flex layouts.',
    });
  }
  return JSON.stringify(template, null, 2);
}
