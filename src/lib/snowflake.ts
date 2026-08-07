import snowflake from 'snowflake-sdk';

let conn: snowflake.Connection | null = null;

async function getConn(): Promise<snowflake.Connection> {
  if (conn) return conn;
  const c = snowflake.createConnection({
    account: process.env.SNOWFLAKE_ACCOUNT!,
    username: process.env.SNOWFLAKE_USER!,
    password: process.env.SNOWFLAKE_PASSWORD!,
    warehouse: process.env.SNOWFLAKE_WAREHOUSE!,
    database: process.env.SNOWFLAKE_DATABASE || 'MARKED',
    schema: process.env.SNOWFLAKE_SCHEMA || 'PUBLIC',
  });
  conn = await new Promise((resolve, reject) =>
    c.connect((err, connected) => (err ? reject(err) : resolve(connected))));
  return conn!;
}

export async function sq<T = Record<string, unknown>>(
  sqlText: string,
  binds: (string | number | boolean | null)[] = [],
): Promise<T[]> {
  const c = await getConn();
  return new Promise((resolve, reject) =>
    c.execute({
      sqlText,
      binds: binds as snowflake.Binds,
      complete: (err, _stmt, rows) => (err ? reject(err) : resolve((rows ?? []) as T[])),
    }));
}
