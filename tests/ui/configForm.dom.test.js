import { describe, expect, it, vi } from 'vitest';
import { defaultConfig } from '../../src/core/config.js';
import { renderConfigForm } from '../../src/ui/configForm.js';

const setValue = (input, value, type = 'input') => {
  input.value = value;
  input.dispatchEvent(new Event(type, { bubbles: true }));
};

describe('renderConfigForm', () => {
  it('renders shifts and emits validation on change', () => {
    const container = document.createElement('div');
    const onChange = vi.fn();
    renderConfigForm(container, defaultConfig(new Date(2026, 8, 25)), onChange);
    expect(container.querySelectorAll('table.shifts tbody tr')).toHaveLength(2);

    setValue(container.querySelector('[name="shifts.0.code"]'), '');
    const [config, validation] = onChange.mock.calls.at(-1);
    expect(config.shifts[0].code).toBe('');
    expect(validation.valid).toBe(false);
    expect(container.querySelector('[data-error-for="shifts.0.code"]').textContent).toBe('El código debe tener de 1 a 3 caracteres');

    setValue(container.querySelector('[name="shifts.0.code"]'), 'M');
    expect(onChange.mock.calls.at(-1)[1].valid).toBe(true);
    expect(container.querySelector('[data-error-for="shifts.0.code"]').textContent).toBe('');
  });

  it('adds and removes shifts', () => {
    const container = document.createElement('div');
    const onChange = vi.fn();
    renderConfigForm(container, defaultConfig(new Date(2026, 8, 25)), onChange);
    [...container.querySelectorAll('button')].find((b) => b.textContent === 'Agregar turno').click();
    expect(container.querySelectorAll('table.shifts tbody tr')).toHaveLength(3);
    expect(onChange.mock.calls.at(-1)[0].shifts).toHaveLength(3);
    container.querySelector('table.shifts tbody tr button').click();
    expect(container.querySelectorAll('table.shifts tbody tr')).toHaveLength(2);
  });

  it('updates numeric, month, holiday and overtime fields', () => {
    const container = document.createElement('div');
    const onChange = vi.fn();
    renderConfigForm(container, defaultConfig(new Date(2026, 8, 25)), onChange);
    setValue(container.querySelector('[name="weeklyHours"]'), '40');
    setValue(container.querySelector('[name="month"]'), '11', 'change');
    setValue(container.querySelector('[name="holidays"]'), '2026-11-02, 2026-11-16');
    const overtime = container.querySelector('[name="allowOvertime"]');
    overtime.checked = false;
    overtime.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onChange.mock.calls.at(-1)[0]).toMatchObject({
      weeklyHours: 40,
      month: 11,
      holidays: ['2026-11-02', '2026-11-16'],
      allowOvertime: false,
    });
    expect(onChange.mock.calls.at(-1)[1].valid).toBe(true);
  });
});
