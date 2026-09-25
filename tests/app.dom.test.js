import { describe, expect, it } from 'vitest';
import { renderApp } from '../src/ui/app.js';

describe('renderApp', () => {
  it('renders the placeholder heading', () => {
    const root = document.createElement('div');
    renderApp(root);
    expect(root.querySelector('h1').textContent).toBe('Cuadro de Turnos');
  });
});
