import { formText } from '../modelos/formularios';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useShop } from '../controladores/usar-tienda';
import { shop } from '../controladores/cliente';
import { Field, go } from './interfaz';
export function AuthPage({ route }: { route: string }) {
  const { act, busy } = useShop(),
    [recovery, setRecovery] = useState<string | null>(null);
  const path = route.split('?')[0],
    register = path === '/registro',
    recover = path === '/recuperar',
    reset = path === '/restablecer',
    params = new URLSearchParams(route.split('?')[1]);
  const next = params.get('next') === 'checkout' ? '/checkout' : '/cuenta';
  return (
    <section className="auth-layout wrap">
      <div className="auth-photo">
        <img
          src="/recursos/tech/hero-setup.svg"
          alt="Setup NexaTech"
          width={960}
          height={1280}
        />
        <div>
          <p className="eyebrow">BIENVENIDO A TU ESPACIO</p>
          <h2>
            Tus equipos.
            <br />
            Tu historial tech.
          </h2>
        </div>
      </div>
      <div className="auth-form">
        <p className="eyebrow">MI NEXATECH</p>
        <h1>
          {register
            ? 'Crea tu perfil tech.'
            : recover
              ? 'Volvamos a encontrarnos.'
              : reset
                ? 'Una nueva contraseña.'
                : 'Qué bueno tenerte aquí.'}
        </h1>
        <p>
          {register
            ? 'Crea tu cuenta y guarda equipos, accesorios y direcciones.'
            : recover
              ? 'Te acompañamos a recuperar tu acceso.'
              : 'Entra a tu cuenta y continúa donde lo dejaste.'}
        </p>
        <p className="notice">
          Crea una cuenta para guardar favoritos, direcciones y consultar tus pedidos. Usa una contraseña segura que no compartas.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const d = new FormData(e.currentTarget);
            if (recover) {
              const token = await act(() =>
                shop.auth.recover(formText(d, 'email')),
              );
              if (token !== undefined) setRecovery(token);
              return;
            }
            if (reset) {
              const ok = await act(async () => {
                await shop.auth.reset(
                  params.get('token') || '',
                  formText(d, 'password'),
                );
                return true;
              }, 'Contraseña actualizada. Inicia sesión.');
              if (ok) go('/login');
              return;
            }
            const data = {
              name: d.get('name'),
              email: d.get('email'),
              password: d.get('password'),
              consent: d.get('consent') === 'on',
            };
            const user = await act(
              () =>
                register ? shop.auth.register(data) : shop.auth.login(data),
              register ? 'Cuenta creada.' : 'Has iniciado sesión.',
            );
            if (user) go(next);
          }}
        >
          {register && (
            <Field
              label="Nombre completo"
              name="name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={100}
            />
          )}{' '}
          {!reset && (
            <Field
              label="Correo electrónico"
              name="email"
              autoComplete="email"
              type="email"
              required
            />
          )}
          {!recover && (
            <Field
              label="Contraseña"
              name="password"
              autoComplete={
                register || reset ? 'new-password' : 'current-password'
              }
              type="password"
              minLength={register || reset ? 10 : 1}
              maxLength={128}
              required
            />
          )}
          {register && (
            <label className="check">
              <input name="consent" type="checkbox" required /> Acepto las
              condiciones de compra.
            </label>
          )}
          <button disabled={busy} className="button full">
            {busy
              ? 'Un momento…'
              : register
                ? 'Crear mi cuenta'
                : recover
                  ? 'Recuperar acceso'
                  : reset
                    ? 'Guardar contraseña'
                    : 'Entrar'}
            <ArrowRight size={17} />
          </button>
        </form>
        {recovery !== null && (
          <div className="notice">
            <p>
              Si existe una cuenta, recibirás las instrucciones de recuperación.
              Si el correo externo no está conectado, el mensaje quedará disponible en la bandeja local del sistema.
            </p>
            {recovery && (
              <a className="text-link" href={'/restablecer?token=' + recovery}>
                Abrir enlace de recuperación
              </a>
            )}
            {!recovery && (
              <a
                className="text-link"
                href="/dev/mail"
                target="_blank"
                rel="noreferrer"
              >
                Abrir bandeja local de correo
              </a>
            )}
          </div>
        )}
        {!register && !recover && !reset && (
          <a className="text-link" href="/recuperar">
            Olvidé mi contraseña
          </a>
        )}
        <p>
          {register || recover || reset ? (
            <a href={'/login' + (next === '/checkout' ? '?next=checkout' : '')}>
              Volver a iniciar sesión
            </a>
          ) : (
            <>
              ¿Aún no tienes cuenta?{' '}
              <a
                href={
                  '/registro' + (next === '/checkout' ? '?next=checkout' : '')
                }
              >
                Regístrate
              </a>
            </>
          )}
        </p>
      </div>
    </section>
  );
}
