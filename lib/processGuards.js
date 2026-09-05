// Node terminates the process on an unhandled promise rejection, and on an
// uncaught exception. Neither Pulse process is supervised — nothing restarts
// them — so one stray rejection in a timer or a callback takes the backend or
// the poller down for good, mid-demo, usually from something that never
// touched the request that mattered.
//
// Both are logged loudly and survived rather than exited.
//
// That is a deliberate trade, not an oversight. The standard advice for
// uncaughtException is to exit, because process state afterwards is
// unknowable. It's the right advice when something will restart you; here,
// exiting just means staying down. Once these run under a supervisor
// (Railway, systemd, pm2), pass exitOnUncaught: true and take the strict path.
export function installProcessGuards(name, { exitOnUncaught = false } = {}) {
  process.on('unhandledRejection', (reason) => {
    console.error(`[${name}] unhandled promise rejection (kept running):`, reason);
  });

  process.on('uncaughtException', (err) => {
    console.error(`[${name}] uncaught exception:`, err);
    if (exitOnUncaught) {
      console.error(`[${name}] exiting so a supervisor can restart it`);
      process.exit(1);
    }
    console.error(`[${name}] kept running — state may be unreliable, restart when convenient`);
  });
}
