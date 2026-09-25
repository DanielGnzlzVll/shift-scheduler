# Cuadro de Turnos

Generador de cuadros de turno mensual: sube una lista de nombres en Excel, configura los turnos y obtén el horario y el reporte de horas. Funciona 100% en el navegador; ningún dato sale de tu equipo.

Aplicación en línea: https://danielgnzlzvll.github.io/shift-scheduler/

## Cómo se usa

1. **Configuración**: define los turnos (nombre, código, hora de inicio y fin, personas necesarias entre semana y en fines de semana/festivos), el mes, los festivos, las horas semanales máximas y las reglas de descanso. Se guarda automáticamente en el navegador y se puede exportar/importar como JSON.
2. **Personas**: sube un Excel con una sola hoja y los nombres en la primera columna.
3. **Excepciones** (opcional): sube un Excel con las columnas `nombre | inicio | fin`. En ese intervalo no se asignan turnos a la persona. Si el fin no tiene hora, se bloquea todo ese día.
4. **Resultado**: pulsa *Generar* para obtener el cuadro, el reporte de horas por persona y las advertencias de turnos sin cubrir. *Regenerar* prueba otra combinación; *Descargar Excel* exporta el cuadro, el detalle por turno y el reporte.

Ambos archivos tienen una plantilla descargable desde la aplicación.

## Desarrollo local

Requiere Node.js 20 o superior (ver `.nvmrc`).

```bash
npm install
npm run dev
npm test
npm run lint
npm run build
npm run preview
```
