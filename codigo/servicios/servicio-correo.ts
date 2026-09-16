import type { CommerceRepository } from '../repositorios/contratos';
import { emailSchema, DomainError } from '../modelos/dominio';
export class DemoEmailService {
  constructor(private repository: CommerceRepository) {}
  async subscribe(email: string, consent: boolean) {
    if (!consent) throw new DomainError('Acepta la política de privacidad.');
    const value = emailSchema.parse(email);
    await this.repository.transaction((s) => {
      if (!s.subscriptions.includes(value)) s.subscriptions.push(value);
    });
    return 'Tu suscripción quedó registrada.';
  }
}
