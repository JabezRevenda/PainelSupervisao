/**
 * Tempo no fuso de São Paulo (UTC−3, sem horário de verão desde 2019) e os dois
 * relógios do painel:
 *  - horas ÚTEIS (dias úteis + expediente) para o SLA de primeiro contato;
 *  - horas CORRIDAS sem fim de semana para os prazos de "em atenção" e "parado".
 */
import type { Parametros } from './types';

export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const DAY = 24 * HOUR;

/** Deslocamento de São Paulo em relação ao UTC, em ms. */
const OFFSET = -3 * HOUR;

/** Data "de parede" em São Paulo. Leia sempre com os métodos getUTC*. */
export function wall(t: number): Date {
  return new Date(t + OFFSET);
}

/** Instante (UTC) a partir de uma data e hora de parede em São Paulo. */
export function fromWall(y: number, m: number, d: number, hh = 0, mm = 0): number {
  return Date.UTC(y, m, d, hh, mm) - OFFSET;
}

/** Meia-noite (em São Paulo) do dia que contém `t`. */
export function startOfDay(t: number): number {
  const w = wall(t);
  return fromWall(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate());
}

/** 0 = domingo ... 6 = sábado, em São Paulo. */
export function weekday(t: number): number {
  return wall(t).getUTCDay();
}

/** Minutos desde a meia-noite, em São Paulo. */
export function minutesOfDay(t: number): number {
  const w = wall(t);
  return w.getUTCHours() * 60 + w.getUTCMinutes();
}

export function dayKey(t: number): string {
  const w = wall(t);
  const mm = String(w.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(w.getUTCDate()).padStart(2, '0');
  return `${w.getUTCFullYear()}-${mm}-${dd}`;
}

export function monthKey(t: number): string {
  return dayKey(t).slice(0, 7);
}

export function startOfMonth(t: number): number {
  const w = wall(t);
  return fromWall(w.getUTCFullYear(), w.getUTCMonth(), 1);
}

export function startOfNextMonth(t: number): number {
  const w = wall(t);
  return fromWall(w.getUTCFullYear(), w.getUTCMonth() + 1, 1);
}

export function startOfWeek(t: number): number {
  const d = startOfDay(t);
  const wd = weekday(d + 12 * HOUR);
  return d - ((wd + 6) % 7) * DAY; // segunda-feira
}

export function startOfQuarter(t: number): number {
  const w = wall(t);
  return fromWall(w.getUTCFullYear(), Math.floor(w.getUTCMonth() / 3) * 3, 1);
}

export function isWeekend(dayStart: number): boolean {
  const wd = weekday(dayStart + 12 * HOUR);
  return wd === 0 || wd === 6;
}

export function isHoliday(dayStart: number, p: Parametros): boolean {
  return p.descontarFeriados && p.feriados.includes(dayKey(dayStart + 12 * HOUR));
}

export function isBusinessDay(dayStart: number, p: Parametros): boolean {
  return p.diasUteis.includes(weekday(dayStart + 12 * HOUR)) && !isHoliday(dayStart, p);
}

export function isBusinessTime(t: number, p: Parametros): boolean {
  const m = minutesOfDay(t);
  return isBusinessDay(startOfDay(t), p) && m >= p.inicioMin && m < p.fimMin;
}

/** Minutos úteis entre `a` e `b` (expediente em dias úteis). */
export function businessMinutesBetween(a: number, b: number, p: Parametros): number {
  if (b <= a) return 0;
  let total = 0;
  for (let day = startOfDay(a); day < b; day += DAY) {
    if (!isBusinessDay(day, p)) continue;
    const s = Math.max(a, day + p.inicioMin * MIN);
    const e = Math.min(b, day + p.fimMin * MIN);
    if (e > s) total += e - s;
  }
  return total / MIN;
}

/** Instante em que se completam `minutes` minutos úteis a partir de `t`. */
export function addBusinessMinutes(t: number, minutes: number, p: Parametros): number {
  let cur = t;
  let left = Math.max(0, minutes);
  for (let guard = 0; guard < 800; guard++) {
    const day = startOfDay(cur);
    if (isBusinessDay(day, p)) {
      const s = day + p.inicioMin * MIN;
      const e = day + p.fimMin * MIN;
      if (cur < s) cur = s;
      if (cur < e) {
        const avail = (e - cur) / MIN;
        if (left <= avail) return cur + left * MIN;
        left -= avail;
      }
    }
    cur = day + DAY;
  }
  return cur;
}

/** Instante em que vence o SLA: `minutes` minutos úteis depois de `t`. */
export function slaDeadline(t: number, minutes: number, p: Parametros): number {
  return addBusinessMinutes(t, minutes, p);
}

/**
 * Horas corridas entre `a` e `b`, sem contar sábado e domingo (e feriados, se
 * ligados). É o relógio de "em atenção" e "parado".
 */
export function hoursSkippingWeekends(a: number, b: number, p: Parametros): number {
  if (b <= a) return 0;
  if (!p.descontarFimDeSemana && !p.descontarFeriados) return (b - a) / HOUR;
  let total = 0;
  for (let day = startOfDay(a); day < b; day += DAY) {
    const skip = (p.descontarFimDeSemana && isWeekend(day)) || isHoliday(day, p);
    if (skip) continue;
    const s = Math.max(a, day);
    const e = Math.min(b, day + DAY);
    if (e > s) total += e - s;
  }
  return total / HOUR;
}

/** Instante em que se completam `hours` horas corridas (sem fim de semana) a partir de `t`. */
export function addHoursSkippingWeekends(t: number, hours: number, p: Parametros): number {
  if (!p.descontarFimDeSemana && !p.descontarFeriados) return t + hours * HOUR;
  let cur = t;
  let left = hours * HOUR;
  for (let guard = 0; guard < 400; guard++) {
    const day = startOfDay(cur);
    const skip = (p.descontarFimDeSemana && isWeekend(day)) || isHoliday(day, p);
    if (!skip) {
      const avail = day + DAY - cur;
      if (left <= avail) return cur + left;
      left -= avail;
    }
    cur = day + DAY;
  }
  return cur;
}

/** Dias úteis do mês de `t`: [já passados (com fração de hoje), total]. */
export function businessDaysOfMonth(t: number, p: Parametros): { passados: number; total: number } {
  const ini = startOfMonth(t);
  const fim = startOfNextMonth(t);
  let total = 0;
  let passados = 0;
  const jornada = p.fimMin - p.inicioMin;
  for (let day = ini; day < fim; day += DAY) {
    if (!isBusinessDay(day, p)) continue;
    total += 1;
    if (day + DAY <= t) passados += 1;
    else if (day <= t) {
      const m = Math.min(Math.max(minutesOfDay(t) - p.inicioMin, 0), jornada);
      passados += m / jornada;
    }
  }
  return { passados, total };
}

// ---------- formatação (pt-BR) ----------

const pad = (n: number) => String(n).padStart(2, '0');

export function fmtTime(t: number): string {
  const w = wall(t);
  return `${pad(w.getUTCHours())}:${pad(w.getUTCMinutes())}`;
}

export function fmtDate(t: number): string {
  const w = wall(t);
  return `${pad(w.getUTCDate())}/${pad(w.getUTCMonth() + 1)}`;
}

export function fmtDateTime(t: number): string {
  return `${fmtDate(t)} · ${fmtTime(t)}`;
}

const WEEKDAYS = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
const WEEKDAYS_SHORT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

export function weekdayName(t: number): string {
  return WEEKDAYS[weekday(t)];
}

export function weekdayShort(t: number): string {
  return WEEKDAYS_SHORT[weekday(t)];
}

export function monthName(t: number): string {
  return MONTHS[wall(t).getUTCMonth()];
}

export function fmtLongDate(t: number): string {
  const w = wall(t);
  return `${WEEKDAYS[w.getUTCDay()]}, ${w.getUTCDate()} de ${MONTHS[w.getUTCMonth()]}`;
}

/** "47 min", "1h 22min", "3h" */
export function fmtMinutes(min: number): string {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h}h` : `${h}h ${pad(r)}min`;
}

/** "52h" (acima de 3h), "2h 10min" (abaixo) */
export function fmtHours(h: number): string {
  if (h < 3) return fmtMinutes(h * 60);
  return `${Math.floor(h)}h`;
}

/** Relógio "01:22:40" */
export function fmtClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

/** Hoje / ontem / data */
export function fmtRelativeDay(t: number, agora: number): string {
  const d = startOfDay(t);
  const hoje = startOfDay(agora);
  if (d === hoje) return 'hoje';
  if (d === hoje - DAY) return 'ontem';
  if (d === hoje + DAY) return 'amanhã';
  return fmtDate(t);
}
