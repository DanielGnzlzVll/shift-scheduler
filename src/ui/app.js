import { validateConfig } from '../core/config.js';
import { APP_TITLE } from '../core/index.js';
import { randomSeed } from '../core/random.js';
import { defaultSeed, generateSchedule } from '../core/scheduler.js';
import { formatDateTime } from '../core/time.js';
import { buildScheduleWorkbook, scheduleFileName } from '../io/exportSchedule.js';
import { readExceptions } from '../io/readExceptions.js';
import { readPeople } from '../io/readPeople.js';
import { buildExceptionsTemplate, buildPeopleTemplate } from '../io/templates.js';
import { renderConfigForm } from './configForm.js';
import { clone, el } from './dom.js';
import { downloadBytes } from './download.js';
import { renderReportTable } from './reportTable.js';
import { renderScheduleGrid } from './scheduleGrid.js';
import { loadConfig, parseConfigJson, saveConfig, serializeConfig } from './storage.js';
import { renderWarnings } from './warnings.js';

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

const READ_ERROR = 'No se pudo leer el archivo.';

const REPO_URL = 'https://github.com/DanielGnzlzVll/shift-scheduler';

export function buildInfo(commit = import.meta.env.VITE_BUILD_COMMIT, date = import.meta.env.VITE_BUILD_DATE) {
  if (!commit) return null;
  const built = date ? new Date(date) : null;
  return {
    commit,
    shortCommit: commit.slice(0, 7),
    url: `${REPO_URL}/commit/${commit}`,
    date:
      built && !Number.isNaN(built.getTime())
        ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' }).format(built)
        : null,
  };
}

const buildLine = (info) =>
  info
    ? el(
        'p',
        { className: 'build-info' },
        'Versión ',
        el('a', { href: info.url, target: '_blank', rel: 'noopener noreferrer' }, info.shortCommit),
        info.date ? ` · Compilado el ${info.date} (hora de Colombia)` : null,
      )
    : null;

const WHATSAPP_URL = `https://wa.me/573016131395?text=${encodeURIComponent('Hola, tengo una sugerencia para Cuadro de Turnos: ')}`;

const NO_FILE = 'Ningún archivo seleccionado';

const fileInput = (accept, onBuffer, onError) => {
  const fileName = el('span', { className: 'file-name' }, NO_FILE);
  const input = el('input', {
    type: 'file',
    accept,
    onChange: async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      fileName.textContent = file.name ?? NO_FILE;
      let buffer;
      try {
        buffer = await file.arrayBuffer();
      } catch {
        onError(READ_ERROR);
        return;
      }
      onBuffer(buffer);
    },
  });
  return el('label', { className: 'file-picker' }, input, el('span', { className: 'file-button' }, 'Seleccionar archivo'), fileName);
};

function renderStatus(box, { error = null, summary = '', table = null, items = [] }) {
  box.replaceChildren(
    ...[
      error ? el('p', { className: 'error' }, error) : null,
      summary ? el('p', {}, summary) : null,
      table,
      items.length ? el('ul', {}, items.map((i) => el('li', {}, i))) : null,
    ].filter(Boolean),
  );
}

const exceptionsTable = (exceptions) =>
  el(
    'table',
    { className: 'exceptions' },
    el('thead', {}, el('tr', {}, ['Persona', 'Inicio', 'Fin'].map((h) => el('th', {}, h)))),
    el(
      'tbody',
      {},
      exceptions.map((e) => el('tr', {}, el('td', {}, e.person), el('td', {}, formatDateTime(e.start)), el('td', {}, formatDateTime(e.end)))),
    ),
  );

export function renderApp(root, { storage = globalThis.localStorage } = {}) {
  const loaded = loadConfig(storage);
  const state = {
    config: loaded.config,
    configValid: validateConfig(loaded.config).valid,
    people: [],
    peopleWarnings: [],
    exceptionsBuffer: null,
    exceptions: [],
    exceptionErrors: [],
    result: null,
    context: null,
  };

  const notice = el('p', { className: 'notice', hidden: !loaded.notice }, loaded.notice ?? '');
  const showNotice = (text) => {
    notice.textContent = text;
    notice.hidden = !text;
  };

  const configFormBox = el('div');
  const configSection = el('section', { className: 'card' }, configFormBox);
  const configForm = renderConfigForm(configFormBox, state.config, (config, validation) => {
    state.config = config;
    state.configValid = validation.valid;
    if (validation.valid) saveConfig(config, storage);
    refreshButtons();
  });
  const importInput = el('input', {
    type: 'file',
    accept: '.json,application/json',
    hidden: true,
    onChange: async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
      let text;
      try {
        text = await file.text();
      } catch {
        return showNotice(READ_ERROR);
      }
      const { config, error } = parseConfigJson(text);
      if (error) return showNotice(error);
      showNotice('');
      configForm.setConfig(config);
    },
  });
  configSection.append(
    el(
      'div',
      { className: 'tools' },
      el(
        'button',
        {
          type: 'button',
          className: 'ghost',
          onClick: () => downloadBytes(new TextEncoder().encode(serializeConfig(state.config)), 'configuracion_turnos.json', 'application/json'),
        },
        'Exportar configuración',
      ),
      el('button', { type: 'button', className: 'ghost', onClick: () => importInput.click() }, 'Importar configuración'),
      importInput,
    ),
  );

  const peopleStatus = el('div', { className: 'status' });
  const peopleSection = el(
    'section',
    { className: 'card' },
    el('h2', {}, '2. Personas'),
    el('p', {}, 'Archivo de Excel con una sola hoja y los nombres en la primera columna.'),
    el(
      'div',
      { className: 'tools' },
      fileInput('.xlsx,.xls,.csv', (buffer) => controller.loadPeople(buffer), renderPeopleStatus),
      el('button', { type: 'button', className: 'ghost', onClick: () => downloadBytes(buildPeopleTemplate(), 'plantilla_personas.xlsx', XLSX_MIME) }, 'Descargar plantilla'),
    ),
    peopleStatus,
  );

  const exceptionsStatus = el('div', { className: 'status' });
  const exceptionsSection = el(
    'section',
    { className: 'card' },
    el('h2', {}, '3. Excepciones (opcional)'),
    el('p', {}, 'Columnas: nombre, inicio, fin. En ese intervalo no se asignarán turnos a la persona. Si el fin no tiene hora, se bloquea todo ese día.'),
    el(
      'div',
      { className: 'tools' },
      fileInput('.xlsx,.xls,.csv', (buffer) => controller.loadExceptions(buffer), renderExceptionsStatus),
      el('button', { type: 'button', className: 'ghost', onClick: () => downloadBytes(buildExceptionsTemplate(), 'plantilla_excepciones.xlsx', XLSX_MIME) }, 'Descargar plantilla'),
    ),
    exceptionsStatus,
  );

  const generateButton = el('button', { type: 'button', className: 'primary', onClick: () => controller.generate(defaultSeed(state.config)) }, 'Generar');
  const regenerateButton = el('button', { type: 'button', className: 'ghost', onClick: () => controller.generate(randomSeed()) }, 'Regenerar');
  const downloadButton = el(
    'button',
    {
      type: 'button',
      className: 'accent',
      onClick: () =>
        downloadBytes(
          buildScheduleWorkbook(state.result, state.context.config, state.context.people),
          scheduleFileName(state.context.config),
          XLSX_MIME,
        ),
    },
    'Descargar Excel',
  );
  const warningsBox = el('div', { className: 'result-block' });
  const gridBox = el('div', { className: 'result-block' });
  const reportBox = el('div', { className: 'result-block' });
  const resultSection = el(
    'section',
    { className: 'card' },
    el('h2', {}, '4. Resultado'),
    el('div', { className: 'tools result-tools' }, generateButton, regenerateButton, downloadButton),
    warningsBox,
    gridBox,
    reportBox,
  );

  root.replaceChildren(
    el(
      'header',
      { className: 'hero' },
      el('span', { className: 'eyebrow' }, 'Planificador mensual'),
      el('h1', {}, APP_TITLE),
      el('p', {}, 'Genera el cuadro de turnos del mes a partir de una lista de nombres.'),
      el(
        'p',
        { className: 'privacy' },
        'Nada queda guardado en nuestros servidores: todo se ejecuta localmente en tu navegador, por lo que su uso no incumple ninguna política de privacidad.',
      ),
    ),
    notice,
    configSection,
    peopleSection,
    exceptionsSection,
    resultSection,
    el(
      'footer',
      { className: 'site-footer' },
      el('p', {}, '¿Sugerencias o solicitudes? ', el('a', { href: WHATSAPP_URL, target: '_blank', rel: 'noopener noreferrer', className: 'whatsapp' }, 'Escríbeme por WhatsApp')),
      buildLine(buildInfo()),
    ),
  );

  function refreshButtons() {
    const ready = state.configValid && state.people.length > 0;
    generateButton.disabled = !ready;
    regenerateButton.disabled = !ready || !state.result;
    downloadButton.disabled = !state.result;
  }

  function renderPeopleStatus(error = null) {
    renderStatus(peopleStatus, {
      error,
      summary: state.people.length ? `${state.people.length} personas: ${state.people.join(', ')}` : '',
      items: state.peopleWarnings,
    });
  }

  function renderExceptionsStatus(error = null) {
    renderStatus(exceptionsStatus, {
      error,
      summary: state.exceptionsBuffer ? `${state.exceptions.length} excepciones cargadas.` : '',
      table: state.exceptions.length ? exceptionsTable(state.exceptions) : null,
      items: state.exceptionErrors,
    });
  }

  function applyExceptions(buffer) {
    const { exceptions, rowErrors, error } = readExceptions(buffer, state.people);
    if (error) {
      renderExceptionsStatus(error);
      return;
    }
    state.exceptionsBuffer = buffer;
    state.exceptions = exceptions;
    state.exceptionErrors = rowErrors.map((e) => `Excepciones, fila ${e.row}: ${e.reason}`);
    renderExceptionsStatus();
  }

  const controller = {
    loadPeople(buffer) {
      const { people, warnings, error } = readPeople(buffer);
      if (error) {
        renderPeopleStatus(error);
        return;
      }
      state.people = people;
      state.peopleWarnings = warnings;
      renderPeopleStatus();
      if (state.exceptionsBuffer) applyExceptions(state.exceptionsBuffer);
      refreshButtons();
    },
    loadExceptions(buffer) {
      applyExceptions(buffer);
    },
    generate(seed) {
      if (!state.configValid || !state.people.length) return null;
      const context = { config: clone(state.config), people: [...state.people], exceptions: [...state.exceptions] };
      const result = generateSchedule({ ...context, seed });
      state.result = result;
      state.context = context;
      renderWarnings(warningsBox, [...state.peopleWarnings, ...state.exceptionErrors, ...result.warnings]);
      renderScheduleGrid(gridBox, { result, config: context.config, people: context.people, exceptions: context.exceptions });
      renderReportTable(reportBox, result.report, context.config.shifts);
      refreshButtons();
      return result;
    },
  };

  refreshButtons();
  return controller;
}
