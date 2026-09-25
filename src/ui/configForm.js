import { MONTH_NAMES } from '../core/calendar.js';
import { DEFAULT_MAX_CONSECUTIVE, newShiftId, validateConfig } from '../core/config.js';
import { clone, el } from './dom.js';
import { helpButton } from './help.js';

const errorSlot = (field) => el('span', { className: 'error', dataset: { errorFor: field } });

function showErrors(container, errors) {
  const byField = new Map(errors.map((e) => [e.field, e.message]));
  for (const node of container.querySelectorAll('[data-error-for]')) {
    node.textContent = byField.get(node.dataset.errorFor) ?? '';
  }
}

export function renderConfigForm(container, initialConfig, onChange) {
  let config = clone(initialConfig);

  const emit = () => {
    const validation = validateConfig(config);
    showErrors(container, validation.errors);
    onChange(clone(config), validation);
  };

  const input = (name, value, apply, attrs = {}) =>
    el('input', {
      name,
      value,
      ...attrs,
      onInput: (e) => {
        apply(e.target.value);
        emit();
      },
    });
  const numberInput = (name, value, apply, attrs = {}) =>
    input(name, value, (v) => apply(v === '' ? NaN : Number(v)), { type: 'number', ...attrs });
  const cell = (control) => el('td', {}, control, errorSlot(control.name));
  const field = (label, control, help, className = 'field') =>
    el('label', { className }, el('span', { className: 'field-label' }, label, helpButton(help)), control, errorSlot(control.name));

  const render = () => {
    const rows = config.shifts.map((shift, i) =>
      el(
        'tr',
        {},
        cell(input(`shifts.${i}.name`, shift.name, (v) => (shift.name = v))),
        cell(input(`shifts.${i}.code`, shift.code, (v) => (shift.code = v), { maxlength: 3, size: 3 })),
        cell(input(`shifts.${i}.start`, shift.start, (v) => (shift.start = v), { inputmode: 'numeric', placeholder: 'HH:mm', maxlength: 5, size: 5, autocomplete: 'off' })),
        cell(input(`shifts.${i}.end`, shift.end, (v) => (shift.end = v), { inputmode: 'numeric', placeholder: 'HH:mm', maxlength: 5, size: 5, autocomplete: 'off' })),
        cell(numberInput(`shifts.${i}.requiredWeekday`, shift.requiredWeekday, (v) => (shift.requiredWeekday = v), { min: 0, step: 1 })),
        cell(numberInput(`shifts.${i}.requiredWeekend`, shift.requiredWeekend, (v) => (shift.requiredWeekend = v), { min: 0, step: 1 })),
        cell(numberInput(`shifts.${i}.maxConsecutive`, shift.maxConsecutive, (v) => (shift.maxConsecutive = v), { min: -1, max: 31, step: 1 })),
        el('td', {}, el('button', { type: 'button', className: 'ghost danger', onClick: () => { config.shifts.splice(i, 1); render(); emit(); } }, 'Eliminar')),
      ),
    );

    const monthSelect = el(
      'select',
      { name: 'month', onChange: (e) => { config.month = Number(e.target.value); emit(); } },
      MONTH_NAMES.map((name, index) => el('option', { value: index + 1, selected: index + 1 === config.month }, name)),
    );
    const overtime = el('input', {
      type: 'checkbox',
      name: 'allowOvertime',
      checked: config.allowOvertime,
      onChange: (e) => { config.allowOvertime = e.target.checked; emit(); },
    });

    container.replaceChildren(
      el('h2', {}, '1. Configuración'),
      el(
        'table',
        { className: 'shifts' },
        el(
          'thead',
          {},
          el(
            'tr',
            {},
            [
              ['Turno', 'shiftName'],
              ['Código', 'shiftCode'],
              ['Inicio', 'shiftStart'],
              ['Fin', 'shiftEnd'],
              ['Personas L–V', 'requiredWeekday'],
              ['Personas S–D y festivos', 'requiredWeekend'],
              ['Máx. seguidos', 'maxConsecutive'],
            ].map(([label, help]) => el('th', {}, el('span', { className: 'th-label' }, label, helpButton(help)))),
            el('th', {}),
          ),
        ),
        el('tbody', {}, rows),
      ),
      el('p', { className: 'hint' }, 'Máx. seguidos: días seguidos que una persona puede hacer ese turno; -1 = sin límite.'),
      errorSlot('shifts'),
      el(
        'button',
        {
          type: 'button',
          className: 'ghost add',
          onClick: () => {
            config.shifts.push({ id: newShiftId(), name: '', code: '', start: '07:00', end: '15:00', requiredWeekday: 1, requiredWeekend: 1, maxConsecutive: DEFAULT_MAX_CONSECUTIVE });
            render();
            emit();
          },
        },
        'Agregar turno',
      ),
      el(
        'div',
        { className: 'fields' },
        field('Mes', monthSelect, 'month'),
        field('Año', numberInput('year', config.year, (v) => (config.year = v), { min: 2000, max: 2100 }), 'year'),
        field('Horas semanales máximas', numberInput('weeklyHours', config.weeklyHours, (v) => (config.weeklyHours = v), { min: 1, max: 84, step: 0.5 }), 'weeklyHours'),
        field('Descanso mínimo entre turnos (horas)', numberInput('minRestHours', config.minRestHours, (v) => (config.minRestHours = v), { min: 0, max: 48 }), 'minRestHours'),
        field('Máximo de días seguidos', numberInput('maxConsecutiveDays', config.maxConsecutiveDays, (v) => (config.maxConsecutiveDays = v), { min: 1, max: 31 }), 'maxConsecutiveDays'),
        field('Permitir horas extra para cubrir turnos', overtime, 'allowOvertime', 'field toggle'),
      ),
    );
    showErrors(container, validateConfig(config).errors);
  };

  render();
  return {
    setConfig(next) {
      config = clone(next);
      render();
      emit();
    },
  };
}
