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

const fileInput = (accept, onBuffer, onError) =>
  el('input', {
    type: 'file',
    accept,
    onChange: async (e) => {
      const file = e.target.files[0];
      e.target.value = '';
      if (!file) return;
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

  let seedEdited = false;
  const seedInput = el('input', {
    type: 'number',
    name: 'seed',
    min: 0,
    step: 1,
    value: defaultSeed(state.config),
    onInput: () => (seedEdited = true),
  });
  const readSeed = () => {
    const seed = Number(seedInput.value);
    return seedInput.value !== '' && Number.isInteger(seed) && seed >= 0 ? seed : defaultSeed(state.config);
  };

  const configFormBox = el('div');
  const configSection = el('section', { className: 'card' }, configFormBox);
  const configForm = renderConfigForm(configFormBox, state.config, (config, validation) => {
    state.config = config;
    state.configValid = validation.valid;
    if (validation.valid) {
      saveConfig(config, storage);
      if (!seedEdited) seedInput.value = defaultSeed(config);
    }
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

  const generateButton = el('button', { type: 'button', className: 'primary', onClick: () => controller.generate(readSeed()) }, 'Generar');
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
  const seedLabel = el('span', { className: 'seed' });
  const seedField = el('label', { className: 'field' }, el('span', {}, 'Semilla'), seedInput);
  const warningsBox = el('div', { className: 'result-block' });
  const gridBox = el('div', { className: 'result-block' });
  const reportBox = el('div', { className: 'result-block' });
  const resultSection = el(
    'section',
    { className: 'card' },
    el('h2', {}, '4. Resultado'),
    el('div', { className: 'tools result-tools' }, seedField, generateButton, regenerateButton, downloadButton, seedLabel),
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
      el('p', {}, 'Genera el cuadro de turnos del mes a partir de una lista de nombres. Todo se procesa en tu navegador; ningún dato sale de tu equipo.'),
    ),
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
      seedInput.value = seed;
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
