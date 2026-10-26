import { assertWorkspaceAuthConfig } from "./workspace-auth";

/**
 * Node-only startup guard. Kept out of instrumentation.ts so the Edge build of
 * that file does not contain a Node.js API it cannot run.
 */
export function assertWorkspaceAuthConfigOrExit(): void {
  try {
    assertWorkspaceAuthConfig();
  } catch (error) {
    console.error(
      error instanceof Error
        ? error.message
        : "Workspace auth is misconfigured.",
    );
    process.exit(1);
  }
}
