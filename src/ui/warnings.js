import { el } from './dom.js';

export function renderWarnings(container, messages) {
  if (!messages.length) {
    container.replaceChildren(el('p', { className: 'ok' }, 'Sin advertencias: todos los turnos quedaron cubiertos.'));
    return;
  }
  container.replaceChildren(
    el('h3', {}, 'Advertencias'),
    el('ul', { className: 'warnings' }, messages.map((m) => el('li', {}, m))),
  );
}
