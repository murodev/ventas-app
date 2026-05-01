import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import styles from './Reportes.module.css'

const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)
const ICONS = {
  chart:   'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  money:   'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 9v1',
  user:    'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  factory: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z',
  refresh: 'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15',
  coin:    'M12 2a10 10 0 100 20A10 10 0 0012 2zm0 0v20M2 12h20M12 2c-4 0-7 4.5-7 10s3 10 7 10M12 2c4 0 7 4.5 7 10s-3 10-7 10',
}

const TABS = [
  { id: 'ventas',          label: 'Ventas por período',  icon: ICONS.chart   },
  { id: 'cobros',          label: 'Cobros pendientes',   icon: ICONS.money   },
  { id: 'cobros_realizados', label: 'Cobros realizados', icon: ICONS.coin    },
  { id: 'jornadas',        label: 'Producción diaria',   icon: ICONS.factory },
]

// ── Mini bar chart en SVG puro ──────────────────────────────────
function BarChart({ data, colorFn, labelKey, valueKey, fmt }) {
  if (!data?.length) return null
  const max    = Math.max(...data.map(d => d[valueKey]), 1)
  const W      = 560; const H = 160; const barW = Math.max(8, Math.floor((W - 40) / data.length) - 4)

  return (
    <svg viewBox={`0 0 ${W} ${H + 40}`} width="100%" style={{ overflow: 'visible' }}>
      {data.map((d, i) => {
        const h   = Math.max(4, Math.round((d[valueKey] / max) * H))
        const x   = 20 + i * ((W - 40) / data.length)
        const y   = H - h
        const col = colorFn ? colorFn(d, i) : 'var(--accent)'
        return (
          <g key={i}>
            <rect x={x} y={y} width={barW} height={h} rx="3" fill={col} opacity=".85" />
            <text x={x + barW / 2} y={H + 16} textAnchor="middle"
              fontSize="10" fill="var(--text3)">{d[labelKey]}</text>
            {h > 20 && (
              <text x={x + barW / 2} y={y - 4} textAnchor="middle"
                fontSize="9" fill="var(--text2)">{fmt ? fmt(d[valueKey]) : d[valueKey]}</text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// ── Línea chart en SVG ──────────────────────────────────────────
function LineChart({ data, labelKey, valueKey, fmt }) {
  if (!data?.length) return null
  const max = Math.max(...data.map(d => d[valueKey]), 1)
  const W = 560; const H = 140; const pad = 20

  const points = data.map((d, i) => ({
    x: pad + (i / Math.max(data.length - 1, 1)) * (W - pad * 2),
    y: pad + (1 - d[valueKey] / max) * (H - pad * 2),
    v: d[valueKey],
    l: d[labelKey],
  }))

  const path  = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const areaD = `${path} L${points[points.length - 1].x},${H} L${points[0].x},${H} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H + 30}`} width="100%" style={{ overflow: 'visible' }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="var(--accent)" stopOpacity="0.25" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0"    />
        </linearGradient>
      </defs>
      <path d={areaD} fill="url(#areaGrad)" />
      <path d={path}  fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r="3.5" fill="var(--accent)" />
          <text x={p.x} y={H + 20} textAnchor="middle" fontSize="10" fill="var(--text3)">{p.l}</text>
        </g>
      ))}
    </svg>
  )
}

export default function Reportes() {
  const [tab,       setTab]       = useState('ventas')
  const [periodo,   setPeriodo]   = useState('mes_actual')
  const [loading,   setLoading]   = useState(false)

  // Datos
  const [ventasData,        setVentasData]        = useState({ serie: [], total: 0, cant: 0, promedio: 0 })
  const [cobrosData,        setCobrosData]        = useState([])
  const [cobrosRealizados,  setCobrosRealizados]  = useState({ rows: [], porMedio: [], total: 0, cant: 0 })
  const [jornadasData,      setJornadasData]      = useState([])

  const fmt = (n) => '$' + Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 0 })
  const fmtFecha = (s) => s ? new Date(s + 'T00:00:00').toLocaleDateString('es-AR', { day:'2-digit', month:'short' }) : '—'
  const fmtHora  = (s) => s ? new Date(s).toLocaleTimeString('es-AR', { hour:'2-digit', minute:'2-digit' }) : '—'

  // ── Rango de fechas ──────────────────────────────────────────
  const getRango = useCallback(() => {
    const hoy   = new Date()
    const desde = new Date()
    if (periodo === 'dia')        desde.setDate(hoy.getDate() - 1)
    if (periodo === 'semana')     desde.setDate(hoy.getDate() - 7)
    if (periodo === 'mes')        desde.setDate(hoy.getDate() - 30)
    if (periodo === 'mes_actual') {
      desde.setDate(1)
      desde.setHours(0, 0, 0, 0)
    }
    return { desde: desde.toISOString(), hasta: hoy.toISOString() }
  }, [periodo])

  // ── Reporte ventas ───────────────────────────────────────────
  const cargarVentas = useCallback(async () => {
    setLoading(true)
    const { desde, hasta } = getRango()
    const { data } = await supabase
      .from('ventas')
      .select('idventa, fecha, montoventa, montopendiente, estado, clientes(nombre)')
      .gte('fecha', desde).lte('fecha', hasta)
      .order('fecha')

    if (!data) { setLoading(false); return }

    // Agrupar por día
    const byDay = {}
    data.forEach(v => {
      const dia = v.fecha?.split('T')[0] || ''
      if (!byDay[dia]) byDay[dia] = { label: fmtFecha(dia), total: 0, cant: 0 }
      byDay[dia].total += v.montoventa || 0
      byDay[dia].cant  += 1
    })

    const serie   = Object.values(byDay)
    const total   = data.reduce((s, v) => s + (v.montoventa || 0), 0)
    const cant    = data.length
    const promedio= cant ? total / cant : 0

    setVentasData({ serie, total, cant, promedio, rows: data })
    setLoading(false)
  }, [getRango])

  // ── Reporte cobros realizados ────────────────────────────────
  const cargarCobrosRealizados = useCallback(async () => {
    setLoading(true)
    const { desde, hasta } = getRango()
    const { data } = await supabase
      .from('pagos')
      .select('idpago, monto, fechapago, idmediopago, mediospagos(mediopago), ventas(idventa, clientes(nombre))')
      .gte('fechapago', desde).lte('fechapago', hasta)
      .order('fechapago', { ascending: false })

    const rows = data || []

    // Agrupar por medio de pago
    const byMedio = {}
    rows.forEach(p => {
      const medio = p.mediospagos?.mediopago || 'Sin especificar'
      if (!byMedio[medio]) byMedio[medio] = { medio, total: 0, cant: 0 }
      byMedio[medio].total += p.monto || 0
      byMedio[medio].cant  += 1
    })

    const total = rows.reduce((s, p) => s + (p.monto || 0), 0)

    setCobrosRealizados({
      rows,
      porMedio: Object.values(byMedio).sort((a, b) => b.total - a.total),
      total,
      cant: rows.length,
    })
    setLoading(false)
  }, [getRango])

  // ── Reporte cobros pendientes ────────────────────────────────
  const cargarCobros = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('ventas')
      .select('idventa, fecha, montoventa, montopendiente, estado, clientes(nombre, telefono)')
      .gt('montopendiente', 0)
      .order('montopendiente', { ascending: false })

    // Agrupar por cliente
    const byCliente = {}
    ;(data || []).forEach(v => {
      const nom = v.clientes?.nombre || 'Sin cliente'
      if (!byCliente[nom]) byCliente[nom] = { nombre: nom, tel: v.clientes?.telefono || '', ventas: [], total: 0 }
      byCliente[nom].ventas.push(v)
      byCliente[nom].total += v.montopendiente || 0
    })

    setCobrosData(Object.values(byCliente).sort((a, b) => b.total - a.total))
    setLoading(false)
  }, [])

  // ── Reporte jornadas ─────────────────────────────────────────
  const cargarJornadas = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('jornadas')
      .select(`id, fecha, estado, masas_total, abierta_at, cerrada_at,
        jornada_produccion(cantidad, productos(producto))`)
      .order('fecha', { ascending: false })
      .limit(30)

    setJornadasData(data || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    if (tab === 'ventas')            cargarVentas()
    if (tab === 'cobros')            cargarCobros()
    if (tab === 'cobros_realizados') cargarCobrosRealizados()
    if (tab === 'jornadas')          cargarJornadas()
  }, [tab, periodo, cargarVentas, cargarCobros, cargarCobrosRealizados, cargarJornadas])

  const totalCobros = cobrosData.reduce((s, c) => s + c.total, 0)

  return (
    <div className={styles.wrap}>

      {/* Tabs */}
      <div className={styles.tabs}>
        {TABS.map(t => (
          <button key={t.id}
            className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
            onClick={() => setTab(t.id)}>
            <Icon d={t.icon} size={14} /> {t.label}
          </button>
        ))}
      </div>

      {/* ══ REPORTE VENTAS ══ */}
      {tab === 'ventas' && (
        <div>
          {/* Selector período */}
          <div className={styles.periodoRow}>
            <div className={styles.filtros}>
              {[['mes_actual','Mes actual'],['dia','Ayer'],['semana','Últimos 7 días'],['mes','Últimos 30 días']].map(([p, label]) => (
                <button key={p} className={`${styles.filtroBtn} ${periodo === p ? styles.active : ''}`}
                  onClick={() => setPeriodo(p)}>{label}</button>
              ))}
            </div>
            <button className={`btn btn-ghost ${styles.refreshBtn}`} onClick={cargarVentas}>
              <Icon d={ICONS.refresh} size={13} />
            </button>
          </div>

          {loading
            ? <div className={styles.loading}>Cargando...</div>
            : <>
              {/* Métricas */}
              <div className={styles.metrics}>
                <div className={styles.metric}>
                  <div className={styles.metricVal}>{fmt(ventasData.total)}</div>
                  <div className={styles.metricLabel}>Total vendido</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricVal}>{ventasData.cant}</div>
                  <div className={styles.metricLabel}>Ventas realizadas</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricVal}>{fmt(ventasData.promedio)}</div>
                  <div className={styles.metricLabel}>Ticket promedio</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricVal}>
                    {fmt(ventasData.rows?.reduce((s, v) => s + (v.montopendiente || 0), 0))}
                  </div>
                  <div className={styles.metricLabel}>Pendiente de cobro</div>
                </div>
              </div>

              {/* Gráfico */}
              {ventasData.serie?.length > 0 && (
                <div className={styles.chartCard}>
                  <div className={styles.chartTitle}>Ventas por día</div>
                  {ventasData.serie.length > 2
                    ? <LineChart data={ventasData.serie} labelKey="label" valueKey="total" fmt={fmt} />
                    : <BarChart  data={ventasData.serie} labelKey="label" valueKey="total" fmt={fmt}
                        colorFn={() => 'var(--accent)'} />
                  }
                </div>
              )}

              {/* Tabla detalle */}
              {ventasData.rows?.length > 0 && (
                <div className={styles.tableCard}>
                  <div className={styles.tableTitle}>Detalle de ventas</div>
                  <div className={styles.table}>
                    <div className={styles.tableHead} style={{ gridTemplateColumns: '50px 1.5fr 100px 110px 110px 90px' }}>
                      <span>#</span><span>Cliente</span><span>Fecha</span>
                      <span>Total</span><span>Pendiente</span><span>Estado</span>
                    </div>
                    {ventasData.rows.map(v => (
                      <div key={v.idventa} className={styles.tableRow}
                        style={{ gridTemplateColumns: '50px 1.5fr 100px 110px 110px 90px' }}>
                        <span className={styles.idCell}>#{v.idventa}</span>
                        <span className={styles.nameCell}>{v.clientes?.nombre || '—'}</span>
                        <span className={styles.cell}>{fmtFecha(v.fecha?.split('T')[0])}</span>
                        <span className={styles.montoCell}>{fmt(v.montoventa)}</span>
                        <span className={styles.montoCell} style={{ color: v.montopendiente > 0 ? 'var(--danger)' : 'var(--success)' }}>
                          {fmt(v.montopendiente)}
                        </span>
                        <span>
                          <span className={`badge ${v.estado === 'Pagado' ? 'badge-ok' : v.estado === 'Parcial' ? 'badge-pending' : 'badge-danger'}`}>
                            {v.estado}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {ventasData.rows?.length === 0 && (
                <div className={styles.empty}>No hay ventas en el período seleccionado.</div>
              )}
            </>
          }
        </div>
      )}

      {/* ══ REPORTE COBROS ══ */}
      {tab === 'cobros' && (
        <div>
          {loading
            ? <div className={styles.loading}>Cargando...</div>
            : <>
              <div className={styles.metrics}>
                <div className={styles.metric}>
                  <div className={styles.metricVal} style={{ color: 'var(--danger)' }}>{fmt(totalCobros)}</div>
                  <div className={styles.metricLabel}>Total pendiente</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricVal}>{cobrosData.length}</div>
                  <div className={styles.metricLabel}>Clientes con deuda</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricVal}>
                    {cobrosData.reduce((s, c) => s + c.ventas.length, 0)}
                  </div>
                  <div className={styles.metricLabel}>Ventas sin cobrar</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricVal}>
                    {fmt(cobrosData.length ? totalCobros / cobrosData.length : 0)}
                  </div>
                  <div className={styles.metricLabel}>Deuda promedio</div>
                </div>
              </div>

              {/* Gráfico barras por cliente */}
              {cobrosData.length > 0 && (
                <div className={styles.chartCard}>
                  <div className={styles.chartTitle}>Deuda por cliente</div>
                  <BarChart
                    data={cobrosData.slice(0, 10).map(c => ({ label: c.nombre.split(' ')[0], total: c.total }))}
                    labelKey="label" valueKey="total" fmt={fmt}
                    colorFn={(_, i) => i === 0 ? 'var(--danger)' : `rgba(248,113,113,${0.8 - i * 0.06})`}
                  />
                </div>
              )}

              {/* Tabla por cliente */}
              {cobrosData.length > 0 && (
                <div className={styles.tableCard}>
                  <div className={styles.tableTitle}>Detalle por cliente</div>
                  {cobrosData.map(c => (
                    <div key={c.nombre} className={styles.cobroCliente}>
                      <div className={styles.cobroClienteHeader}>
                        <div>
                          <div className={styles.cobroNombre}>{c.nombre}</div>
                          {c.tel && <div className={styles.cobroTel}>{c.tel}</div>}
                        </div>
                        <div className={styles.cobroTotal}>{fmt(c.total)}</div>
                      </div>
                      {c.ventas.map(v => (
                        <div key={v.idventa} className={styles.cobroVentaRow}>
                          <span className={styles.idCell}>#{v.idventa}</span>
                          <span className={styles.cell}>{fmtFecha(v.fecha?.split('T')[0])}</span>
                          <span className={styles.montoCell}>{fmt(v.montoventa)}</span>
                          <span className={styles.montoCell} style={{ color: 'var(--danger)' }}>
                            Debe: {fmt(v.montopendiente)}
                          </span>
                          <span>
                            <span className={`badge ${v.estado === 'Parcial' ? 'badge-pending' : 'badge-danger'}`}>
                              {v.estado}
                            </span>
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {cobrosData.length === 0 && (
                <div className={styles.empty}>No hay cobros pendientes. ¡Todo al día!</div>
              )}
            </>
          }
        </div>
      )}

      {/* ══ REPORTE COBROS REALIZADOS ══ */}
      {tab === 'cobros_realizados' && (
        <div>
          <div className={styles.periodoRow}>
            <div className={styles.filtros}>
              {[['mes_actual','Mes actual'],['dia','Hoy'],['semana','Últimos 7 días'],['mes','Últimos 30 días']].map(([p, label]) => (
                <button key={p} className={`${styles.filtroBtn} ${periodo === p ? styles.active : ''}`}
                  onClick={() => setPeriodo(p)}>{label}</button>
              ))}
            </div>
            <button className={`btn btn-ghost ${styles.refreshBtn}`} onClick={cargarCobrosRealizados}>
              <Icon d={ICONS.refresh} size={13} />
            </button>
          </div>

          {loading
            ? <div className={styles.loading}>Cargando...</div>
            : <>
              {/* Métricas */}
              <div className={styles.metrics}>
                <div className={styles.metric}>
                  <div className={styles.metricVal} style={{ color: 'var(--success)' }}>
                    {fmt(cobrosRealizados.total)}
                  </div>
                  <div className={styles.metricLabel}>Total cobrado</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricVal}>{cobrosRealizados.cant}</div>
                  <div className={styles.metricLabel}>Cobros realizados</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricVal}>
                    {cobrosRealizados.cant
                      ? fmt(cobrosRealizados.total / cobrosRealizados.cant)
                      : '$0'}
                  </div>
                  <div className={styles.metricLabel}>Promedio por cobro</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricVal}>{cobrosRealizados.porMedio.length}</div>
                  <div className={styles.metricLabel}>Medios de pago usados</div>
                </div>
              </div>

              {/* Gráfico por medio de pago */}
              {cobrosRealizados.porMedio.length > 0 && (
                <div className={styles.chartCard}>
                  <div className={styles.chartTitle}>Total cobrado por medio de pago</div>
                  <BarChart
                    data={cobrosRealizados.porMedio.map(m => ({ label: m.medio, total: m.total }))}
                    labelKey="label" valueKey="total" fmt={fmt}
                    colorFn={(_, i) => {
                      const cols = ['var(--accent)', 'var(--success)', 'var(--warning)', '#a78bfa', '#f472b6']
                      return cols[i % cols.length]
                    }}
                  />
                </div>
              )}

              {/* Tabla agrupada por medio de pago */}
              {cobrosRealizados.porMedio.length > 0 && (
                <div className={styles.tableCard} style={{ marginBottom: 14 }}>
                  <div className={styles.tableTitle}>Resumen por medio de pago</div>
                  <div className={styles.table}>
                    <div className={styles.tableHead} style={{ gridTemplateColumns: '1fr 80px 120px' }}>
                      <span>Medio de pago</span>
                      <span>Cobros</span>
                      <span>Total</span>
                    </div>
                    {cobrosRealizados.porMedio.map((m, i) => (
                      <div key={i} className={styles.tableRow} style={{ gridTemplateColumns: '1fr 80px 120px' }}>
                        <span className={styles.nameCell}>{m.medio}</span>
                        <span className={styles.cell}>{m.cant}</span>
                        <span className={styles.montoCell} style={{ color: 'var(--success)' }}>
                          {fmt(m.total)}
                        </span>
                      </div>
                    ))}
                    {/* Total */}
                    <div className={styles.tableRow} style={{
                      gridTemplateColumns: '1fr 80px 120px',
                      background: 'var(--bg3)', fontWeight: 600
                    }}>
                      <span className={styles.nameCell}>TOTAL</span>
                      <span className={styles.cell}>{cobrosRealizados.cant}</span>
                      <span className={styles.montoCell} style={{ color: 'var(--success)' }}>
                        {fmt(cobrosRealizados.total)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Tabla detalle de cobros */}
              {cobrosRealizados.rows.length > 0 && (
                <div className={styles.tableCard}>
                  <div className={styles.tableTitle}>Detalle de cobros</div>
                  <div className={styles.table}>
                    <div className={styles.tableHead} style={{ gridTemplateColumns: '50px 1.5fr 120px 110px 120px' }}>
                      <span>#</span>
                      <span>Cliente</span>
                      <span>Fecha</span>
                      <span>Medio</span>
                      <span>Monto</span>
                    </div>
                    {cobrosRealizados.rows.map((p, i) => (
                      <div key={i} className={styles.tableRow}
                        style={{ gridTemplateColumns: '50px 1.5fr 120px 110px 120px' }}>
                        <span className={styles.idCell}>#{p.ventas?.idventa}</span>
                        <span className={styles.nameCell}>{p.ventas?.clientes?.nombre || '—'}</span>
                        <span className={styles.cell}>
                          {p.fechapago ? new Date(p.fechapago).toLocaleDateString('es-AR', {
                            day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
                          }) : '—'}
                        </span>
                        <span className={styles.cell}>{p.mediospagos?.mediopago || '—'}</span>
                        <span className={styles.montoCell} style={{ color: 'var(--success)' }}>
                          {fmt(p.monto)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {cobrosRealizados.rows.length === 0 && (
                <div className={styles.empty}>No hay cobros registrados en el período seleccionado.</div>
              )}
            </>
          }
        </div>
      )}

      {/* ══ REPORTE JORNADAS ══ */}
      {tab === 'jornadas' && (
        <div>
          {loading
            ? <div className={styles.loading}>Cargando...</div>
            : <>
              {/* Métricas */}
              <div className={styles.metrics}>
                <div className={styles.metric}>
                  <div className={styles.metricVal}>{jornadasData.length}</div>
                  <div className={styles.metricLabel}>Jornadas registradas</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricVal}>
                    {jornadasData.reduce((s, j) => s + (j.masas_total || 0), 0)}
                  </div>
                  <div className={styles.metricLabel}>Masas totales</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricVal}>
                    {jornadasData.length
                      ? Math.round(jornadasData.reduce((s, j) => s + (j.masas_total || 0), 0) / jornadasData.length)
                      : 0}
                  </div>
                  <div className={styles.metricLabel}>Promedio por jornada</div>
                </div>
                <div className={styles.metric}>
                  <div className={styles.metricVal}>{jornadasData.filter(j => j.estado === 'cerrada').length}</div>
                  <div className={styles.metricLabel}>Jornadas cerradas</div>
                </div>
              </div>

              {/* Gráfico masas por día */}
              {jornadasData.length > 0 && (
                <div className={styles.chartCard}>
                  <div className={styles.chartTitle}>Masas producidas por jornada</div>
                  <BarChart
                    data={[...jornadasData].reverse().slice(-15).map(j => ({
                      label: fmtFecha(j.fecha),
                      total: j.masas_total || 0,
                      estado: j.estado,
                    }))}
                    labelKey="label" valueKey="total"
                    colorFn={(d) => d.estado === 'abierta' ? 'var(--warning)' : 'var(--success)'}
                  />
                </div>
              )}

              {/* Tabla jornadas */}
              {jornadasData.length > 0 && (
                <div className={styles.tableCard}>
                  <div className={styles.tableTitle}>Historial completo</div>
                  <div className={styles.table}>
                    <div className={styles.tableHead}
                      style={{ gridTemplateColumns: '110px 80px 80px 90px 90px 1fr' }}>
                      <span>Fecha</span><span>Estado</span><span>Masas</span>
                      <span>Apertura</span><span>Cierre</span><span>Producción</span>
                    </div>
                    {jornadasData.map(j => (
                      <div key={j.id} className={styles.tableRow}
                        style={{ gridTemplateColumns: '110px 80px 80px 90px 90px 1fr' }}>
                        <span className={styles.nameCell}>{fmtFecha(j.fecha)}</span>
                        <span>
                          <span className={`badge ${j.estado === 'abierta' ? 'badge-pending' : 'badge-ok'}`}>
                            {j.estado === 'abierta' ? 'Abierta' : 'Cerrada'}
                          </span>
                        </span>
                        <span className={styles.montoCell}>{j.masas_total}</span>
                        <span className={styles.cell}>{fmtHora(j.abierta_at)}</span>
                        <span className={styles.cell}>{j.cerrada_at ? fmtHora(j.cerrada_at) : '—'}</span>
                        <span className={styles.cell}>
                          {j.jornada_produccion?.length > 0
                            ? j.jornada_produccion.map(p => `${p.productos?.producto} (${p.cantidad}u)`).join(' · ')
                            : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {jornadasData.length === 0 && (
                <div className={styles.empty}>No hay jornadas registradas aún.</div>
              )}
            </>
          }
        </div>
      )}
    </div>
  )
}
