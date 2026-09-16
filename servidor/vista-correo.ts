export const mailPreviewScript = `
fetch('/api/dev/mail').then(r => {
  if (!r.ok) throw Error();
  return r.json();
}).then(messages => {
  const root = document.getElementById('messages');
  if (!messages.length) root.textContent = 'Todavía no hay mensajes. Solicita recuperar una cuenta o suscríbete al boletín.';
  messages.sort((a,b) => b.createdAt.localeCompare(a.createdAt)).forEach(m => {
    const article = document.createElement('article');
    for (const [tag,text] of [['h2',m.subject],['p',m.to+' · '+m.createdAt],['pre',m.text]]) {
      const el = document.createElement(tag); el.textContent = text; article.append(el);
    }
    for (const word of m.text.split(/\\s+/)) {
      if (!word.startsWith(location.origin+'/')) continue;
      try {
        const url = new URL(word);
        if (url.origin !== location.origin || !/^\\/(restablecer|pedido\\/[^/]+)$/.test(url.pathname)) continue;
        const link = document.createElement('a'); link.href = url.href; link.textContent = 'Abrir enlace de NexaTech'; article.append(link);
      } catch {}
    }
    root.append(article);
  });
}).catch(() => document.getElementById('messages').textContent = 'No se pudo cargar la bandeja. Vuelve a intentarlo.');
`;
