/**
 * Express 5 type helpers.
 *
 * In Express 5, `req.params[k]` and `req.query[k]` are typed as
 * `string | string[] | undefined`. Most route handlers expect strings;
 * these helpers normalize that for us.
 */

export function str(v: unknown): string | undefined {
  if (Array.isArray(v)) {
    const first = v[0];
    return typeof first === 'string' ? first : undefined;
  }
  return typeof v === 'string' ? v : undefined;
}

export function requireStr(v: unknown, name = 'value'): string {
  const s = str(v);
  if (s === undefined) {
    throw new Error(`Expected string for ${name}`);
  }
  return s;
}
