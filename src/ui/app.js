import { validateConfig } from '../core/config.js';
import { APP_TITLE } from '../core/index.js';
import { randomSeed } from '../core/random.js';
import { defaultSeed, generateSchedule } from '../core/scheduler.js';
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

const fileInput = (accept, onBuffer) =>
  el('input', {
    type: 'file',
    accept,
    onChange: async (e) => {
      const file = e.target.files[0];
      if (file) onBuffer(await file.arrayBuffer());
    },
  });

function renderStatus(box, { error = null, summary = '', items = [] }) {
  box.replaceChildren(
    error ? el('p', { className: 'error' }, error) : el('p', {}, summary),
    items.length ? el('ul', {}, items.map((i) => el('li', {}, i))) : null,
  );
}

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
      const { config, error } = parseConfigJson(await file.text());
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
          onClick: () => downloadBytes(new TextEncoder().encode(serializeConfig(state.config)), 'configuracion_turnos.json', 'application/json'),
        },
        'Exportar configuración',
      ),
      el('button', { type: 'button', onClick: () => importInput.click() }, 'Importar configuración'),
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
      fileInput('.xlsx,.xls,.csv', (buffer) => controller.loadPeople(buffer)),
      el('button', { type: 'button', onClick: () => downloadBytes(buildPeopleTemplate(), 'plantilla_personas.xlsx', XLSX_MIME) }, 'Descargar plantilla'),
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
      fileInput('.xlsx,.xls,.csv', (buffer) => controller.loadExceptions(buffer)),
      el('button', { type: 'button', onClick: () => downloadBytes(buildExceptionsTemplate(), 'plantilla_excepciones.xlsx', XLSX_MIME) }, 'Descargar plantilla'),
    ),
    exceptionsStatus,
  );

  const generateButton = el('button', { type: 'button', className: 'primary', onClick: () => controller.generate(defaultSeed(state.config)) }, 'Generar');
  const regenerateButton = el('button', { type: 'button', onClick: () => controller.generate(randomSeed()) }, 'Regenerar');
  const downloadButton = el(
    'button',
    {
      type: 'button',
      onClick: () =>
        downloadBytes(
          buildScheduleWorkbook(state.result, state.context.config, state.context.people),
          scheduleFileName(state.context.config),
          XLSX_MIME,
        ),
    },
    'Descargar Excel',
  );
  const seedLabel = el('span', { className: 'seed' });
  const warningsBox = el('div');
  const gridBox = el('div');
  const reportBox = el('div');
  const resultSection = el(
    'section',
    { className: 'card' },
    el('h2', {}, '4. Resultado'),
    el('div', { className: 'tools' }, generateButton, regenerateButton, downloadButton, seedLabel),
    warningsBox,
    gridBox,
    reportBox,
  );

  root.replaceChildren(
    el('header', {}, el('h1', {}, APP_TITLE), el('p', {}, 'Genera el cuadro de turnos del mes a partir de una lista de nombres. Todo se procesa en tu navegador; ningún dato sale de tu equipo.')),
    notice,
    configSection,
    peopleSection,
    exceptionsSection,
    resultSection,
  );

  function refreshButtons() {
    const ready = state.configValid && state.people.length > 0;
    generateButton.disabled = !ready;
    regenerateButton.disabled = !ready || !state.result;
    downloadButton.disabled = !state.result;
  }

  function parseExceptions() {
    if (!state.exceptionsBuffer) return;
    const { exceptions, rowErrors, error } = readExceptions(state.exceptionsBuffer, state.people);
    if (error) {
      renderStatus(exceptionsStatus, { error });
      return;
    }
    state.exceptions = exceptions;
    state.exceptionErrors = rowErrors.map((e) => `Excepciones, fila ${e.row}: ${e.reason}`);
    renderStatus(exceptionsStatus, { summary: `${exceptions.length} excepciones cargadas.`, items: state.exceptionErrors });
  }

  const controller = {
    loadPeople(buffer) {
      const { people, warnings, error } = readPeople(buffer);
      if (error) {
        renderStatus(peopleStatus, { error });
        return;
      }
      state.people = people;
      state.peopleWarnings = warnings;
      renderStatus(peopleStatus, { summary: `${people.length} personas: ${people.join(', ')}`, items: warnings });
      parseExceptions();
      refreshButtons();
    },
    loadExceptions(buffer) {
      state.exceptionsBuffer = buffer;
      parseExceptions();
    },
    generate(seed) {
      if (!state.configValid || !state.people.length) return null;
      const context = { config: clone(state.config), people: [...state.people], exceptions: [...state.exceptions] };
      const result = generateSchedule({ ...context, seed });
      state.result = result;
      state.context = context;
      seedLabel.textContent = `Semilla: ${seed}`;
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
