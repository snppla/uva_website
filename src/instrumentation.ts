// Runs once when the server starts: apply database migrations and create the
// first admin account if none exists yet.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { PHASE_PRODUCTION_BUILD } = await import("next/constants");
  if (process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD) return;

  const { bootstrap } = await import("./db/bootstrap");
  await bootstrap();
}
