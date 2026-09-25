import * as XLSX from 'xlsx';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../src/ui/app.js';

const memoryStorage = () => {
  const data = {};
  return { getItem: (k) => data[k] ?? null, setItem: (k, v) => (data[k] = String(v)) };
};

const workbook = (rows) => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Hoja1');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
};

const button = (root, text) => [...root.querySelectorAll('button')].find((b) => b.textContent === text);

describe('renderApp', () => {
  it('renders all sections and disables generation until people are loaded', () => {
    const root = document.createElement('div');
    renderApp(root, { storage: memoryStorage() });
    expect(root.querySelector('h1').textContent).toBe('Cuadro de Turnos');
    expect([...root.querySelectorAll('h2')].map((h) => h.textContent)).toEqual([
      '1. Configuración',
      '2. Personas',
      '3. Excepciones (opcional)',
      '4. Resultado',
    ]);
    expect(button(root, 'Generar').disabled).toBe(true);
    expect(button(root, 'Descargar Excel').disabled).toBe(true);
  });

  it('loads people and exceptions, generates, and renders grid and report', () => {
    document.body.innerHTML = '';
    const root = document.createElement('div');
    document.body.append(root);
    const app = renderApp(root, { storage: memoryStorage() });

    app.loadPeople(workbook([['Nombre'], ['Ana'], ['Luis'], ['Marta'], ['Pedro'], ['Sofía'], ['Ana']]));
    expect(root.textContent).toContain('5 personas');
    expect(root.textContent).toContain('Nombre duplicado omitido: Ana');
    expect(button(root, 'Generar').disabled).toBe(false);

    app.loadExceptions(workbook([['nombre', 'inicio', 'fin'], ['Pedro', 'x', 'y']]));
    expect(root.textContent).toContain('Excepciones, fila 2: Fecha de inicio inválida');

    const result = app.generate(7);
    expect(result.seed).toBe(7);
    expect(root.textContent).toContain('Semilla: 7');
    expect(root.querySelectorAll('table.schedule tbody tr')).toHaveLength(5 + 2);
    expect(root.querySelectorAll('table.report tbody tr')).toHaveLength(5);
    expect(button(root, 'Descargar Excel').disabled).toBe(false);
    expect(button(root, 'Regenerar').disabled).toBe(false);
  });

  it('shows a file error without losing previous people', () => {
    const root = document.createElement('div');
    const app = renderApp(root, { storage: memoryStorage() });
    app.loadPeople(workbook([['Ana'], ['Luis']]));
    app.loadPeople(workbook([['Nombre']]));
    expect(root.textContent).toContain('El archivo no contiene nombres.');
    expect(button(root, 'Generar').disabled).toBe(false);
  });
});
