import { afterEach, describe, expect, it } from 'vitest';
import { defaultConfig } from '../../src/core/config.js';
import { renderApp } from '../../src/ui/app.js';
import { renderConfigForm } from '../../src/ui/configForm.js';
import { HELP, helpButton } from '../../src/ui/help.js';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('help buttons', () => {
  it('shows the explanation in a floating tooltip on hover and hides it on leave', () => {
    const button = helpButton('minRestHours');
    document.body.append(button);
    expect(button.textContent).toBe('');
    expect(button.getAttribute('aria-label')).toBe(`Ayuda: ${HELP.minRestHours}`);

    button.dispatchEvent(new Event('mouseenter'));
    const tip = document.querySelector('.help-tip');
    expect(tip.textContent).toBe(HELP.minRestHours);
    expect(tip.classList.contains('visible')).toBe(true);
    expect(button.getAttribute('aria-describedby')).toBe('help-tip');

    button.dispatchEvent(new Event('mouseleave'));
    expect(tip.classList.contains('visible')).toBe(false);
  });

  it('opens on click without toggling the surrounding control', () => {
    const container = document.createElement('div');
    document.body.append(container);
    renderConfigForm(container, defaultConfig(new Date(2026, 8, 25)), () => {});
    const overtime = container.querySelector('[name="allowOvertime"]');
    const before = overtime.checked;
    overtime.closest('label').querySelector('button.help').click();
    expect(overtime.checked).toBe(before);
    expect(document.querySelector('.help-tip').textContent).toBe(HELP.allowOvertime);
  });

  it('adds a help button to every configuration field and shift column', () => {
    const container = document.createElement('div');
    renderConfigForm(container, defaultConfig(new Date(2026, 8, 25)), () => {});
    const helps = [...container.querySelectorAll('button.help')].map((b) => b.dataset.help);
    for (const key of [
      'shiftName',
      'shiftCode',
      'shiftStart',
      'shiftEnd',
      'requiredWeekday',
      'requiredWeekend',
      'maxConsecutive',
      'month',
      'year',
      'weeklyHours',
      'minRestHours',
      'maxConsecutiveDays',
      'holidays',
      'allowOvertime',
    ]) {
      expect(helps).toContain(HELP[key]);
    }
  });

  it('explains the people and exceptions uploads', () => {
    const root = document.createElement('div');
    renderApp(root, { storage: { getItem: () => null, setItem: () => {} } });
    const sections = [...root.querySelectorAll('section.card')];
    expect(sections[1].querySelector('h2 button.help').dataset.help).toBe(HELP.people);
    expect(sections[2].querySelector('h2 button.help').dataset.help).toBe(HELP.exceptions);
  });
});
