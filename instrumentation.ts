/**
 * Fail before the server accepts traffic if a passphrase is configured without
 * the secret that signs its session cookie.
 *
 * Next logs a thrown instrumentation error and can keep serving, so the
 * Node-only guard exits the process instead. A workspace that looks locked but
 * cannot verify a session is worse than a server that refuses to start.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { assertWorkspaceAuthConfigOrExit } = await import(
    "./lib/startup-check"
  );
  assertWorkspaceAuthConfigOrExit();
}
