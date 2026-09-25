import { el } from './dom.js';

export const HELP = {
  shiftName:
    'Nombre del turno tal como aparecerá en el reporte y en el Excel, por ejemplo «Día», «Noche» o «Mañana». No cambia el cálculo, pero debe ser distinto para cada turno.',
  shiftCode:
    'Abreviatura de 1 a 3 letras que se muestra en cada celda del cuadro, por ejemplo «D» o «N». Debe ser única para que los turnos se distingan de un vistazo.',
  shiftStart:
    'Hora en que empieza el turno, en formato de 24 horas (HH:mm), por ejemplo 07:00 o 19:00. El turno se asigna al día en que empieza.',
  shiftEnd:
    'Hora en que termina el turno, en formato de 24 horas. Si es menor que la hora de inicio, el turno termina al día siguiente (19:00 a 07:00). Si es igual, es un turno de 24 horas.',
  requiredWeekday:
    'Cuántas personas deben trabajar este turno cada día de lunes a viernes. Usa 0 si el turno no existe entre semana. Si no hay suficientes personas disponibles, el cupo queda sin cubrir y aparece en las advertencias.',
  requiredWeekend:
    'Cuántas personas se necesitan en este turno los sábados, domingos y los días marcados como festivos. Usa 0 si el turno no se trabaja esos días.',
  maxConsecutive:
    'Máximo de días seguidos que una misma persona puede hacer este turno en particular, por ejemplo no más de 3 noches seguidas. Usa -1 para no poner límite. Se aplica además del máximo general de días seguidos.',
  month: 'Mes para el que se genera el cuadro. De él dependen la cantidad de días, qué días son fin de semana y la meta de horas de cada persona.',
  year: 'Año del cuadro. Junto con el mes define en qué día de la semana cae cada fecha y si febrero tiene 28 o 29 días.',
  weeklyHours:
    'Horas que cada persona debería trabajar por semana según su contrato o la norma que aplique, por ejemplo 42. La meta del mes es horas semanales × días del mes ÷ 7, y se reduce en proporción al tiempo que la persona tenga en excepciones. Los turnos se reparten para acercar a todos a su meta.',
  minRestHours:
    'Horas mínimas de descanso entre el final de un turno y el inicio del siguiente para la misma persona. Con 12 horas, quien sale a las 07:00 no puede volver a entrar antes de las 19:00.',
  maxConsecutiveDays:
    'Máximo de días seguidos que una persona puede trabajar, sin importar el turno. Al llegar a ese número, necesita al menos un día libre antes de volver a trabajar.',
  holidays:
    'Festivos del mes en formato AAAA-MM-DD, separados por coma, por ejemplo 2026-10-12, 2026-11-02. Esos días usan la cantidad de personas de fin de semana y cuentan como fin de semana en el reporte. Solo se aceptan fechas del mes seleccionado.',
  allowOvertime:
    'Activado: si es la única forma de cubrir un turno, se puede asignar a una persona más horas que su meta, y el exceso se ve en el reporte. Desactivado: nadie supera su meta, y los turnos que no se puedan cubrir quedan como advertencia.',
  people:
    'Sube un Excel (.xlsx o .xls) o un CSV con una sola hoja y un nombre por fila en la primera columna. Puede tener un encabezado como «nombre». Se ignoran las filas vacías y los nombres repetidos. Si tienes dudas, descarga la plantilla.',
  exceptions:
    'Opcional. Excel con tres columnas: nombre, inicio y fin. En ese intervalo la persona no recibe turnos (vacaciones, incapacidad, permisos). Las fechas pueden ser fechas de Excel o texto como 2026-10-05 07:00 o 05/10/2026; si el fin no tiene hora, se bloquea todo ese día. El nombre debe coincidir con la lista de personas, sin importar tildes ni mayúsculas.',
};

const GAP = 8;
const MARGIN = 12;
let tip = null;

function tipElement() {
  if (!tip || !tip.isConnected) {
    tip = el('div', { className: 'help-tip', role: 'tooltip', id: 'help-tip' });
    document.body.append(tip);
  }
  return tip;
}

function show(button) {
  const node = tipElement();
  node.textContent = button.dataset.help;
  node.classList.add('visible');
  button.setAttribute('aria-describedby', node.id);
  const anchor = button.getBoundingClientRect();
  const box = node.getBoundingClientRect();
  const left = Math.min(Math.max(anchor.left + anchor.width / 2 - box.width / 2, MARGIN), window.innerWidth - box.width - MARGIN);
  const below = anchor.bottom + GAP;
  const top = below + box.height > window.innerHeight - MARGIN ? anchor.top - GAP - box.height : below;
  node.style.left = `${Math.max(left, MARGIN)}px`;
  node.style.top = `${Math.max(top, MARGIN)}px`;
}

function hide(button) {
  button.removeAttribute('aria-describedby');
  tip?.classList.remove('visible');
}

export function helpButton(key) {
  const text = HELP[key];
  const button = el('button', {
    type: 'button',
    className: 'help',
    'aria-label': `Ayuda: ${text}`,
    dataset: { help: text },
    onClick: (e) => {
      e.preventDefault();
      e.stopPropagation();
      button.focus();
      show(button);
    },
    onMouseenter: () => show(button),
    onMouseleave: () => hide(button),
    onFocus: () => show(button),
    onBlur: () => hide(button),
    onKeydown: (e) => {
      if (e.key === 'Escape') hide(button);
    },
  });
  return button;
}
