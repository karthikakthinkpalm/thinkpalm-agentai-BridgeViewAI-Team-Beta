const registry = new Map<string, string>();

export function checkExists(name: string): boolean {
  return registry.has(name);
}

export function registerComponent(name: string, code: string): void {
  registry.set(name, code);
}

export function getAllComponents(): Record<string, string> {
  return Object.fromEntries(registry);
}

export function injectComponents(components: Record<string, string>): void {
  for (const [name, code] of Object.entries(components)) {
    registry.set(name, code);
  }
}

export function clearRegistry(): void {
  registry.clear();
}