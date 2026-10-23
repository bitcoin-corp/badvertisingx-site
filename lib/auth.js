import { createBwalletXAuth } from '@bwalletx/connect/next';
import { nonceStore } from './db.js';

export const auth = createBwalletXAuth({
  origin: process.env.APP_ORIGIN || 'https://badvertisingx.com',
  store: nonceStore,
});
