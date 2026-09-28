import type { CommerceRepository, State } from "./contratos";
import { products, coupons, rooms } from "../datos/datos-demo";
import { DomainError } from "../modelos/dominio";
export class DemoRepository implements CommerceRepository {
  private state: State = {
    products: structuredClone(products),
    rooms: structuredClone(rooms),
    coupons: structuredClone(coupons),
    users: [],
    credentials: {},
    session: null,
    carts: { guest: { items: [], coupon: "" } },
    favorites: { guest: [] },
    orders: [],
    resets: {},
    subscriptions: [],
  };
  private queue: Promise<unknown> = Promise.resolve();
  constructor(
    private online: () => boolean = () => true,
    private latency = 120,
  ) {}
  private async check() {
    if (this.latency) await new Promise((r) => setTimeout(r, this.latency));
    if (!this.online())
      throw new DomainError("Sin conexión. Comprueba tu red y vuelve a intentarlo.", "network");
  }
  async read() {
    await this.check();
    await this.queue;
    return structuredClone(this.state);
  }
  transaction<T>(action: (state: State) => T | Promise<T>, _write = true): Promise<T> {
    const operation = this.queue.then(async () => {
      await this.check();
      const draft = structuredClone(this.state);
      const result = await action(draft);
      this.state = draft;
      return structuredClone(result);
    });
    this.queue = operation.catch(() => {});
    return operation;
  }
}
