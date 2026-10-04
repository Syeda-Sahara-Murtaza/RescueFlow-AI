# Deploy RescueFlow AI

The same application can run on Cloudflare Workers or Vercel. Both use the
existing D1 `demo_sessions` schema. The interface, geocoding, analysis,
human-approval gates, and mission transitions use the same source code.

## Cloudflare Workers

The repository is already connected to the Worker named `rescueflow-ai`.
`wrangler.jsonc` preserves the database configuration supplied in this repository:

- Binding: `DB`
- Database: `rescueflow-ai-db`
- Database ID: `89657f71-c9a9-4645-9b14-043dc2211f83`

In **Workers & Pages → rescueflow-ai → Settings → Build**, use:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Root directory | Repository root |
| Build command | `pnpm run build` |
| Deploy command | `pnpm run deploy:cloudflare` |
| Node version | 24 |
| Package manager | The repository pins pnpm 11.25.0 |

Workers Builds installs dependencies before the build. For a manual clean
checkout, run `pnpm install --frozen-lockfile` first. Use **Workers**, because
this app has a server and database; it is not a static Pages upload.

The deploy script applies pending D1 migrations before publishing the built
Worker. Its Cloudflare build token needs **D1 Edit/Write** for the account that
owns the database, in addition to its Worker deployment permissions. If the
default build token cannot run D1 migrations, update that token's permissions
in Cloudflare. Do not commit a token to GitHub.

If `demo_sessions` was previously created manually, inspect its schema and
migration history before applying the initial migration. Do not delete the
table or existing records to work around a migration error.

For local testing (no remote database writes):

```sh
pnpm run build
pnpm run db:migrate:local
pnpm start
```

`pnpm run check:cloudflare` validates the deployable output without publishing.
After building, `dist/server/wrangler.json` contains the generated Worker entry
and static assets configuration. Never upload only `dist/client`.

## Vercel

Import `Syeda-Sahara-Murtaza/RescueFlow-AI` from GitHub in Vercel. Keep the root
directory at the repository root and select Node.js 24. The checked-in
`vercel.json` selects Next.js, a frozen pnpm install, and `pnpm run build:vercel`.
It runs the existing app through Next.js instead of the Cloudflare build output.

Add the following values under the project's **Environment Variables** before
deploying. These variables must remain server-side (no `NEXT_PUBLIC_` prefix):

| Variable | Value |
| --- | --- |
| `CLOUDFLARE_ACCOUNT_ID` | `96b879d1e8aa61b949c70769f6601da5` |
| `CLOUDFLARE_D1_DATABASE_ID` | `89657f71-c9a9-4645-9b14-043dc2211f83` |
| `CLOUDFLARE_D1_API_TOKEN` | A Cloudflare API token with D1 Edit/Write restricted to the database's account |
| `OPENAI_API_KEY` | Optional; enables the existing live AI analysis |

The account ID comes from the repository's existing Cloudflare build link;
the database ID comes from its existing configuration. Confirm that both still
identify your intended account/database if you move or fork this repository.

The Node server adapter sends parameterized SQL to Cloudflare's D1 API. The
token is kept in server code and is never sent to the browser. Cloudflare
deployments continue using the native D1 binding and do not need this token.
Database migrations must be applied once through Cloudflare before Vercel can
save reports. Builds can succeed without secrets; the running reporting API
requires the D1 variables and migrated database.

Each host uses its own browser session cookie. Sharing a database does not
make the same browser session automatically appear across different domains.

For a local Vercel-style production preview, set the server variables in your
shell or an ignored `.env.local`, then run:

```sh
pnpm run build:vercel
pnpm run start:vercel
```

## AI configuration

On Cloudflare, add `OPENAI_API_KEY` as a **runtime secret** under the Worker's
Variables and Secrets. On Vercel, add it as a server environment variable.
Secrets configured in ChatGPT Sites are not automatically transferred to
either external host. Without a working AI key, the existing deterministic
fallback remains available. A database connection is still required.

## Verification

```sh
pnpm run check:vercel-storage
node scripts/check-rescue-api.mjs --vercel-adapter
node scripts/check-rescue-api.mjs
node scripts/check-emergency-map.mjs
```

The adapter tests use a local SQLite-backed D1 API fixture, never production
data. After deployment, open the home page, launch the platform, submit a
clearly labeled test report with a city and country, verify its red map pin
and popup, reload, and approve a generated mission. Remove your test report
through the existing workspace controls when finished.

## References

- [Cloudflare Workers build settings](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/)
- [D1 migrations](https://developers.cloudflare.com/d1/reference/migrations/)
- [D1 query API](https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/query/)
- [Vercel project configuration](https://vercel.com/docs/project-configuration)
