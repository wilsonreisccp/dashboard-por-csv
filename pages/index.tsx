import React, { useState } from 'react'
import Papa from 'papaparse'
import ChartBar from '../src/components/ChartBar'
import ChartPie from '../src/components/ChartPie'
import ChartLine from '../src/components/ChartLine'

type Row = { [k: string]: string }

function normalizeKey(k: string) {
  return k.replace(/\s+/g, ' ').replace(/\s*\/+\s*/g, ' / ').trim()
}

function parseNumber(v?: string) {
  if (!v) return 0
  const s = v.replace(/\./g, '').replace(/,/g, '.')
  const n = parseFloat(s.replace(/[^0-9.\-]/g, ''))
  return isNaN(n) ? 0 : n
}

function getVal(r: Row, ...keys: string[]) {
  for (const k of keys) {
    const nk = normalizeKey(k)
    if (r[nk] !== undefined && r[nk] !== null && String(r[nk]).trim() !== '') return String(r[nk]).trim()
  }
  return ''
}

export default function Home() {
  const [data, setData] = useState<Row[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [view, setView] = useState<string>('Saldo Estoque vs Em Aberto (Top Items)')

  const handleFile = (file: File | null) => {
    if (!file) return
    Papa.parse<Row>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsed = results.data.map((r) => {
          const out: Row = {}
          Object.keys(r).forEach((k) => (out[normalizeKey(k)] = (r as any)[k]))
          return out
        })
        setData(parsed)
        setColumns(Object.keys(parsed[0] || {}))
      }
    })
  }

  // Basic aggregations
  const totalRequested = data.reduce((s, r) => s + parseNumber(getVal(r, 'Qtde. Solicitada', 'Qtde.  Solicitada')), 0)
  const totalOpen = data.reduce((s, r) => s + parseNumber(getVal(r, 'Qtde. Em Aberto', 'Qtde.  Em  Aberto', 'Qtde. Em  Aberto')), 0)

  // Status distribution
  const statusMap: Record<string, number> = {}
  data.forEach((r) => {
    const st = getVal(r, 'Status', 'Status ', 'Descrição  Status', 'Descrição Status') || 'Unknown'
    statusMap[st] = (statusMap[st] || 0) + 1
  })

  // Top items by open qty
  const itemMap: Record<string, number> = {}
  data.forEach((r) => {
    const item = getVal(r, 'Descrição Item', 'Descrição  Item', 'Descrição') || 'Unknown'
    const open = parseNumber(getVal(r, 'Qtde. Em Aberto', 'Qtde.  Em  Aberto', 'Qtde. Em  Aberto'))
    itemMap[item] = (itemMap[item] || 0) + open
  })

  const topItems = Object.entries(itemMap).sort((a, b) => b[1] - a[1]).slice(0, 10)

  // Filial aggregation
  const filialMap: Record<string, number> = {}
  data.forEach((r) => {
    const f = getVal(r, 'Filial', 'Filial  Fábrica', 'Filial  Fábrica') || 'Unknown'
    filialMap[f] = (filialMap[f] || 0) + parseNumber(getVal(r, 'Qtde. Em Aberto', 'Qtde.  Em  Aberto'))
  })

  const filialEntries = Object.entries(filialMap).sort((a, b) => b[1] - a[1])

  // Responsible aggregation (Responsável - Nome  Responsável)
  const responsibleMap: Record<string, number> = {}
  data.forEach((r) => {
    const respCode = getVal(r, 'Responsável', 'Responsavel', 'Solicitante')
    const respName = getVal(r, 'Nome  Responsável', 'Nome Responsável', 'Nome  Solicitante', 'Nome Solicitante')
    const label = (respCode || respName) ? `${respCode} - ${respName}`.trim().replace(/^ - | - $/, '') : 'Unknown'
    responsibleMap[label] = (responsibleMap[label] || 0) + 1
  })

  const responsibleLabels = Object.keys(responsibleMap)
  const responsibleValues = Object.values(responsibleMap)

  // Fornecedor aggregation (Qtde Em Aberto)
  const fornecedorMap: Record<string, number> = {}
  data.forEach((r) => {
    const f = getVal(r, 'Descrição  Fornecedor', 'Descrição Fornecedor', 'Cód.  Fornecedor', 'Descrição  Fornecedor') || 'Unknown'
    fornecedorMap[f] = (fornecedorMap[f] || 0) + parseNumber(getVal(r, 'Qtde. Em Aberto', 'Qtde.  Em  Aberto'))
  })

  // Centro de Custo aggregation
  const centroMap: Record<string, number> = {}
  data.forEach((r) => {
    const cc = getVal(r, 'Centro   de Custo', 'Centro de Custo', 'Centro   de Custo') || 'Unknown'
    centroMap[cc] = (centroMap[cc] || 0) + parseNumber(getVal(r, 'Qtde. Em Aberto', 'Qtde.  Em  Aberto'))
  })

  // Backlog over time (Data Solicitação)
  const backlogMap: Record<string, number> = {}
  data.forEach((r) => {
    const d = getVal(r, 'Data  Solicitação', 'Data Solicitação')
    if (!d) return
    const date = new Date(d).toISOString().slice(0, 10)
    backlogMap[date] = (backlogMap[date] || 0) + parseNumber(getVal(r, 'Qtde. Em Aberto', 'Qtde.  Em  Aberto'))
  })

  const backlogDates = Object.keys(backlogMap).sort()
  const backlogValues = backlogDates.map((d) => backlogMap[d])

  // Time to approval (days)
  const approvalDays: number[] = []
  data.forEach((r) => {
    const req = getVal(r, 'Data  Solicitação', 'Data Solicitação')
    const apr = getVal(r, 'Data  Aprov.', 'Data Aprov.')
    if (req && apr) {
      const d1 = new Date(req)
      const d2 = new Date(apr)
      const diff = (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)
      if (!isNaN(diff)) approvalDays.push(diff)
    }
  })
  const avgApprovalDays = approvalDays.length ? approvalDays.reduce((s, v) => s + v, 0) / approvalDays.length : 0

  // Saldo Estoque vs Qtde Em Aberto per item (top 15 by open)
  const balanceMap: Record<string, { open: number; stock: number }> = {}
  data.forEach((r) => {
    const item = getVal(r, 'Descrição Item', 'Descrição  Item', 'Descrição') || 'Unknown'
    const open = parseNumber(getVal(r, 'Qtde. Em Aberto', 'Qtde.  Em  Aberto'))
    const stock = parseNumber(getVal(r, 'Saldo  Estoque', 'Saldo Estoque', 'Saldo  Estoque'))
    if (!balanceMap[item]) balanceMap[item] = { open: 0, stock: 0 }
    balanceMap[item].open += open
    balanceMap[item].stock += stock
  })
  const balanceEntries = Object.entries(balanceMap).sort((a, b) => b[1].open - a[1].open).slice(0, 15)

  // Solicitante counts
  const solicitanteMap: Record<string, number> = {}
  data.forEach((r) => {
    const s = getVal(r, 'Nome  Solicitante', 'Nome Solicitante', 'Solicitante') || 'Unknown'
    solicitanteMap[s] = (solicitanteMap[s] || 0) + 1
  })

  return (
    <div style={{ padding: 20, fontFamily: 'Arial, sans-serif' }}>
      <h1>Dashboard - Upload da Planilha</h1>

      <p>Faça upload do arquivo CSV exportado da planilha (mesmo formato sempre).</p>
      <input
        type="file"
        accept=".csv, text/csv"
        onChange={(e) => handleFile(e.target.files ? e.target.files[0] : null)}
      />

      <div style={{ marginTop: 20 }}>
        <strong>Total Qtde. Solicitada:</strong> {totalRequested.toLocaleString()}
        <br />
        <strong>Total Qtde. Em Aberto:</strong> {totalOpen.toLocaleString()}
        <br />
        <strong>Tempo médio até aprovação (dias):</strong> {avgApprovalDays.toFixed(1)}
      </div>

      <div style={{ marginTop: 16 }}>
        <label>Escolha a visão: </label>
        <select value={view} onChange={(e) => setView(e.target.value)}>
          <option>Filial - Qtde Em Aberto</option>
          <option>Fornecedor - Qtde Em Aberto</option>
          <option>Centro de Custo - Qtde Em Aberto</option>
          <option>Top Itens - Qtde Em Aberto</option>
          <option>Status (contagem)</option>
          <option>Responsável (contagem)</option>
          <option>Backlog (Data Solicitação)</option>
          <option>Saldo Estoque vs Em Aberto (Top Items)</option>
          <option>Pedidos por Solicitante</option>
      </select>
      </div>

      <div style={{ marginTop: 20 }} className="chart-container">
        {view === 'Filial - Qtde Em Aberto' && (
          <ChartBar labels={filialEntries.map((f) => f[0])} values={filialEntries.map((f) => f[1])} />
        )}

        {view === 'Fornecedor - Qtde Em Aberto' && (
          <ChartBar labels={Object.keys(fornecedorMap)} values={Object.values(fornecedorMap)} />
        )}

        {view === 'Centro de Custo - Qtde Em Aberto' && (
          <ChartBar labels={Object.keys(centroMap)} values={Object.values(centroMap)} />
        )}

        {view === 'Top Itens - Qtde Em Aberto' && (
          <ChartBar labels={topItems.map((t) => t[0])} values={topItems.map((t) => t[1])} />
        )}

        {view === 'Status (contagem)' && <ChartPie labels={Object.keys(statusMap)} values={Object.values(statusMap)} />}

        {view === 'Responsável (contagem)' && <ChartPie labels={responsibleLabels} values={responsibleValues} />}

        {view === 'Backlog (Data Solicitação)' && <ChartLine labels={backlogDates} values={backlogValues} />}

        {view === 'Saldo Estoque vs Em Aberto (Top Items)' && (
          <ChartBar
            labels={balanceEntries.map((b) => b[0])}
            datasets={[
              { label: 'Em Aberto', data: balanceEntries.map((b) => b[1].open), backgroundColor: 'rgba(255,99,132,0.6)' },
              { label: 'Saldo Estoque', data: balanceEntries.map((b) => b[1].stock), backgroundColor: 'rgba(53,162,235,0.6)' }
            ]}
          />
        )}

        {view === 'Pedidos por Solicitante' && (
          <ChartBar labels={Object.keys(solicitanteMap)} values={Object.values(solicitanteMap)} />
        )}
      </div>

      <div style={{ marginTop: 30 }}>
        <h3>Preview de colunas detectadas</h3>
        <div style={{ overflowX: 'auto', background: '#fafafa', padding: 10 }}>
          <pre style={{ margin: 0 }}>{JSON.stringify(columns, null, 2)}</pre>
        </div>
      </div>
    </div>
  )
}
