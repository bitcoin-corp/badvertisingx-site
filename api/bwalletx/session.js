import { auth } from '../../lib/auth.js';
export const GET = (req) => auth.session(req);
