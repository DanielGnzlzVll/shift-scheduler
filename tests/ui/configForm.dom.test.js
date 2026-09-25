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

  it('edits the per-shift consecutive limit and defaults new shifts to 3', () => {
    const container = document.createElement('div');
    const onChange = vi.fn();
    renderConfigForm(container, defaultConfig(new Date(2026, 8, 25)), onChange);
    expect([...container.querySelectorAll('table.shifts thead th')].map((th) => th.textContent)).toContain('Máx. seguidos');
    setValue(container.querySelector('[name="shifts.1.maxConsecutive"]'), '2');
    expect(onChange.mock.calls.at(-1)[0].shifts[1].maxConsecutive).toBe(2);
    setValue(container.querySelector('[name="shifts.1.maxConsecutive"]'), '0');
    expect(container.querySelector('[data-error-for="shifts.1.maxConsecutive"]').textContent).toBe('Debe ser -1 (sin límite) o un entero entre 1 y 31');
    setValue(container.querySelector('[name="shifts.1.maxConsecutive"]'), '-1');
    expect(onChange.mock.calls.at(-1)[1].valid).toBe(true);
    expect(container.querySelector('[name="shifts.0.maxConsecutive"]').value).toBe('-1');
    expect(container.textContent).toContain('-1 = sin límite');
    [...container.querySelectorAll('button')].find((b) => b.textContent === 'Agregar turno').click();
    expect(onChange.mock.calls.at(-1)[0].shifts[2].maxConsecutive).toBe(3);
  });

  it('updates numeric, month and overtime fields', () => {
    const container = document.createElement('div');
    const onChange = vi.fn();
    renderConfigForm(container, defaultConfig(new Date(2026, 8, 25)), onChange);
    setValue(container.querySelector('[name="weeklyHours"]'), '40');
    setValue(container.querySelector('[name="month"]'), '11', 'change');
    const overtime = container.querySelector('[name="allowOvertime"]');
    overtime.checked = false;
    overtime.dispatchEvent(new Event('change', { bubbles: true }));
    expect(onChange.mock.calls.at(-1)[0]).toMatchObject({
      weeklyHours: 40,
      month: 11,
      allowOvertime: false,
    });
    expect(onChange.mock.calls.at(-1)[1].valid).toBe(true);
    expect(container.querySelector('[name="holidays"]')).toBeNull();
  });
});
