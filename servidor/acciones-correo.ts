import type { ShopController } from '../codigo/controladores/controlador-tienda';
import type { EmailProvider } from './correo';
import { emailSchema } from '../codigo/modelos/dominio';
export class MailActions {
  constructor(
    private shop: ShopController,
    private provider: EmailProvider,
    private origin: string,
  ) {}
  async recover(email: string) {
    const address = emailSchema.parse(email);
    const token = await this.shop.auth.recover(address);
    if (token)
      await this.provider.send({
        to: address,
        subject: 'Recupera tu acceso a NexaTech',
        text:
          'Abre este enlace para cambiar tu contraseña. Vence en 15 minutos y solo puede utilizarse una vez.\n\n' +
          this.origin +
          '/restablecer?token=' +
          token +
          '\n\nSi no lo solicitaste, ignora este mensaje.',
        key: 'reset:' + token,
      });
    return '';
  }
  async subscribe(email: string, consent: boolean) {
    await this.shop.email.subscribe(email, consent);
    await this.provider.send({
      to: emailSchema.parse(email),
      subject: 'Bienvenido a la comunidad NexaTech',
      text: 'Gracias por unirte a NexaTech. Tu interés por tecnología, setups y novedades quedó registrado. Te avisaremos cuando publiquemos lanzamientos, ofertas y guías relevantes.',
      key: 'welcome:' + email.toLowerCase(),
    });
    return 'Tu suscripción quedó registrada.';
  }
  async order(id: string) {
    const order = await this.shop.orders.detail(id);
    await this.provider.send({
      to: order.email,
      subject: 'Tu pedido NexaTech ' + order.id.slice(0, 8),
      text:
        'Pedido: ' +
        order.id +
        '\nEstado: ' +
        order.status +
        '\nTotal: S/ ' +
        (order.totals.total / 100).toFixed(2) +
        '\nConsulta los detalles en ' +
        this.origin +
        '/pedido/' +
        order.id,
      key: 'order:' + order.id + ':' + order.status,
    });
  }
}

