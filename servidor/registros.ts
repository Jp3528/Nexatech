import type { State } from "../codigo/repositorios/contratos";
export interface RecordRow {
  kind: string;
  key: string;
  data: unknown;
  position: number;
}
const arrays = ["products", "rooms", "coupons", "users", "orders", "subscriptions"] as const;
const maps = ["credentials", "carts", "favorites", "resets"] as const;
export function pack(s: State): RecordRow[] {
  const rows: RecordRow[] = [];
  for (const kind of arrays)
    s[kind].forEach((data, position) => {
      const key = typeof data === "string" ? data : "id" in data ? data.id : data.code;
      rows.push({ kind, key, data, position });
    });
  for (const kind of maps)
    for (const [key, data] of Object.entries(s[kind])) rows.push({ kind, key, data, position: 0 });
  return rows;
}
export function unpack(rows: RecordRow[]): State {
  const state: State = {
    products: [],
    rooms: [],
    coupons: [],
    users: [],
    orders: [],
    subscriptions: [],
    credentials: {},
    carts: {},
    favorites: {},
    resets: {},
    session: null,
  };
  for (const kind of arrays)
    (state as unknown as Record<string, unknown>)[kind] = rows
      .filter((r) => r.kind === kind)
      .sort((a, b) => a.position - b.position)
      .map((r) => r.data);
  for (const kind of maps)
    (state as unknown as Record<string, unknown>)[kind] = Object.fromEntries(
      rows.filter((r) => r.kind === kind).map((r) => [r.key, r.data]),
    );
  return state;
}
