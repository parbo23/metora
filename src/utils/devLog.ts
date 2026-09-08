/**
 * Development-only logging. Compiled out of production bundles by the __DEV__
 * check. Callers must pass counts and names, never tag values, coordinates or
 * file names, so even development logs cannot leak photo metadata.
 */
export function devLog(message: string, detail?: unknown): void {
  if (!__DEV__) return;
  if (detail === undefined) {
    console.log(`[Metora] ${message}`);
  } else {
    console.log(`[Metora] ${message}`, detail);
  }
}
