import { auth } from '../../lib/auth.js';
export const POST = (req) => auth.verify(req);
