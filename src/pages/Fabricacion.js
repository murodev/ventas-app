import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import styles from './Fabricacion.module.css'

const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)
const ICONS = {
  open:    'M8 11V7a4 4 0 018 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z',
  close:   'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zM12 3a3 3 0 00-3 3v4h6V6a3 3 0 00-3-3z',
  plus:    'M12 5v14M5 12h14',
  check:   'M20 6L9 17l-5-5',
  trash:   'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  flask:   'M9 3h6M9 3v6l-4 9a1 1 0 00.9 1.45h12.2A1 1 0 0024 18l-4-9V3',
  box:     'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
  warning: 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01',
  history: 'M12 8v4l3 3M3.05 11a9 9 0 109.9-8.95',
  bread:   'M3 11l19-9-9 19-2-8-8-2z',
}

export default function Fabricacion() {
  const [jornada,      setJornada]      = useState(null)   // jornada de hoy
  const [insumos,      setInsumos]      = useState([])     // todos los insumos con porcionreceta
  const [productos,    setProductos]    = useState([])
  const [masasHoy,     setMasasHoy]     = useState([])     // movimientos del día
  const [historial,    setHistorial]    = useState([])     // jornadas pasadas
  const [loading,      setLoading]      = useState(true)

  // Modales
  const [modal,        setModal]        = useState(null)   // 'abrir'|'agregar'|'cerrar'|'detalle'
  const [selectedJorn, setSelectedJorn] = useState(null)
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')

  // Form abrir tienda
  const [masasAbrir,   setMasasAbrir]   = useState('')
  const [notaAbrir,    setNotaAbrir]    = useState('')

  // Form agregar masas
  const [masasAgregar, setMasasAgregar] = useState('')
  const [notaAgregar,  setNotaAgregar]  = useState('')

  // Form cerrar - producción por producto
  const [produccion,   setProduccion]   = useState([])     // [{idproducto, lote, cantidad}]

  const cargar = useCallback(async () => {
    setLoading(true)
    const hoy = new Date().toISOString().split('T')[0]

    const [{ data: jorns }, { data: ins }, { data: prods }, { data: hist }] = await Promise.all([
      supabase.from('jornadas').select('*').eq('fecha', hoy).eq('estado', 'abierta').order('abierta_at', { ascending: false }).limit(1),
      supabase.from('insumos').select('*').not('porcionreceta', 'is', null).order('insumo'),
      supabase.from('productos').select('idproducto, producto').order('producto'),
      supabase.from('jornadas').select(`
        id, fecha, estado, masas_total, abierta_at, cerrada_at,
        jornada_produccion(idproducto, lote, cantidad, productos(producto))
      `).order('abierta_at', { ascending: false }).limit(20),
    ])

    const jorn = jorns?.[0] || null
    setJornada(jorn)
    setInsumos(ins || [])
    setProductos(prods || [])
    setHistorial(hist || [])

    if (jorn) {
      const { data: masas } = await supabase
        .from('jornada_masas')
        .select('*')
        .eq('idjornada', jorn.id)
        .order('created_at')
      setMasasHoy(masas || [])
    } else {
      setMasasHoy([])
    }

    setLoading(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  // ── Calcular impacto en insumos ──────────────────────────────
  const calcImpacto = (cantMasas) => {
    return insumos.map(ins => ({
      ...ins,
      descuento: Number(ins.porcionreceta) * Number(cantMasas),
      nuevo:     Math.max(0, ins.cantidad - Number(ins.porcionreceta) * Number(cantMasas)),
      alcanza:   ins.cantidad >= Number(ins.porcionreceta) * Number(cantMasas),
    }))
  }

  const impactoAbrir   = masasAbrir   ? calcImpacto(masasAbrir)   : []
  const impactoAgregar = masasAgregar ? calcImpacto(masasAgregar) : []
  const hayInsuficiente = (imp) => imp.some(i => !i.alcanza)

  // ── Descontar insumos ────────────────────────────────────────
  const descontarInsumos = async (cantMasas) => {
    for (const ins of insumos) {
      const descuento = Number(ins.porcionreceta) * Number(cantMasas)
      const nuevo     = Math.max(0, ins.cantidad - descuento)
      await supabase.from('insumos').update({ cantidad: nuevo }).eq('id', ins.id)
    }
  }

  // ── Abrir tienda ─────────────────────────────────────────────
  const abrirTienda = async () => {
    setError('')
    const cant = Number(masasAbrir)
    if (!cant || cant <= 0) return setError('Ingresá la cantidad de masas a producir.')
    if (hayInsuficiente(impactoAbrir)) return setError('No hay suficientes insumos para esa cantidad.')

    setSaving(true)
    try {
      const hoy = new Date().toISOString().split('T')[0]
      const { data: jorn, error: e1 } = await supabase
        .from('jornadas')
        .insert({ fecha: hoy, estado: 'abierta', masas_total: cant, nota: notaAbrir })
        .select().single()
      if (e1) throw e1

      await supabase.from('jornada_masas').insert({
        idjornada: jorn.id, cantidad: cant, nota: 'Apertura del día'
      })
      await descontarInsumos(cant)
      await cargar()
      setModal(null)
      setMasasAbrir(''); setNotaAbrir('')
    } catch (e) {
      setError('Error: ' + (e.message || 'intentá de nuevo.'))
    } finally {
      setSaving(false)
    }
  }

  // ── Agregar masas ────────────────────────────────────────────
  const agregarMasas = async () => {
    setError('')
    const cant = Number(masasAgregar)
    if (!cant || cant <= 0) return setError('Ingresá la cantidad de masas a agregar.')
    if (hayInsuficiente(impactoAgregar)) return setError('No hay suficientes insumos para esa cantidad.')

    setSaving(true)
    try {
      await supabase.from('jornada_masas').insert({
        idjornada: jornada.id, cantidad: cant, nota: notaAgregar || 'Producción adicional'
      })
      await supabase.from('jornadas')
        .update({ masas_total: (jornada.masas_total || 0) + cant })
        .eq('id', jornada.id)
      await descontarInsumos(cant)
      await cargar()
      setModal(null)
      setMasasAgregar(''); setNotaAgregar('')
    } catch (e) {
      setError('Error: ' + (e.message || 'intentá de nuevo.'))
    } finally {
      setSaving(false)
    }
  }

  // ── Cerrar tienda ────────────────────────────────────────────
  const abrirModalCerrar = () => {
    setProduccion(productos.map(p => ({ idproducto: p.idproducto, nombre: p.producto, lote: '', cantidad: '' })))
    setError('')
    setModal('cerrar')
  }

  const cerrarTienda = async () => {
    setError('')
    const prodValida = produccion.filter(p => p.cantidad && Number(p.cantidad) > 0 && p.lote.trim())
    if (prodValida.length === 0)
      return setError('Registrá al menos un producto producido con lote y cantidad.')

    setSaving(true)
    try {
      // 1. Insertar producción
      const rows = prodValida.map(p => ({
        idjornada:  jornada.id,
        idproducto: p.idproducto,
        lote:       p.lote.trim(),
        cantidad:   Number(p.cantidad),
      }))
      const { error: e1 } = await supabase.from('jornada_produccion').insert(rows)
      if (e1) throw e1

      // 2. Sumar al stock (upsert por producto+lote)
      for (const p of prodValida) {
        const { data: stockExist } = await supabase
          .from('stock')
          .select('id, cantidad')
          .eq('idproducto', p.idproducto)
          .eq('lote', p.lote.trim())
          .single()

        if (stockExist) {
          await supabase.from('stock')
            .update({ cantidad: stockExist.cantidad + Number(p.cantidad) })
            .eq('id', stockExist.id)
        } else {
          await supabase.from('stock').insert({
            idproducto: p.idproducto,
            lote:       p.lote.trim(),
            cantidad:   Number(p.cantidad),
          })
        }
      }

      // 3. Cerrar jornada
      const { error: e2 } = await supabase.from('jornadas')
        .update({ estado: 'cerrada', cerrada_at: new Date().toISOString() })
        .eq('id', jornada.id)
      if (e2) throw e2

      await cargar()
      setModal(null)
    } catch (e) {
      setError('Error: ' + (e.message || 'intentá de nuevo.'))
    } finally {
      setSaving(false)
    }
  }

  const updProd = (idx, campo, valor) =>
    setProduccion(prev => prev.map((p, i) => i === idx ? { ...p, [campo]: valor } : p))

  const fmtFecha = (s) => s ? new Date(s).toLocaleDateString('es-AR', { weekday:'short', day:'2-digit', month:'short' }) : '—'
  const fmtHora  = (s) => s ? new Date(s).toLocaleTimeString('es-AR', { hour:'2-digit', minute:'2-digit' }) : '—'
  const fmtNum   = (n, u) => `${Number(n || 0).toFixed(n % 1 === 0 ? 0 : 2)} ${u || ''}`

  if (loading) return <div className={styles.loading}>Cargando...</div>

  const jornadaAbierta = jornada?.estado === 'abierta'
  const jornadaCerrada = false // ahora jornada solo tiene valor cuando está abierta

  return (
    <div className={styles.wrap}>

      {/* ── Estado de la tienda ── */}
      <div className={`${styles.estadoCard} ${jornadaAbierta ? styles.abierta : jornadaCerrada ? styles.cerrada : styles.sinAbrir}`}>
        <div className={styles.estadoLeft}>
          <div className={styles.estadoIcono}>
            <Icon d={jornadaAbierta ? ICONS.open : ICONS.close} size={26} />
          </div>
          <div>
            <div className={styles.estadoTitulo}>
              {jornadaAbierta ? 'Tienda abierta' : 'Tienda cerrada'}
            </div>
            <div className={styles.estadoSub}>
              {jornadaAbierta
                ? `Abierta a las ${fmtHora(jornada.abierta_at)} · ${jornada.masas_total} masas producidas`
                : new Date().toLocaleDateString('es-AR', { weekday:'long', day:'2-digit', month:'long' })
              }
            </div>
          </div>
        </div>
        <div className={styles.estadoBtns}>
          {!jornadaAbierta && (
            <button className="btn btn-primary" onClick={() => { setError(''); setMasasAbrir(''); setModal('abrir') }}>
              <Icon d={ICONS.open} size={14} /> Abrir tienda
            </button>
          )}
          {jornadaAbierta && (
            <>
              <button className="btn btn-ghost" onClick={() => { setError(''); setMasasAgregar(''); setModal('agregar') }}>
                <Icon d={ICONS.plus} size={14} /> Agregar masas
              </button>
              <button className={`btn ${styles.btnCerrar}`} onClick={abrirModalCerrar}>
                <Icon d={ICONS.close} size={14} /> Cerrar tienda
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Movimientos del día ── */}
      {jornada && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>
            <Icon d={ICONS.history} size={14} /> Movimientos de hoy
          </div>
          <div className={styles.movList}>
            {masasHoy.map((m, i) => (
              <div key={m.id} className={styles.movRow}>
                <div className={styles.movNum}>#{i + 1}</div>
                <div>
                  <div className={styles.movNota}>{m.nota || 'Producción'}</div>
                  <div className={styles.movFecha}>{fmtHora(m.created_at)}</div>
                </div>
                <div className={styles.movCant}>+{m.cantidad} masas</div>
              </div>
            ))}
          </div>

          {/* Producción registrada al cierre */}
          {jornadaCerrada && jornada.jornada_produccion?.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div className={styles.sectionTitle}>
                <Icon d={ICONS.box} size={14} /> Productos ingresados al stock
              </div>
              <div className={styles.movList}>
                {jornada.jornada_produccion.map((p, i) => (
                  <div key={i} className={styles.movRow}>
                    <div className={styles.movNum}>
                      <Icon d={ICONS.box} size={13} />
                    </div>
                    <div>
                      <div className={styles.movNota}>{p.productos?.producto || '—'}</div>
                      <div className={styles.movFecha}>Lote: {p.lote}</div>
                    </div>
                    <div className={styles.movCant} style={{ color: 'var(--success)' }}>
                      +{p.cantidad} u.
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Historial de jornadas ── */}
      <div className={styles.section}>
        <div className={styles.sectionTitle}>
          <Icon d={ICONS.history} size={14} /> Historial de jornadas
        </div>
        {historial.length === 0
          ? <div className={styles.empty}>No hay jornadas registradas aún.</div>
          : <div className={styles.table}>
              <div className={styles.tableHead}>
                <span>Fecha</span>
                <span>Estado</span>
                <span>Masas</span>
                <span>Apertura</span>
                <span>Cierre</span>
                <span>Productos</span>
              </div>
              {historial.map(j => (
                <div key={j.id} className={styles.tableRow}>
                  <span className={styles.jFecha}>{fmtFecha(j.fecha)}</span>
                  <span>
                    <span className={`badge ${j.estado === 'abierta' ? 'badge-pending' : 'badge-ok'}`}>
                      {j.estado === 'abierta' ? 'Abierta' : 'Cerrada'}
                    </span>
                  </span>
                  <span className={styles.jMasas}>{j.masas_total}</span>
                  <span className={styles.jHora}>{fmtHora(j.abierta_at)}</span>
                  <span className={styles.jHora}>{j.cerrada_at ? fmtHora(j.cerrada_at) : '—'}</span>
                  <span className={styles.jProd}>
                    {j.jornada_produccion?.length > 0
                      ? j.jornada_produccion.map(p => `${p.productos?.producto} (${p.cantidad})`).join(', ')
                      : '—'}
                  </span>
                </div>
              ))}
            </div>
        }
      </div>

      {/* ══ MODAL: Abrir tienda ══ */}
      {modal === 'abrir' && (
        <div className={styles.overlay} onClick={() => setModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span>Abrir tienda — {new Date().toLocaleDateString('es-AR', { weekday:'long', day:'2-digit', month:'long' })}</span>
            </div>
            <div className={styles.modalBody}>
              <div className="field">
                <label>¿Cuántas masas vas a producir hoy?</label>
                <input type="number" min="1" step="1" placeholder="Ej: 100"
                  value={masasAbrir} onChange={e => setMasasAbrir(e.target.value)} autoFocus />
              </div>
              <div className="field">
                <label>Nota (opcional)</label>
                <input type="text" placeholder="Ej: Producción normal del día"
                  value={notaAbrir} onChange={e => setNotaAbrir(e.target.value)} />
              </div>

              {/* Impacto en insumos */}
              {impactoAbrir.length > 0 && (
                <div className={styles.impactoBox}>
                  <div className={styles.impactoTitle}>
                    <Icon d={ICONS.flask} size={13} /> Insumos que se van a descontar
                  </div>
                  {impactoAbrir.map(ins => (
                    <div key={ins.id} className={`${styles.impactoRow} ${!ins.alcanza ? styles.impactoInsuf : ''}`}>
                      <span className={styles.impactoNombre}>{ins.insumo}</span>
                      <span className={styles.impactoDesc}>−{fmtNum(ins.descuento, ins.unidad)}</span>
                      <span className={styles.impactoNuevo} style={{ color: ins.alcanza ? 'var(--text2)' : 'var(--danger)' }}>
                        → {fmtNum(ins.nuevo, ins.unidad)}
                        {!ins.alcanza && ' ⚠ Insuficiente'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {error && <div className="err" style={{ marginBottom: 10 }}>{error}</div>}
              <div className={styles.modalFooter}>
                <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
                <button className="btn btn-primary" onClick={abrirTienda} disabled={saving}>
                  {saving ? 'Abriendo...' : <><Icon d={ICONS.open} size={13} /> Abrir y registrar masas</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: Agregar masas ══ */}
      {modal === 'agregar' && (
        <div className={styles.overlay} onClick={() => setModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span>Agregar masas al día</span>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.resumenActual}>
                <span>Masas registradas hoy</span>
                <span className={styles.resumenNum}>{jornada?.masas_total || 0}</span>
              </div>
              <div className="field">
                <label>¿Cuántas masas adicionales?</label>
                <input type="number" min="1" step="1" placeholder="Ej: 50"
                  value={masasAgregar} onChange={e => setMasasAgregar(e.target.value)} autoFocus />
              </div>
              <div className="field">
                <label>Nota (opcional)</label>
                <input type="text" placeholder="Ej: Pedido extra de la tarde"
                  value={notaAgregar} onChange={e => setNotaAgregar(e.target.value)} />
              </div>

              {impactoAgregar.length > 0 && (
                <div className={styles.impactoBox}>
                  <div className={styles.impactoTitle}>
                    <Icon d={ICONS.flask} size={13} /> Insumos que se van a descontar
                  </div>
                  {impactoAgregar.map(ins => (
                    <div key={ins.id} className={`${styles.impactoRow} ${!ins.alcanza ? styles.impactoInsuf : ''}`}>
                      <span className={styles.impactoNombre}>{ins.insumo}</span>
                      <span className={styles.impactoDesc}>−{fmtNum(ins.descuento, ins.unidad)}</span>
                      <span className={styles.impactoNuevo} style={{ color: ins.alcanza ? 'var(--text2)' : 'var(--danger)' }}>
                        → {fmtNum(ins.nuevo, ins.unidad)}
                        {!ins.alcanza && ' ⚠ Insuficiente'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {error && <div className="err" style={{ marginBottom: 10 }}>{error}</div>}
              <div className={styles.modalFooter}>
                <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
                <button className="btn btn-primary" onClick={agregarMasas} disabled={saving}>
                  {saving ? 'Guardando...' : <><Icon d={ICONS.plus} size={13} /> Agregar masas</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══ MODAL: Cerrar tienda ══ */}
      {modal === 'cerrar' && (
        <div className={styles.overlay} onClick={() => setModal(null)}>
          <div className={styles.modal} style={{ maxWidth: 560 }} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span>Cerrar tienda — Registrar producción</span>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.resumenActual}>
                <span>Total masas producidas hoy</span>
                <span className={styles.resumenNum}>{jornada?.masas_total}</span>
              </div>

              <div className={styles.prodTitle}>
                <Icon d={ICONS.box} size={13} /> Ingresá los productos al stock
              </div>
              <div className={styles.prodHeader}>
                <span style={{ flex: 2 }}>Producto</span>
                <span>Lote</span>
                <span>Cant. producida</span>
              </div>
              {produccion.map((p, idx) => (
                <div key={p.idproducto} className={styles.prodRow}>
                  <span className={styles.prodNombre} style={{ flex: 2 }}>{p.nombre}</span>
                  <input type="text" placeholder="Ej: L025" value={p.lote}
                    onChange={e => updProd(idx, 'lote', e.target.value)}
                    style={{ width: 80 }} />
                  <input type="number" min="0" placeholder="0" value={p.cantidad}
                    onChange={e => updProd(idx, 'cantidad', e.target.value)}
                    style={{ width: 100 }} />
                </div>
              ))}
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
                Dejá en 0 los productos que no se produjeron hoy.
              </div>

              {error && <div className="err" style={{ marginTop: 10, marginBottom: 4 }}>{error}</div>}
              <div className={styles.modalFooter}>
                <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
                <button className={`btn ${styles.btnCerrar}`} onClick={cerrarTienda} disabled={saving}>
                  {saving ? 'Cerrando...' : <><Icon d={ICONS.close} size={13} /> Cerrar tienda y sumar stock</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
