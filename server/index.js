import 'dotenv/config';
import { app } from './app.js';
import { installProcessGuards } from '../lib/processGuards.js';

// Express already funnels request-path errors into the handler in app.js. This
// covers everything outside it — a rejection in a timer, a callback, a pool
// event — which would otherwise end the process without touching a request.
//
// Exit on an uncaught exception only where something will restart us. Railway
// injects RAILWAY_ENVIRONMENT into every deploy, so this is strict in
// production and lenient on a laptop, where exiting would just mean staying
// down. Nothing to remember to configure, and nothing to forget.
const SUPERVISED = Boolean(process.env.RAILWAY_ENVIRONMENT);
installProcessGuards('server', { exitOnUncaught: SUPERVISED });

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[server] listening on :${PORT}`));
