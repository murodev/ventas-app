import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import styles from './Stock.module.css'

const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const ICONS = {
  plus:    'M12 5v14M5 12h14',
  edit:    'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z',
  trash:   'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  check:   'M20 6L9 17l-5-5',
  close:   'M18 6L6 18M6 6l12 12',
  search:  'M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z',
  box:     'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  warning: 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01',
  history: 'M12 8v4l3 3M3.05 11a9 9 0 109.9-8.95',
}

export default function Stock() {
  const [stock,      setStock]      = useState([])
  const [productos,  setProductos]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [busq,       setBusq]       = useState('')
  const [filtro,     setFiltro]     = useState('todos') // todos | bajo | agotado
  const [modal,      setModal]      = useState(null)    // null | 'movimiento' | 'nuevo' | 'editar'
  const [selected,   setSelected]   = useState(null)
  const [form,       setForm]       = useState({ idproducto: '', lote: '', cantidad: '' })
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')
  const [tipoMov,    setTipoMov]    = useState('agregar')
  const [cantMov,    setCantMov]    = useState('')
  const [historial,  setHistorial]  = useState([])
  const [loadingHist,setLoadingHist]= useState(false)
  const [showHist,   setShowHist]   = useState(false)

  const cargar = async () => {
    setLoading(true)
    const { data: s } = await supabase
      .from('stock')
      .select('id, idproducto, lote, cantidad, productos(producto)')
      .order('cantidad', { ascending: true })
    const { data: p } = await supabase
      .from('productos')
      .select('idproducto, producto')
      .order('producto')
    setStock(s || [])
    setProductos(p || [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const filtrados = stock.filter(s => {
    const nombre = s.productos?.producto || ''
    const matchBusq = `${nombre} ${s.lote}`.toLowerCase().includes(busq.toLowerCase())
    const matchFiltro = filtro === 'todos' ? true
      : filtro === 'bajo'    ? s.cantidad > 0 && s.cantidad < 20
      : filtro === 'agotado' ? s.cantidad <= 0
      : true
    return matchBusq && matchFiltro
  })

  const totalUnidades = stock.reduce((s, r) => s + (r.cantidad || 0), 0)
  const lotesBajos    = stock.filter(r => r.cantidad > 0 && r.cantidad < 20).length
  const lotesAgotados = stock.filter(r => r.cantidad <= 0).length

  const abrirNuevo = () => {
    setForm({ idproducto: '', lote: '', cantidad: '' })
    setError('')
    setModal('nuevo')
  }

  const abrirEditar = (s) => {
    setSelected(s)
    setForm({ idproducto: s.idproducto, lote: s.lote, cantidad: s.cantidad })
    setError('')
    setShowHist(false)
    setModal('editar')
  }

  const abrirMovimiento = (s) => {
    setSelected(s)
    setTipoMov('agregar')
    setCantMov('')
    setError('')
    setModal('movimiento')
  }

  const registrarMovimiento = async () => {
    setError('')
    const cant = Number(cantMov)
    if (!cant || cant <= 0) return setError('Ingresá una cantidad válida.')
    if (tipoMov === 'quitar' && cant > selected.cantidad)
      return setError(`No podés quitar más de lo que hay (${selected.cantidad} u.).`)
    setSaving(true)
    try {
      const nuevaCant = tipoMov === 'agregar'
        ? selected.cantidad + cant
        : Math.max(0, selected.cantidad - cant)
      await supabase.from('stock').update({ cantidad: nuevaCant }).eq('id', selected.id)
      await cargar()
      setModal(null)
    } catch (e) {
      setError('Error: ' + (e.message || 'intentá de nuevo.'))
    } finally {
      setSaving(false)
    }
  }

  const verHistorial = async (s) => {
    setSelected(s)
    setModal('editar')
    setShowHist(true)
    setLoadingHist(true)
    setForm({ idproducto: s.idproducto, lote: s.lote, cantidad: s.cantidad })
    const { data } = await supabase
      .from('detalleventas')
      .select('idventa, cantidad, precio, fecha_ins, ventas(fecha, estado)')
      .eq('idproducto', s.idproducto)
      .eq('lote', s.lote)
      .order('fecha_ins', { ascending: false })
      .limit(10)
    setHistorial(data || [])
    setLoadingHist(false)
  }

  const guardar = async () => {
    setError('')
    if (!form.idproducto) return setError('Seleccioná un producto.')
    if (!form.lote.trim()) return setError('Ingresá el lote.')
    if (form.cantidad === '' || Number(form.cantidad) < 0) return setError('Ingresá una cantidad válida.')
    setSaving(true)
    try {
      if (modal === 'nuevo') {
        // verificar si ya existe ese producto+lote
        const { data: existe } = await supabase
          .from('stock')
          .select('id, cantidad')
          .eq('idproducto', form.idproducto)
          .eq('lote', form.lote)
          .single()

        if (existe) {
          // sumar al existente
          await supabase.from('stock')
            .update({ cantidad: existe.cantidad + Number(form.cantidad) })
            .eq('id', existe.id)
        } else {
          await supabase.from('stock').insert({
            idproducto: Number(form.idproducto),
            lote:       form.lote.trim(),
            cantidad:   Number(form.cantidad),
          })
        }
      } else {
        await supabase.from('stock')
          .update({ cantidad: Number(form.cantidad), lote: form.lote.trim() })
          .eq('id', selected.id)
      }
      await cargar()
      setModal(null)
    } catch (e) {
      setError('Error al guardar: ' + (e.message || 'intentá de nuevo.'))
    } finally {
      setSaving(false)
    }
  }

  const eliminar = async () => {
    await supabase.from('stock').delete().eq('id', selected.id)
    await cargar()
    setModal(null)
  }

  const pct = (cantidad) => {
    const max = Math.max(...stock.map(s => s.cantidad), 1)
    return Math.round((cantidad / max) * 100)
  }
  const barColor = (cantidad) =>
    cantidad <= 0    ? 'var(--danger)'  :
    cantidad < 20    ? 'var(--warning)' : 'var(--success)'

  const fmtFecha = (s) => s ? new Date(s).toLocaleDateString('es-AR', { day:'2-digit', month:'short', year:'numeric' }) : '—'
  const fmt = (n) => '$' + Number(n || 0).toLocaleString('es-AR')

  return (
    <div className={styles.wrap}>

      {/* Métricas */}
      <div className={styles.metrics}>
        <div className={styles.metric}>
          <div className={styles.metricVal}>{totalUnidades.toLocaleString('es-AR')}</div>
          <div className={styles.metricLabel}>Unidades totales</div>
        </div>
        <div className={styles.metric} style={{ cursor:'pointer' }} onClick={() => setFiltro('bajo')}>
          <div className={styles.metricVal} style={{ color: lotesBajos > 0 ? 'var(--warning)' : 'var(--text)' }}>
            {lotesBajos}
          </div>
          <div className={styles.metricLabel}>Lotes con stock bajo</div>
        </div>
        <div className={styles.metric} style={{ cursor:'pointer' }} onClick={() => setFiltro('agotado')}>
          <div className={styles.metricVal} style={{ color: lotesAgotados > 0 ? 'var(--danger)' : 'var(--text)' }}>
            {lotesAgotados}
          </div>
          <div className={styles.metricLabel}>Lotes agotados</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricVal}>{stock.length}</div>
          <div className={styles.metricLabel}>Lotes registrados</div>
        </div>
      </div>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.searchWrap}>
          <Icon d={ICONS.search} size={14} />
          <input type="text" placeholder="Buscar producto o lote..."
            value={busq} onChange={e => setBusq(e.target.value)} />
        </div>
        <div className={styles.filtros}>
          {['todos','bajo','agotado'].map(f => (
            <button key={f} className={`${styles.filtroBtn} ${filtro === f ? styles.active : ''}`}
              onClick={() => setFiltro(f)}>
              {f === 'todos' ? 'Todos' : f === 'bajo' ? '⚠ Bajo' : '✕ Agotado'}
            </button>
          ))}
        </div>
        {/* <button className="btn btn-primary" onClick={abrirNuevo}>
          <Icon d={ICONS.plus} size={14} /> Agregar stock
        </button> */}
      </div>

      {/* Tabla */}
      {loading
        ? <div className={styles.empty}>Cargando...</div>
        : filtrados.length === 0
          ? <div className={styles.empty}>No hay lotes que coincidan.</div>
          : <div className={styles.table}>
              <div className={styles.tableHead}>
                <span>Producto</span>
                <span>Lote</span>
                <span>Stock</span>
                <span>Nivel</span>
                <span></span>
              </div>
              {filtrados.map(s => (
                <div key={s.id} className={styles.tableRow}>
                  <div className={styles.prodCell}>
                    <div className={styles.prodIcon}><Icon d={ICONS.box} size={14} /></div>
                    <span className={styles.prodNombre}>{s.productos?.producto || '—'}</span>
                  </div>
                  <span className={styles.lote}>{s.lote}</span>
                  <div className={styles.cantCell}>
                    <span className={styles.cant} style={{ color: barColor(s.cantidad) }}>
                      {s.cantidad} u.
                    </span>
                    {s.cantidad <= 0 && <span className="badge badge-danger">Agotado</span>}
                    {s.cantidad > 0 && s.cantidad < 20 && <span className="badge badge-pending">Stock bajo</span>}
                  </div>
                  <div className={styles.barWrap}>
                    <div className={styles.bar} style={{ width: `${pct(s.cantidad)}%`, background: barColor(s.cantidad) }} />
                  </div>
                  <div className={styles.actions}>
                    <button className={styles.movBtn} onClick={() => abrirMovimiento(s)} title="Agregar / Quitar">
                      <Icon d={ICONS.plus} size={16} />
                      <Icon d={ICONS.minus} size={16} />
                    </button>
                    <button className={styles.iconBtn} onClick={() => verHistorial(s)} title="Ver historial">
                      <Icon d={ICONS.history} size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
      }

      {/* Modal movimiento agregar/quitar */}
      {modal === 'movimiento' && selected && (
        <div className={styles.overlay} onClick={() => setModal(null)}>
          <div className={styles.modal} style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span>{selected.productos?.producto || '—'} · Lote {selected.lote}</span>
              <button className={styles.closeBtn} onClick={() => setModal(null)}>
                <Icon d={ICONS.close} size={16} />
              </button>
            </div>
            <div className={styles.modalBody}>
              {/* Stock actual */}
              <div className={styles.stockActual}>
                <span className={styles.stockLabel}>Stock actual</span>
                <span className={styles.stockVal} style={{ color: barColor(selected.cantidad) }}>
                  {selected.cantidad} u.
                </span>
              </div>

              {/* Selector agregar / quitar */}
              <div className={styles.tipoMovWrap}>
                <button
                  className={`${styles.tipoMovBtn} ${tipoMov === 'agregar' ? styles.tipoMovActive : ''}`}
                  onClick={() => setTipoMov('agregar')}>
                  <Icon d={ICONS.plus} size={14} /> Agregar
                </button>
                <button
                  className={`${styles.tipoMovBtn} ${tipoMov === 'quitar' ? styles.tipoMovActiveDanger : ''}`}
                  onClick={() => setTipoMov('quitar')}>
                  <Icon d={ICONS.minus} size={14} /> Quitar
                </button>
              </div>

              <div className="field">
                <label>Cantidad a {tipoMov}</label>
                <input type="number" min="1" step="1" placeholder="0"
                  value={cantMov} onChange={e => setCantMov(e.target.value)} autoFocus />
              </div>

              {/* Preview resultado */}
              {cantMov && Number(cantMov) > 0 && (
                <div className={styles.preview}>
                  <span>{selected.cantidad} u.</span>
                  <span style={{ color: tipoMov === 'agregar' ? 'var(--success)' : 'var(--danger)' }}>
                    {tipoMov === 'agregar' ? '+' : '−'}{cantMov} u.
                  </span>
                  <span style={{ fontWeight: 600 }}>
                    = {tipoMov === 'agregar'
                        ? selected.cantidad + Number(cantMov)
                        : Math.max(0, selected.cantidad - Number(cantMov))
                      } u.
                  </span>
                </div>
              )}

              {error && <div className="err" style={{ marginBottom: 10 }}>{error}</div>}

              <div className={styles.modalFooter}>
                <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
                <button
                  className={`btn ${tipoMov === 'agregar' ? 'btn-primary' : 'btn-danger'}`}
                  onClick={registrarMovimiento} disabled={saving}>
                  {saving ? 'Guardando...' : tipoMov === 'agregar'
                    ? <><Icon d={ICONS.plus} size={13} /> Agregar stock</>
                    : <><Icon d={ICONS.minus} size={13} /> Quitar stock</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal historial (solo lectura) */}
      {modal === 'editar' && selected && (
        <div className={styles.overlay} onClick={() => setModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span>Historial · {selected.productos?.producto} · Lote {selected.lote}</span>
              <button className={styles.closeBtn} onClick={() => setModal(null)}>
                <Icon d={ICONS.close} size={16} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.histSection}>
                <div className={styles.histTitle}>
                  <Icon d={ICONS.history} size={13} /> Últimas salidas de este lote
                </div>
                {loadingHist
                  ? <div className={styles.empty} style={{ padding: '12px 0' }}>Cargando...</div>
                  : historial.length === 0
                    ? <div className={styles.empty} style={{ padding: '12px 0' }}>Sin movimientos registrados.</div>
                    : historial.map((h, i) => (
                        <div key={i} className={styles.histRow}>
                          <div>
                            <div className={styles.histLabel}>Venta #{h.idventa}</div>
                            <div className={styles.histFecha}>{fmtFecha(h.fecha_ins)}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--danger)' }}>
                              −{h.cantidad} u.
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text3)' }}>{fmt(h.precio)} c/u</div>
                          </div>
                        </div>
                      ))
                }
              </div>
              <div className={styles.modalFooter}>
                <div style={{ flex: 1 }} />
                <button className="btn btn-ghost" onClick={() => setModal(null)}>Cerrar</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
