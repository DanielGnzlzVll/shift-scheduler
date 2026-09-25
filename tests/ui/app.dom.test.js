import * as XLSX from 'xlsx';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultSeed } from '../../src/core/scheduler.js';
import { buildInfo, renderApp } from '../../src/ui/app.js';

const memoryStorage = () => {
  const data = {};
  return { getItem: (k) => data[k] ?? null, setItem: (k, v) => (data[k] = String(v)) };
};

const workbook = (rows) => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Hoja1');
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
};

const section = (root, index) => root.querySelectorAll('section')[index];
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function uploadFile(input, file) {
  let cleared = false;
  Object.defineProperty(input, 'files', { value: [file], configurable: true });
  Object.defineProperty(input, 'value', {
    configurable: true,
    get: () => '',
    set: (v) => {
      cleared ||= v === '';
    },
  });
  input.dispatchEvent(new Event('change'));
  return () => cleared;
}

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
    expect(root.querySelectorAll('table.schedule tbody tr')).toHaveLength(5 + 2);
    expect(root.querySelectorAll('table.report tbody tr')).toHaveLength(5);
    expect(button(root, 'Descargar Excel').disabled).toBe(false);
    expect(button(root, 'Regenerar').disabled).toBe(false);
  });

  it('never renders empty status parts as literal text', () => {
    const root = document.createElement('div');
    const app = renderApp(root, { storage: memoryStorage() });
    app.loadPeople(workbook([['Ana'], ['Luis']]));
    app.loadExceptions(workbook([['nombre', 'inicio', 'fin'], ['Ana', '2026-10-05', '2026-10-06']]));
    expect(root.textContent).not.toContain('null');
  });

  it('shows a file error without losing previous people', () => {
    const root = document.createElement('div');
    const app = renderApp(root, { storage: memoryStorage() });
    app.loadPeople(workbook([['Ana'], ['Luis']]));
    app.loadPeople(workbook([['Nombre']]));
    expect(root.textContent).toContain('El archivo no contiene nombres.');
    expect(button(root, 'Generar').disabled).toBe(false);
  });

  it('keeps the people summary visible next to a file error', () => {
    const root = document.createElement('div');
    const app = renderApp(root, { storage: memoryStorage() });
    app.loadPeople(workbook([['Ana'], ['Luis']]));
    app.loadPeople(workbook([['Nombre']]));
    const status = section(root, 1).querySelector('.status');
    expect(status.querySelector('.error').textContent).toBe('El archivo no contiene nombres.');
    expect(status.textContent).toContain('2 personas: Ana, Luis');
  });

  it('keeps the previous exceptions when a new exceptions file cannot be read', () => {
    const root = document.createElement('div');
    const app = renderApp(root, { storage: memoryStorage() });
    app.loadPeople(workbook([['Ana'], ['Luis']]));
    app.loadExceptions(workbook([['nombre', 'inicio', 'fin'], ['Ana', '2026-10-05 07:00', '2026-10-06']]));
    app.loadExceptions(new Uint8Array([0x50, 0x4b, 1, 2, 3]).buffer);
    const status = section(root, 2).querySelector('.status');
    expect(status.querySelector('.error').textContent).toBe('No se pudo leer el archivo.');
    expect(status.textContent).toContain('1 excepciones cargadas.');
    app.loadPeople(workbook([['Ana'], ['Luis']]));
    expect(status.querySelector('.error')).toBeNull();
    expect(status.querySelectorAll('table.exceptions tbody tr')).toHaveLength(1);
  });

  it('shows parsed exception rows and row errors', () => {
    const root = document.createElement('div');
    const app = renderApp(root, { storage: memoryStorage() });
    app.loadPeople(workbook([['Ana'], ['Luis']]));
    app.loadExceptions(
      workbook([
        ['nombre', 'inicio', 'fin'],
        ['Ana', '2026-10-05 07:00', '2026-10-06'],
        ['Luis', '2026-10-10 19:00', '2026-10-11 07:00'],
        ['Pedro', '2026-10-05', '2026-10-06'],
      ]),
    );
    const status = section(root, 2).querySelector('.status');
    expect([...status.querySelectorAll('table.exceptions thead th')].map((th) => th.textContent)).toEqual(['Persona', 'Inicio', 'Fin']);
    expect([...status.querySelectorAll('table.exceptions tbody tr')].map((tr) => [...tr.children].map((c) => c.textContent))).toEqual([
      ['Ana', '2026-10-05 07:00', '2026-10-07 00:00'],
      ['Luis', '2026-10-10 19:00', '2026-10-11 07:00'],
    ]);
    expect([...status.querySelectorAll('li')].map((li) => li.textContent)).toEqual(['Excepciones, fila 4: Nombre desconocido: Pedro']);
  });

  it('resets file inputs so the same file can be uploaded again', async () => {
    const root = document.createElement('div');
    renderApp(root, { storage: memoryStorage() });
    const input = section(root, 1).querySelector('input[type=file]');
    const file = { arrayBuffer: async () => workbook([['Ana'], ['Luis']]) };
    const cleared = uploadFile(input, file);
    await flush();
    expect(cleared()).toBe(true);
    expect(root.textContent).toContain('2 personas');
  });

  it('shows a read error when the browser cannot read the file', async () => {
    const root = document.createElement('div');
    renderApp(root, { storage: memoryStorage() });
    const file = { arrayBuffer: () => Promise.reject(new Error('denied')) };
    uploadFile(section(root, 1).querySelector('input[type=file]'), file);
    uploadFile(section(root, 2).querySelector('input[type=file]'), file);
    uploadFile(section(root, 0).querySelector('input[type=file]'), { text: () => Promise.reject(new Error('denied')) });
    await flush();
    expect(section(root, 1).querySelector('.error').textContent).toBe('No se pudo leer el archivo.');
    expect(section(root, 2).querySelector('.error').textContent).toBe('No se pudo leer el archivo.');
    expect(root.querySelector('.notice').textContent).toBe('No se pudo leer el archivo.');
    expect(root.querySelector('.notice').hidden).toBe(false);
  });

  it('labels file pickers and time fields in Spanish without native browser text', async () => {
    const root = document.createElement('div');
    renderApp(root, { storage: memoryStorage() });
    const picker = section(root, 1).querySelector('.file-picker');
    expect(picker.querySelector('.file-button').textContent).toBe('Seleccionar archivo');
    expect(picker.querySelector('.file-name').textContent).toBe('Ningún archivo seleccionado');
    expect(root.querySelector('input[type=time]')).toBeNull();
    expect(root.querySelector('[name="shifts.0.start"]').placeholder).toBe('HH:mm');

    uploadFile(picker.querySelector('input[type=file]'), { name: 'personas.xlsx', arrayBuffer: async () => workbook([['Ana']]) });
    await new Promise((r) => setTimeout(r, 0));
    expect(picker.querySelector('.file-name').textContent).toBe('personas.xlsx');
  });

  it('shows the privacy note and a WhatsApp link for suggestions', () => {
    const root = document.createElement('div');
    renderApp(root, { storage: memoryStorage() });
    expect(root.querySelector('.privacy').textContent).toContain('Nada queda guardado en nuestros servidores');
    const link = root.querySelector('footer a.whatsapp');
    expect(link.textContent).toBe('Escríbeme por WhatsApp');
    expect(link.getAttribute('href')).toMatch(/^https:\/\/wa\.me\/573016131395\?text=/);
    expect(link.getAttribute('target')).toBe('_blank');
    expect(link.getAttribute('rel')).toBe('noopener noreferrer');
  });

  it('formats build info with a short commit link and the build date in Colombia time', () => {
    const info = buildInfo('0123456789abcdef', '2026-09-25T20:40:00.000Z');
    expect(info.shortCommit).toBe('0123456');
    expect(info.url).toBe('https://github.com/DanielGnzlzVll/shift-scheduler/commit/0123456789abcdef');
    expect(info.date).toMatch(/15:40|3:40/);
    expect(buildInfo('', '2026-09-25T20:40:00.000Z')).toBeNull();
    expect(buildInfo('abc1234', 'not a date').date).toBeNull();
  });

  describe('seed', () => {
    afterEach(() => vi.restoreAllMocks());

    const scheduleHtml = (root) => root.querySelector('table.schedule').innerHTML;

    it('keeps the seed out of the UI', () => {
      const root = document.createElement('div');
      const app = renderApp(root, { storage: memoryStorage() });
      app.loadPeople(workbook([['Ana'], ['Luis'], ['Marta'], ['Pedro'], ['Sofía']]));
      button(root, 'Generar').click();
      expect(root.querySelector('input[name=seed]')).toBeNull();
      expect(root.textContent).not.toContain('Semilla');
    });

    it('generates reproducibly with the month seed and regenerates with a random one', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const root = document.createElement('div');
      const app = renderApp(root, { storage: memoryStorage() });
      app.loadPeople(workbook([['Ana'], ['Luis'], ['Marta'], ['Pedro'], ['Sofía']]));
      const year = Number(root.querySelector('input[name=year]').value);
      const month = Number(root.querySelector('select[name=month]').value);
      const expected = app.generate(defaultSeed({ year, month }));

      button(root, 'Generar').click();
      const first = scheduleHtml(root);
      expect(app.generate(defaultSeed({ year, month })).assignments).toEqual(expected.assignments);

      button(root, 'Regenerar').click();
      expect(scheduleHtml(root)).not.toBe(first);

      button(root, 'Generar').click();
      expect(scheduleHtml(root)).toBe(first);
    });
  });
});
