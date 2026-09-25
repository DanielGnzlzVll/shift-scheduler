import { APP_TITLE } from '../core/index.js';

export function renderApp(root) {
  const heading = document.createElement('h1');
  heading.textContent = APP_TITLE;
  root.replaceChildren(heading);
}
