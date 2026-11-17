import { type ReactNode, useState } from 'react';
import { Bloco, Hl, Intro, Pilulas } from '@/components/kit';
import { Page } from '@/components/motion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { nomeCurto, usePlanilha } from '../estado';
import { usePendencias } from '../Shell';
import { AvisoPlanilha, TabelaLeads } from '../pecas';

type Grupo = 'todas' | 'pendente' | 'nao';

/** O que a planilha deixa ver de "lead esquecido": reunião sem desfecho e falta sem nova data. */
export function Pendencias() {
  const { mes } = usePlanilha();
  const itens = usePendencias();
  const [grupo, setGrupo] = useState<Grupo>('todas');
  const [vendedor, setVendedor] = useState('todos');
  const nomes = [...new Set(itens.map((l) => l.vendedor))].sort((a, b) => a.localeCompare(b));
  const doVend = vendedor === 'todos' ? itens : itens.filter((l) => l.vendedor === vendedor);
  const sem = doVend.filter((l) => l.realizada === 'pendente');
  const nao = doVend.filter((l) => l.realizada === 'nao');
  const lista = grupo === 'todas' ? doVend : grupo === 'pendente' ? sem : nao;
  const semTotal = itens.filter((l) => l.realizada === 'pendente').length;

  return (
    <Page className="gap-8">
      <Intro
        tag={`Pendências · ${mes.nome.toLowerCase()}`}
        title={
          <>
            <Hl>{semTotal} reuniões</Hl> de {nomeCurto(mes)} sem desfecho e {itens.length - semTotal} faltas sem nova data.
          </>
        }
        aside="Leads em acompanhamento cuja reunião ficou como Pendente (ninguém marcou se aconteceu) ou que não compareceram e ainda não viraram ganho nem perda. Os mais antigos aparecem primeiro."
      />
      <Bloco className="gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Pilulas
            id="pend"
            label="Filtrar pendências"
            value={grupo}
            onChange={setGrupo}
            options={
              [
                ['todas', <>Todas <span className="num opacity-60">{doVend.length}</span></>],
                ['pendente', <>Sem desfecho <span className="num opacity-60">{sem.length}</span></>],
                ['nao', <>Não compareceram <span className="num opacity-60">{nao.length}</span></>],
              ] as [Grupo, ReactNode][]
            }
          />
          <Select value={vendedor} onValueChange={setVendedor}>
            <SelectTrigger className="h-9 w-48 rounded-full bg-card" aria-label="Vendedor">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os vendedores</SelectItem>
              {nomes.map((n) => (
                <SelectItem key={n} value={n}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <TabelaLeads itens={lista} limite={30} vazio="Nenhuma pendência neste filtro." />
      </Bloco>
      <AvisoPlanilha>
        Leads parados e sem primeiro contato dependem do registro de cada contato, que a planilha não tem. Eles entram nesta fila quando o painel ler o CRM.
      </AvisoPlanilha>
    </Page>
  );
}
