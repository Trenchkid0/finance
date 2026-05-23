/**
 * Server-side feature flags.
 *
 * Centralized so the UI can decide whether to show a feature without
 * importing the actual integration module (which may pull in heavy
 * dependencies). Plain env probes — refactor here if we move to a
 * config service later.
 */

export function isAIScanEnabled(): boolean {
  return !!process.env.DEEPSEEK_API_KEY;
}
