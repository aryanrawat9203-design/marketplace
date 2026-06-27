export function buildQuery(
  base: Record<string, string | number | undefined>,
  overrides: Record<string, string | number | undefined> = {},
) {
  const merged = { ...base, ...overrides };
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(merged)) {
    if (v !== undefined && v !== null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}
