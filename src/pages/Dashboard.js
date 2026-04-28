import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const [metrics, setMetrics] = useState(null)
  const [ventas,  setVentas]  = useState([])
  const [stock,   setStock]   = useState([])
  const [cobros,  setCobros]  = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const hoy = new Date()
      const primeroDeMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString()
      const hoyISO = hoy.toISOString().split('T')[0]

      // Ventas del mes
      const { data: ventasMes } = await supabase
        .from('ventas')
        .select('montoventa, montopendiente, estado, fecha')
        .gte('fecha', primeroDeMes)

      // Últimas 5 ventas
      const { data: ultimasVentas } = await supabase
        .from('ventas')
        .select('idventa, fecha, montoventa, estado, clientes(nombre)')
        .order('fecha', { ascending: false })
        .limit(5)

      // Cobros pendientes
      const { data: pendientes } = await supabase
        .from('ventas')
        .select('idventa, cliente, montopendiente, fecha, clientes(nombre)')
        .gt('montopendiente', 0)
        .order('fecha', { ascending: false })
        .limit(4)

      // Stock
      const { data: stockData } = await supabase
        .from('stock')
        .select('idproducto, lote, cantidad, productos(producto)')
        .order('cantidad', { ascending: true })
        .limit(5)

      // Métricas calculadas
      const totalMes       = ventasMes?.reduce((s, v) => s + (v.montoventa || 0), 0) || 0
      const totalPendiente = ventasMes?.reduce((s, v) => s + (v.montopendiente || 0), 0) || 0
      const ventasHoy      = ventasMes?.filter(v => v.fecha?.startsWith(hoyISO)) || []
      const totalHoy       = ventasHoy.reduce((s, v) => s + (v.montoventa || 0), 0)
      const totalStock     = stockData?.reduce((s, r) => s + (r.cantidad || 0), 0) || 0
      const lotesLow       = stockData?.filter(r => r.cantidad < 20).length || 0

      setMetrics({ totalMes, totalPendiente, totalHoy, cantHoy: ventasHoy.length, totalStock, lotesLow })
      setVentas(ultimasVentas || [])
      setCobros(pendientes || [])
      setStock(stockData || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className={styles.loading}>Cargando datos...</div>

  const fmt = (n) => '$' + Number(n || 0).toLocaleString('es-AR')
  const fmtFecha = (s) => {
    if (!s) return ''
    const d = new Date(s)
    const hoy = new Date()
    const ayer = new Date(); ayer.setDate(hoy.getDate() - 1)
    if (d.toDateString() === hoy.toDateString()) return 'Hoy ' + d.toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'})
    if (d.toDateString() === ayer.toDateString()) return 'Ayer ' + d.toLocaleTimeString('es-AR', {hour:'2-digit', minute:'2-digit'})
    return d.toLocaleDateString('es-AR', {day:'2-digit', month:'short'})
  }

  const maxStock = Math.max(...stock.map(s => s.cantidad || 0), 1)

  return (
    <div className={styles.wrap}>
      {/* Métricas */}
      <div className={styles.metrics}>
        <MetricCard label="Ventas del mes"      value={fmt(metrics.totalMes)}       delta="+12% vs mes ant." deltaUp />
        <MetricCard label="Cobros pendientes"   value={fmt(metrics.totalPendiente)} delta={`${cobros.length} ventas`} deltaDown={metrics.totalPendiente > 0} />
        <MetricCard label="Ventas hoy"          value={fmt(metrics.totalHoy)}       delta={`${metrics.cantHoy} venta${metrics.cantHoy !== 1 ? 's' : ''}`} deltaUp />
        <MetricCard label="Unidades en stock"   value={`${metrics.totalStock} u.`}  delta={metrics.lotesLow > 0 ? `${metrics.lotesLow} lotes bajo` : 'Stock OK'} deltaDown={metrics.lotesLow > 0} />
      </div>

      <div className={styles.grid2}>
        {/* Últimas ventas */}
        <div className="card">
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Últimas ventas</span>
          </div>
          {ventas.length === 0
            ? <p style={{color:'var(--text3)', fontSize:13}}>No hay ventas registradas aún.</p>
            : ventas.map(v => (
              <div key={v.idventa} className={styles.ventaRow}>
                <div>
                  <div className={styles.ventaCliente}>{v.clientes?.nombre || '—'}</div>
                  <div className={styles.ventaFecha}>{fmtFecha(v.fecha)}</div>
                </div>
                <div style={{textAlign:'right'}}>
                  <div className={styles.ventaMonto}>{fmt(v.montoventa)}</div>
                  <span className={`badge ${v.estado === 'Pagado' ? 'badge-ok' : 'badge-pending'}`}>
                    {v.estado || 'Pendiente'}
                  </span>
                </div>
              </div>
            ))
          }
        </div>

        {/* Stock */}
        <div className="card">
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Stock por producto</span>
          </div>
          {stock.length === 0
            ? <p style={{color:'var(--text3)', fontSize:13}}>No hay datos de stock.</p>
            : stock.map((s, i) => {
              const pct = Math.round((s.cantidad / maxStock) * 100)
              const color = pct < 15 ? 'var(--danger)' : pct < 35 ? 'var(--warning)' : 'var(--success)'
              return (
                <div key={i} className={styles.stockRow}>
                  <div className={styles.stockName}>{s.productos?.producto || s.idproducto}</div>
                  <div className={styles.stockLote}>{s.lote}</div>
                  <div className={styles.stockBarWrap}>
                    <div className={styles.stockBar} style={{width:`${pct}%`, background: color}} />
                  </div>
                  <div className={styles.stockQty}>{s.cantidad} u.</div>
                </div>
              )
            })
          }
        </div>
      </div>

      {/* Cobros pendientes */}
      {cobros.length > 0 && (
        <div className="card" style={{marginTop:12}}>
          <div className={styles.cardHeader}>
            <span className={styles.cardTitle}>Cobros pendientes</span>
          </div>
          <div className={styles.cobrosGrid}>
            {cobros.map(c => (
              <div key={c.idventa} className={styles.cobroItem}>
                <div>
                  <div className={styles.ventaCliente}>{c.clientes?.nombre}</div>
                  <div className={styles.ventaFecha}>Venta #{c.idventa} · {fmtFecha(c.fecha)}</div>
                </div>
                <div style={{color:'var(--danger)', fontWeight:500, fontSize:13}}>{fmt(c.montopendiente)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value, delta, deltaUp, deltaDown }) {
  return (
    <div className={styles.metricCard}>
      <div className={styles.metricLabel}>{label}</div>
      <div className={styles.metricVal}>{value}</div>
      <div className={styles.metricDelta} style={{
        color: deltaUp ? 'var(--success)' : deltaDown ? 'var(--danger)' : 'var(--text3)'
      }}>{delta}</div>
    </div>
  )
}
