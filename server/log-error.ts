// Postgres errors carry `detail` and `where`, which can quote row values such as guests' emails,
// so only the name, code, message and stack are logged.
export function logError(context: string, err: unknown) {
  if (!(err instanceof Error)) {
    console.error(`${context} failed: ${String(err)}`);
    return;
  }
  const code = (err as { code?: unknown }).code;
  const stack = err.stack?.split("\n").slice(1).join("\n");
  console.error(`${context} failed: ${err.name}${code ? ` [${code}]` : ""}: ${err.message}${stack ? `\n${stack}` : ""}`);
}
