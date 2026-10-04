import "server-only";
import { createD1HttpDatabase } from "./d1-http.server";

// Next.js replaces cloudflare:workers only in its server bundle. The existing
// API and its revision checks use the same SQL and schema on both platforms.
const database = createD1HttpDatabase(() => ({
  accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
  databaseId: process.env.CLOUDFLARE_D1_DATABASE_ID,
  apiToken: process.env.CLOUDFLARE_D1_API_TOKEN,
}));

export const env = {
  get DB() { return database; },
  get OPENAI_API_KEY() { return process.env.OPENAI_API_KEY; },
};
