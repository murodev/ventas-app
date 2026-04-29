import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import styles from './Cobros.module.css'

const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const ICONS = {
  check:   'M20 6L9 17l-5-5',
  close:   'M18 6L6 18M6 6l12 12',
  search:  'M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z',
  money:   'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  plus:    'M12 5v14M5 12h14',
  history: 'M12 8v4l3 3M3.05 11a9 9 0 109.9-8.95',
  truck:   'M1 3h15v13H1zM16 8h4l3 3v5h-7V8zM5.5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM18.5 19a1.5 1.5 0 100-3 1.5 1.5 0 000 3z',
}

export default function Cobros() {
  const [ventas,      setVentas]      = useState([])
  const [mediosPago,  setMediosPago]  = useState([])
  const [loading,     setLoading]     = useState(true)
  const [busq,        setBusq]        = useState('')
  const [filtro,      setFiltro]      = useState('pendiente') // pendiente | parcial | todos
  const [modal,       setModal]       = useState(null)
  const [selected,    setSelected]    = useState(null)
  const [pagosHist,   setPagosHist]   = useState([])
  const [detalle,     setDetalle]     = useState([])
  const [loadingDet,  setLoadingDet]  = useState(false)
  const [nuevoPago,   setNuevoPago]   = useState({ monto: '', idmediopago: '' })
  const [saving,      setSaving]      = useState(false)
  const [error,       setError]       = useState('')
  const [entregado,   setEntregado]   = useState(false)

  const cargar = async () => {
    setLoading(true)
    const [{ data: v }, { data: m }] = await Promise.all([
      supabase
        .from('ventas')
        .select('idventa, fecha, montoventa, montopendiente, estado, entregado, idcliente, clientes(nombre, alias)')
        .order('fecha', { ascending: false }),
      supabase.from('mediospagos').select('idmediopago, mediopago'),
    ])
    setVentas(v || [])
    setMediosPago(m || [])
    setLoading(false)
  }

  // Recarga solo la tabla sin tocar el modal ni loading
  const recargarTabla = async () => {
    const { data: v } = await supabase
      .from('ventas')
      .select('idventa, fecha, montoventa, montopendiente, estado, entregado, idcliente, clientes(nombre, alias)')
      .order('fecha', { ascending: false })
    setVentas(v || [])
  }

  useEffect(() => { cargar() }, [])

  const filtradas = ventas.filter(v => {
    const nombre = v.clientes?.nombre || ''
    const matchBusq = `${nombre} ${v.idventa}`.toLowerCase().includes(busq.toLowerCase())
    const matchFiltro =
      filtro === 'todos'     ? true :
      filtro === 'pendiente' ? v.estado === 'Pendiente' :
      filtro === 'parcial'   ? v.estado === 'Parcial' : true
    return matchBusq && matchFiltro
  })

  const totalPendiente = ventas
    .filter(v => v.estado !== 'Pagado')
    .reduce((s, v) => s + (v.montopendiente || 0), 0)
  const cantPendientes = ventas.filter(v => v.estado === 'Pendiente').length
  const cantParciales  = ventas.filter(v => v.estado === 'Parcial').length

  const abrirModal = async (v) => {
    setSelected(v)
    setNuevoPago({ monto: '', idmediopago: '' })
    setError('')
    setEntregado(v.entregado || false)
    setModal('cobro')
    setLoadingDet(true)

    const [{ data: pagos }, { data: det }] = await Promise.all([
      supabase
        .from('pagos')
        .select('idpago, monto, fechapago, mediospagos(mediopago)')
        .eq('idventa', v.idventa)
        .order('fechapago', { ascending: false }),
      supabase
        .from('detalleventas')
        .select('idproducto, cantidad, precio, lote, productos(producto)')
        .eq('idventa', v.idventa),
    ])
    setPagosHist(pagos || [])
    setDetalle(det || [])
    setLoadingDet(false)
  }

  const registrarPago = async () => {
    setError('')
    const monto = Number(nuevoPago.monto)
    if (!monto || monto <= 0) return setError('Ingresá un monto válido.')
    if (!nuevoPago.idmediopago) return setError('Seleccioná el medio de pago.')
    if (monto > selected.montopendiente) return setError(`El monto no puede superar el pendiente (${fmt(selected.montopendiente)}).`)

    setSaving(true)
    try {
      // 1. Insertar pago
      const { error: errPago } = await supabase.from('pagos').insert({
        idventa:     selected.idventa,
        monto,
        idmediopago: Number(nuevoPago.idmediopago),
        fechapago:   new Date().toISOString(),
      })
      if (errPago) throw errPago

      // 2. Actualizar montopendiente y estado en ventas
      const nuevoPendiente = Math.max(0, selected.montopendiente - monto)
      const nuevoEstado    = nuevoPendiente <= 0 ? 'Pagado'
        : nuevoPendiente < selected.montoventa   ? 'Parcial' : 'Pendiente'

      const { error: errVenta } = await supabase
        .from('ventas')
        .update({
          montopendiente: nuevoPendiente,
          estado:         nuevoEstado,
          entregado,
          fecha_act:      new Date().toISOString(),
        })
        .eq('idventa', selected.idventa)
      if (errVenta) throw errVenta

      // 3. Leer la venta actualizada directo de Supabase para evitar caché
      const { data: ventaFresca } = await supabase
        .from('ventas')
        .select('idventa, fecha, montoventa, montopendiente, estado, entregado, idcliente, clientes(nombre, alias)')
        .eq('idventa', selected.idventa)
        .single()

      // 4. Leer los pagos actualizados directo de Supabase
      const { data: pagosFrescos } = await supabase
        .from('pagos')
        .select('idpago, monto, fechapago, mediospagos(mediopago)')
        .eq('idventa', selected.idventa)
        .order('fechapago', { ascending: false })

      // Actualizar modal con datos reales de la DB
      if (ventaFresca) setSelected(ventaFresca)
      if (pagosFrescos) setPagosHist(pagosFrescos)
      setNuevoPago({ monto: '', idmediopago: '' })

      // Recargar tabla en segundo plano sin interrumpir el modal
      recargarTabla()

      if (nuevoEstado === 'Pagado') setModal(null)
    } catch (e) {
      setError('Error: ' + (e.message || 'intentá de nuevo.'))
    } finally {
      setSaving(false)
    }
  }

  const marcarEntregado = async () => {
    await supabase.from('ventas').update({ entregado: !entregado }).eq('idventa', selected.idventa)
    setEntregado(e => !e)
    await cargar()
  }

  const fmt      = (n) => '$' + Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 0 })
  const fmtFecha = (s) => s ? new Date(s).toLocaleDateString('es-AR', { day:'2-digit', month:'short', year:'numeric' }) : '—'
  const fmtHora  = (s) => s ? new Date(s).toLocaleTimeString('es-AR', { hour:'2-digit', minute:'2-digit' }) : ''

  const estadoColor = (e) =>
    e === 'Pagado'   ? 'var(--success)' :
    e === 'Parcial'  ? 'var(--warning)' : 'var(--danger)'
  const estadoBadge = (e) =>
    e === 'Pagado' ? 'badge-ok' : e === 'Parcial' ? 'badge-pending' : 'badge-danger'

  return (
    <div className={styles.wrap}>

      {/* Métricas */}
      <div className={styles.metrics}>
        <div className={styles.metric}>
          <div className={styles.metricVal} style={{ color: 'var(--danger)' }}>{fmt(totalPendiente)}</div>
          <div className={styles.metricLabel}>Total a cobrar</div>
        </div>
        <div className={styles.metric} style={{ cursor:'pointer' }} onClick={() => setFiltro('pendiente')}>
          <div className={styles.metricVal}>{cantPendientes}</div>
          <div className={styles.metricLabel}>Ventas sin cobrar</div>
        </div>
        <div className={styles.metric} style={{ cursor:'pointer' }} onClick={() => setFiltro('parcial')}>
          <div className={styles.metricVal}>{cantParciales}</div>
          <div className={styles.metricLabel}>Cobros parciales</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricVal}>{ventas.filter(v => v.estado === 'Pagado').length}</div>
          <div className={styles.metricLabel}>Ventas cobradas</div>
        </div>
      </div>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.searchWrap}>
          <Icon d={ICONS.search} size={14} />
          <input type="text" placeholder="Buscar cliente o # de venta..."
            value={busq} onChange={e => setBusq(e.target.value)} />
        </div>
        <div className={styles.filtros}>
          {[['pendiente','Sin cobrar'],['parcial','Parciales'],['todos','Todas']].map(([f, label]) => (
            <button key={f} className={`${styles.filtroBtn} ${filtro === f ? styles.active : ''}`}
              onClick={() => setFiltro(f)}>{label}</button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {loading
        ? <div className={styles.empty}>Cargando...</div>
        : filtradas.length === 0
          ? <div className={styles.empty}>No hay ventas que coincidan.</div>
          : <div className={styles.table}>
              <div className={styles.tableHead}>
                <span>#</span>
                <span>Cliente</span>
                <span>Fecha</span>
                <span>Total</span>
                <span>Pendiente</span>
                <span>Estado</span>
                <span>Entregado</span>
                <span></span>
              </div>
              {filtradas.map(v => (
                <div key={v.idventa} className={styles.tableRow}>
                  <span className={styles.idVenta}>#{v.idventa}</span>
                  <div className={styles.clienteCell}>
                    <div className={styles.clienteNombre}>{v.clientes?.nombre || '—'}</div>
                    {v.clientes?.alias && <div className={styles.clienteAlias}>{v.clientes.alias}</div>}
                  </div>
                  <span className={styles.fecha}>{fmtFecha(v.fecha)}</span>
                  <span className={styles.monto}>{fmt(v.montoventa)}</span>
                  <span className={styles.pendiente} style={{ color: v.montopendiente > 0 ? 'var(--danger)' : 'var(--success)' }}>
                    {fmt(v.montopendiente)}
                  </span>
                  <span><span className={`badge ${estadoBadge(v.estado)}`}>{v.estado}</span></span>
                  <span style={{ fontSize: 12, color: v.entregado ? 'var(--success)' : 'var(--text3)' }}>
                    {v.entregado ? '✓ Sí' : '— No'}
                  </span>
                  <button className={`btn btn-ghost ${styles.cobrarBtn}`}
                    onClick={() => abrirModal(v)}
                    disabled={v.estado === 'Pagado'}>
                    {v.estado === 'Pagado' ? 'Cobrado' : <><Icon d={ICONS.money} size={13} /> Cobrar</>}
                  </button>
                </div>
              ))}
            </div>
      }

      {/* Modal cobro */}
      {modal === 'cobro' && selected && (
        <div className={styles.overlay} onClick={() => setModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div>
                <span className={styles.modalTitle}>Venta #{selected.idventa}</span>
                <span className={`badge ${estadoBadge(selected.estado)}`} style={{ marginLeft: 8 }}>{selected.estado}</span>
              </div>
              <button className={styles.closeBtn} onClick={() => setModal(null)}>
                <Icon d={ICONS.close} size={16} />
              </button>
            </div>

            <div className={styles.modalBody}>
              {/* Info cliente y totales */}
              <div className={styles.infoBar}>
                <div>
                  <div className={styles.infoLabel}>Cliente</div>
                  <div className={styles.infoVal}>{selected.clientes?.nombre}</div>
                </div>
                <div>
                  <div className={styles.infoLabel}>Total venta</div>
                  <div className={styles.infoVal}>{fmt(selected.montoventa)}</div>
                </div>
                <div>
                  <div className={styles.infoLabel}>Pendiente</div>
                  <div className={styles.infoVal} style={{ color: selected.montopendiente > 0 ? 'var(--danger)' : 'var(--success)' }}>
                    {fmt(selected.montopendiente)}
                  </div>
                </div>
                <div>
                  <div className={styles.infoLabel}>Fecha</div>
                  <div className={styles.infoVal}>{fmtFecha(selected.fecha)}</div>
                </div>
              </div>

              {/* Detalle de productos */}
              {loadingDet
                ? <div className={styles.empty} style={{ padding: '12px 0' }}>Cargando...</div>
                : detalle.length > 0 && (
                  <div className={styles.detalleSection}>
                    <div className={styles.sectionLabel}>Productos vendidos</div>
                    {detalle.map((d, i) => (
                      <div key={i} className={styles.detalleRow}>
                        <span className={styles.detalleNombre}>{d.productos?.producto || '—'}</span>
                        <span className={styles.detalleLote}>{d.lote}</span>
                        <span className={styles.detalleCant}>{d.cantidad} u.</span>
                        <span className={styles.detallePrecio}>{fmt(d.precio)} c/u</span>
                        <span className={styles.detalleSubtotal}>{fmt(d.cantidad * d.precio)}</span>
                      </div>
                    ))}
                  </div>
                )
              }

              {/* Entregado */}
              <div className={styles.entregadoRow}>
                <label className={styles.checkLabel}>
                  <input type="checkbox" checked={entregado} onChange={marcarEntregado} />
                  <span>Mercadería entregada</span>
                </label>
              </div>

              {/* Historial de pagos */}
              {pagosHist.length > 0 && (
                <div className={styles.histSection}>
                  <div className={styles.sectionLabel}>
                    <Icon d={ICONS.history} size={12} /> Pagos registrados
                  </div>
                  {pagosHist.map((p, i) => (
                    <div key={i} className={styles.histRow}>
                      <div>
                        <div className={styles.histMedio}>{p.mediospagos?.mediopago || '—'}</div>
                        <div className={styles.histFecha}>{fmtFecha(p.fechapago)} {fmtHora(p.fechapago)}</div>
                      </div>
                      <div className={styles.histMonto} style={{ color: 'var(--success)' }}>+{fmt(p.monto)}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Nuevo pago */}
              {selected.estado !== 'Pagado' && (
                <div className={styles.nuevoPagoSection}>
                  <div className={styles.sectionLabel}>
                    <Icon d={ICONS.plus} size={12} /> Registrar cobro
                  </div>
                  <div className={styles.pagoForm}>
                    <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                      <label>Medio de pago</label>
                      <select value={nuevoPago.idmediopago}
                        onChange={e => setNuevoPago(p => ({ ...p, idmediopago: e.target.value }))}>
                        <option value="">Seleccioná...</option>
                        {mediosPago.map(m => (
                          <option key={m.idmediopago} value={m.idmediopago}>{m.mediopago}</option>
                        ))}
                      </select>
                    </div>
                    <div className="field" style={{ width: 130, marginBottom: 0 }}>
                      <label>Monto</label>
                      <input type="number" placeholder="0"
                        value={nuevoPago.monto}
                        onChange={e => setNuevoPago(p => ({ ...p, monto: e.target.value }))} />
                    </div>
                    <button className="btn btn-primary" style={{ alignSelf: 'flex-end' }}
                      onClick={registrarPago} disabled={saving}>
                      {saving ? '...' : <><Icon d={ICONS.check} size={13} /> Registrar</>}
                    </button>
                  </div>
                  {/* Botón pagar todo */}
                  {selected.montopendiente > 0 && (
                    <button className={`btn btn-ghost ${styles.pagarTodoBtn}`}
                      onClick={() => setNuevoPago(p => ({ ...p, monto: selected.montopendiente }))}>
                      Completar con {fmt(selected.montopendiente)}
                    </button>
                  )}
                  {error && <div className="err" style={{ marginTop: 8 }}>{error}</div>}
                </div>
              )}

              {selected.estado === 'Pagado' && (
                <div className={styles.pagadoMsg}>
                  <Icon d={ICONS.check} size={18} /> Venta cobrada al 100%
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
