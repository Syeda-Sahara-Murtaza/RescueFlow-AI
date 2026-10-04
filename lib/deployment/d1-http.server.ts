/** D1's prepared-statement subset used by RescueFlow's existing state API. */
type Parameter = string | number | null;
type Row = Record<string, unknown>;
type QueryResult<T = Row> = {
  success: boolean;
  results: T[];
  meta: { changes?: number };
};
type Settings = {
  accountId?: string;
  databaseId?: string;
  apiToken?: string;
};

export function createD1HttpDatabase(
  settings: () => Settings,
  request: typeof fetch = (...args) => fetch(...args),
) {
  async function query<T>(sql: string, params: Parameter[]): Promise<QueryResult<T>> {
    const { accountId, databaseId, apiToken } = settings();
    if (!accountId || !/^[a-f0-9]{32}$/i.test(accountId) ||
        !databaseId || !/^[a-f0-9-]{36}$/i.test(databaseId) || !apiToken) {
      throw new Error("D1 connection is not configured. Set CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_D1_DATABASE_ID, and CLOUDFLARE_D1_API_TOKEN on the server.");
    }

    // Values remain SQL parameters. Nothing is interpolated into SQL, cached,
    // exposed to the browser, or retried after an uncertain write result.
    const response = await request(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/d1/database/${databaseId}/query`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${apiToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ sql, params: params.map(value => typeof value === "number" ? String(value) : value) }),
        cache: "no-store",
        redirect: "error",
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!response.ok) throw new Error(`D1 request failed (HTTP ${response.status}).`);
    const body = await response.json() as {
      success?: boolean;
      result?: QueryResult<T>[];
    };
    const result = body.result?.[0];
    if (!body.success || !result?.success || !Array.isArray(result.results) || !result.meta) {
      // Provider error bodies may contain SQL and report data; do not log them.
      throw new Error("D1 could not complete the database operation.");
    }
    return result;
  }

  function statement(sql: string, params: Parameter[] = []) {
    return {
      bind(...values: Parameter[]) { return statement(sql, values); },
      async first<T = Row>(column?: string): Promise<T | null> {
        const result = await query<Row>(sql, params);
        const row = result.results[0];
        return (row ? (column ? row[column] : row) : null) as T | null;
      },
      async run<T = Row>() { return query<T>(sql, params); },
      async all<T = Row>() { return query<T>(sql, params); },
    };
  }
  return { prepare: (sql: string) => statement(sql) };
}
