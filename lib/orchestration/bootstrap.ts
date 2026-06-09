import { registerPipelineAgents } from './agent-definitions';
import { registerPipelineTools } from './tool-definitions';

let bootstrapped = false;

/** Load all agent and tool definitions into the orchestration registry (idempotent). */
export function bootstrapOrchestration(): void {
  if (bootstrapped) return;
  registerPipelineAgents();
  registerPipelineTools();
  bootstrapped = true;
}
