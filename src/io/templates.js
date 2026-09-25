import * as XLSX from 'xlsx';
import { toMinutes } from '../core/time.js';
import { minutesToSerial } from './excelDates.js';

export const EXAMPLE_PEOPLE = ['Ana Gómez', 'Luis Martínez'];

function writeWorkbook(name, sheet) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, name);
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
}

export function buildPeopleTemplate() {
  const sheet = XLSX.utils.aoa_to_sheet([['nombre'], ...EXAMPLE_PEOPLE.map((n) => [n])]);
  sheet['!cols'] = [{ wch: 30 }];
  return writeWorkbook('Personas', sheet);
}

export function buildExceptionsTemplate(today = new Date()) {
  const year = today.getMonth() === 11 ? today.getFullYear() + 1 : today.getFullYear();
  const month = ((today.getMonth() + 1) % 12) + 1;
  const sheet = XLSX.utils.aoa_to_sheet([
    ['nombre', 'inicio', 'fin'],
    [EXAMPLE_PEOPLE[0], minutesToSerial(toMinutes(year, month, 5)), minutesToSerial(toMinutes(year, month, 7))],
    [
      EXAMPLE_PEOPLE[1],
      minutesToSerial(toMinutes(year, month, 10, 420)),
      minutesToSerial(toMinutes(year, month, 10, 1140)),
    ],
  ]);
  for (const ref of ['B2', 'C2']) sheet[ref].z = 'yyyy-mm-dd';
  for (const ref of ['B3', 'C3']) sheet[ref].z = 'yyyy-mm-dd hh:mm';
  sheet['!cols'] = [{ wch: 30 }, { wch: 18 }, { wch: 18 }];
  return writeWorkbook('Excepciones', sheet);
}
