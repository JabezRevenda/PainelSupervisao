import { describe, expect, it } from 'vitest';
import { PARAMETROS_PADRAO as p } from './params';
import {
  addBusinessMinutes,
  addHoursSkippingWeekends,
  businessDaysOfMonth,
  businessMinutesBetween,
  fmtMinutes,
  fromWall,
  hoursSkippingWeekends,
  slaDeadline,
} from './time';

// 06/11/2026 é sexta-feira; 09/11/2026 é segunda-feira (horário de São Paulo)
const sexta = (h: number, m = 0) => fromWall(2026, 10, 6, h, m);
const segunda = (h: number, m = 0) => fromWall(2026, 10, 9, h, m);

describe('SLA em horas úteis (seg a sex, 8h às 18h)', () => {
  it('lead recebido sexta às 17h30 vence segunda às 8h30', () => {
    expect(slaDeadline(sexta(17, 30), 60, p)).toBe(segunda(8, 30));
  });

  it('conta só o expediente entre sexta 17h30 e segunda 8h30', () => {
    expect(businessMinutesBetween(sexta(17, 30), segunda(8, 30), p)).toBe(60);
  });

  it('lead recebido fora do expediente começa a contar às 8h', () => {
    expect(businessMinutesBetween(sexta(20, 0), segunda(8, 45), p)).toBe(45);
    expect(addBusinessMinutes(sexta(20, 0), 30, p)).toBe(segunda(8, 30));
  });
});

describe('prazos de 24h e 48h em horas corridas, sem fim de semana', () => {
  it('última interação sexta 15h: em atenção segunda 15h, parado terça 15h', () => {
    expect(hoursSkippingWeekends(sexta(15), segunda(15), p)).toBe(24);
    expect(addHoursSkippingWeekends(sexta(15), 24, p)).toBe(segunda(15));
    expect(addHoursSkippingWeekends(sexta(15), 48, p)).toBe(fromWall(2026, 10, 10, 15));
  });

  it('sem descontar o fim de semana, conta tudo', () => {
    expect(hoursSkippingWeekends(sexta(15), segunda(15), { ...p, descontarFimDeSemana: false })).toBe(72);
  });

  it('desconta feriados quando ligado (20/11 é feriado nacional)', () => {
    const quinta = fromWall(2026, 10, 19, 12);
    const sabado = fromWall(2026, 10, 21, 12);
    expect(hoursSkippingWeekends(quinta, sabado, p)).toBe(36);
    expect(hoursSkippingWeekends(quinta, sabado, { ...p, descontarFeriados: true })).toBe(12);
  });
});

describe('dias úteis do mês', () => {
  it('novembro de 2026 tem 21 dias úteis sem descontar feriados', () => {
    expect(businessDaysOfMonth(fromWall(2026, 10, 1, 10), p).total).toBe(21);
  });
});

describe('formatação', () => {
  it('formata minutos', () => {
    expect(fmtMinutes(47)).toBe('47 min');
    expect(fmtMinutes(82)).toBe('1h 22min');
    expect(fmtMinutes(120)).toBe('2h');
  });
});
