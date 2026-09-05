import 'dotenv/config';
import { app } from './app.js';
import { installProcessGuards } from '../lib/processGuards.js';

// Express already funnels request-path errors into the handler in app.js. This
// covers everything outside it — a rejection in a timer, a callback, a pool
// event — which would otherwise end the process without touching a request.
installProcessGuards('server');

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`[server] listening on :${PORT}`));
