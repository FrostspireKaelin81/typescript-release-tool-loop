export type ReleaseState = "ready" | "blocked";

export function decideRelease(buildPassed: boolean, diagnostics: string[]): { state: ReleaseState; reason: string } {
  if (!buildPassed) return { state: "blocked", reason: "build failed" };
  if (diagnostics.length > 0) return { state: "blocked", reason: diagnostics[0] };
  return { state: "ready", reason: "build passed with no diagnostics" };
}
