import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import styles from './Insumos.module.css'

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
  minus:   'M5 12h14',
  flask:   'M9 3h6M9 3v6l-4 9a1 1 0 00.9 1.45h12.2A1 1 0 0025 18l-4-9V3',
  warning: 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01',
}

const UNIDADES = ['kg', 'gr', 'lt', 'ml', 'unidad', 'paquete', 'taza', 'cucharada']
const TIPOS    = ['Seco', 'Líquido', 'Fresco', 'Congelado', 'Otro']

const EMPTY_FORM = { insumo: '', cantidad: '', tipo: '', unidad: 'kg', porcionreceta: '', alerta: '' }

export default function Insumos() {
  const [insumos,   setInsumos]   = useState([])
  const [loading,   setLoading]   = useState(true)
  const [busq,      setBusq]      = useState('')
  const [filtro,    setFiltro]    = useState('todos') // todos | bajo | agotado
  const [modal,     setModal]     = useState(null)    // null | 'nuevo' | 'editar' | 'movimiento'
  const [selected,  setSelected]  = useState(null)
  const [form,      setForm]      = useState(EMPTY_FORM)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')
  const [confirmDel,setConfirmDel]= useState(null)

  // movimiento (agregar / quitar)
  const [tipoMov,   setTipoMov]   = useState('agregar') // agregar | quitar
  const [cantMov,   setCantMov]   = useState('')
  const [notaMov,   setNotaMov]   = useState('')

  const cargar = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('insumos')
      .select('*')
      .order('insumo')
    setInsumos(data || [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const filtrados = insumos.filter(i => {
    const matchBusq = `${i.insumo} ${i.tipo || ''}`.toLowerCase().includes(busq.toLowerCase())
    const alerta    = i.alerta || 20
    const matchFilt =
      filtro === 'todos'   ? true :
      filtro === 'bajo'    ? i.cantidad > 0 && i.cantidad <= alerta :
      filtro === 'agotado' ? i.cantidad <= 0 : true
    return matchBusq && matchFilt
  })

  const totalInsumos = insumos.length
  const bajoStock    = insumos.filter(i => i.cantidad > 0 && i.cantidad <= (i.alerta || 20)).length
  const agotados     = insumos.filter(i => i.cantidad <= 0).length

  // ── Nuevo insumo ──
  const abrirNuevo = () => {
    setForm(EMPTY_FORM)
    setError('')
    setModal('nuevo')
  }

  // ── Editar ──
  const abrirEditar = (ins) => {
    setSelected(ins)
    setForm({
      insumo:        ins.insumo,
      cantidad:      ins.cantidad,
      tipo:          ins.tipo || '',
      unidad:        ins.unidad || 'kg',
      porcionreceta: ins.porcionreceta || '',
      alerta:        ins.alerta || '',
    })
    setError('')
    setModal('editar')
  }

  // ── Movimiento ──
  const abrirMovimiento = (ins) => {
    setSelected(ins)
    setTipoMov('agregar')
    setCantMov('')
    setNotaMov('')
    setError('')
    setModal('movimiento')
  }

  const guardar = async () => {
    setError('')
    if (!form.insumo.trim())                     return setError('El nombre es obligatorio.')
    if (form.cantidad === '' || isNaN(Number(form.cantidad))) return setError('Ingresá una cantidad válida.')

    setSaving(true)
    try {
      const payload = {
        insumo:        form.insumo.trim(),
        cantidad:      Number(form.cantidad),
        tipo:          form.tipo || null,
        unidad:        form.unidad || 'kg',
        porcionreceta: form.porcionreceta !== '' ? Number(form.porcionreceta) : null,
        alerta:        form.alerta !== '' ? Number(form.alerta) : null,
      }
      if (modal === 'nuevo') {
        const { error: e } = await supabase.from('insumos').insert(payload)
        if (e) throw e
      } else {
        const { error: e } = await supabase.from('insumos').update(payload).eq('id', selected.id)
        if (e) throw e
      }
      await cargar()
      setModal(null)
    } catch (e) {
      setError('Error: ' + (e.message || 'intentá de nuevo.'))
    } finally {
      setSaving(false)
    }
  }

  const registrarMovimiento = async () => {
    setError('')
    const cant = Number(cantMov)
    if (!cant || cant <= 0) return setError('Ingresá una cantidad válida.')
    if (tipoMov === 'quitar' && cant > selected.cantidad)
      return setError(`No podés quitar más de lo que hay (${selected.cantidad} ${selected.unidad || ''}).`)

    setSaving(true)
    try {
      const nuevaCant = tipoMov === 'agregar'
        ? selected.cantidad + cant
        : Math.max(0, selected.cantidad - cant)

      const { error: e } = await supabase
        .from('insumos')
        .update({ cantidad: nuevaCant })
        .eq('id', selected.id)
      if (e) throw e

      await cargar()
      setModal(null)
    } catch (e) {
      setError('Error: ' + (e.message || 'intentá de nuevo.'))
    } finally {
      setSaving(false)
    }
  }

  const eliminar = async () => {
    await supabase.from('insumos').delete().eq('id', confirmDel.id)
    setConfirmDel(null)
    setModal(null)
    await cargar()
  }

  const nivelColor = (ins) => {
    if (ins.cantidad <= 0) return 'var(--danger)'
    if (ins.cantidad <= (ins.alerta || 20)) return 'var(--warning)'
    return 'var(--success)'
  }
  const nivelPct = (ins) => {
    const max = Math.max(...insumos.map(i => i.cantidad), 1)
    return Math.min(100, Math.round((ins.cantidad / max) * 100))
  }

  const fmtCant = (ins) => {
    const n = Number(ins.cantidad || 0)
    const u = ins.unidad || ''
    return `${n % 1 === 0 ? n : n.toFixed(2)} ${u}`
  }

  return (
    <div className={styles.wrap}>

      {/* Métricas */}
      <div className={styles.metrics}>
        <div className={styles.metric}>
          <div className={styles.metricVal}>{totalInsumos}</div>
          <div className={styles.metricLabel}>Insumos registrados</div>
        </div>
        <div className={styles.metric} style={{ cursor: 'pointer' }} onClick={() => setFiltro('bajo')}>
          <div className={styles.metricVal} style={{ color: bajoStock > 0 ? 'var(--warning)' : 'var(--text)' }}>
            {bajoStock}
          </div>
          <div className={styles.metricLabel}>Stock bajo</div>
        </div>
        <div className={styles.metric} style={{ cursor: 'pointer' }} onClick={() => setFiltro('agotado')}>
          <div className={styles.metricVal} style={{ color: agotados > 0 ? 'var(--danger)' : 'var(--text)' }}>
            {agotados}
          </div>
          <div className={styles.metricLabel}>Agotados</div>
        </div>
        <div className={styles.metric}>
          <div className={styles.metricVal}>{insumos.filter(i => i.porcionreceta).length}</div>
          <div className={styles.metricLabel}>Con porción de receta</div>
        </div>
      </div>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.searchWrap}>
          <Icon d={ICONS.search} size={14} />
          <input type="text" placeholder="Buscar insumo o tipo..."
            value={busq} onChange={e => setBusq(e.target.value)} />
        </div>
        <div className={styles.filtros}>
          {[['todos','Todos'],['bajo','⚠ Bajo'],['agotado','✕ Agotado']].map(([f, label]) => (
            <button key={f} className={`${styles.filtroBtn} ${filtro === f ? styles.active : ''}`}
              onClick={() => setFiltro(f)}>{label}</button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={abrirNuevo} style={{display:'none'}}>
          <Icon d={ICONS.plus} size={14} /> Nuevo insumo
        </button>
      </div>

      {/* Tabla */}
      {loading
        ? <div className={styles.empty}>Cargando...</div>
        : filtrados.length === 0
          ? <div className={styles.empty}>No hay insumos que coincidan.</div>
          : <div className={styles.table}>
              <div className={styles.tableHead}>
                <span>Insumo</span>
                <span>Tipo</span>
                <span>Stock actual</span>
                <span>Nivel</span>
                <span>Porción receta</span>
                <span>Alerta</span>
                <span></span>
              </div>
              {filtrados.map(ins => (
                <div key={ins.id} className={styles.tableRow}>
                  <div className={styles.insumoCell}>
                    <div className={styles.insumoIcon} style={{ background: nivelColor(ins) + '22', color: nivelColor(ins) }}>
                      <Icon d={ICONS.flask} size={13} />
                    </div>
                    <div>
                      <div className={styles.insumoNombre}>{ins.insumo}</div>
                      {ins.cantidad <= 0 && <span className="badge badge-danger">Agotado</span>}
                      {ins.cantidad > 0 && ins.cantidad <= (ins.alerta || 20) &&
                        <span className="badge badge-pending">Stock bajo</span>}
                    </div>
                  </div>
                  <span className={styles.tipo}>{ins.tipo || '—'}</span>
                  <span className={styles.cant} style={{ color: nivelColor(ins) }}>
                    {fmtCant(ins)}
                  </span>
                  <div className={styles.barWrap}>
                    <div className={styles.bar} style={{ width: `${nivelPct(ins)}%`, background: nivelColor(ins) }} />
                  </div>
                  <span className={styles.porcion}>
                    {ins.porcionreceta ? `${ins.porcionreceta} ${ins.unidad || ''}` : '—'}
                  </span>
                  <span className={styles.alerta}>
                    {ins.alerta ? `≤ ${ins.alerta} ${ins.unidad || ''}` : '—'}
                  </span>
                  <div className={styles.actions}>
                    <button className={`${styles.iconBtn} ${styles.movBtn}`}
                      onClick={() => abrirMovimiento(ins)} title="Agregar / Quitar">
                      <Icon d={ICONS.plus} size={16} />
                      <Icon d={ICONS.minus} size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
      }

      {/* ── Modal nuevo / editar ── */}
      {(modal === 'nuevo' || modal === 'editar') && (
        <div className={styles.overlay} onClick={() => setModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span>{modal === 'nuevo' ? 'Nuevo insumo' : 'Editar insumo'}</span>
              <button className={styles.closeBtn} onClick={() => setModal(null)}>
                <Icon d={ICONS.close} size={16} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGrid}>
                <div className="field" style={{ gridColumn: '1/-1' }}>
                  <label>Nombre del insumo *</label>
                  <input type="text" placeholder="Ej: Harina de trigo"
                    value={form.insumo} onChange={e => setForm(f => ({ ...f, insumo: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Tipo</label>
                  <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                    <option value="">Sin clasificar</option>
                    {TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Unidad de medida</label>
                  <select value={form.unidad} onChange={e => setForm(f => ({ ...f, unidad: e.target.value }))}>
                    {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="field">
                  <label>Cantidad actual</label>
                  <input type="number" min="0" step="0.01" placeholder="0"
                    value={form.cantidad} onChange={e => setForm(f => ({ ...f, cantidad: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Alerta de stock bajo</label>
                  <input type="number" min="0" step="0.01" placeholder={`Ej: 5 ${form.unidad}`}
                    value={form.alerta} onChange={e => setForm(f => ({ ...f, alerta: e.target.value }))} />
                </div>
                <div className="field" style={{ gridColumn: '1/-1' }}>
                  <label>Porción por receta ({form.unidad})</label>
                  <input type="number" min="0" step="0.001" placeholder="Cuánto se usa por unidad producida"
                    value={form.porcionreceta} onChange={e => setForm(f => ({ ...f, porcionreceta: e.target.value }))} />
                  <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
                    Opcional. Ej: si hacés 1 tequeño usás 0.05 kg de harina.
                  </div>
                </div>
              </div>
              {error && <div className="err" style={{ marginBottom: 12 }}>{error}</div>}
              <div className={styles.modalFooter}>
                {modal === 'editar' && (
                  <button className="btn btn-danger" onClick={() => setConfirmDel(selected)}>
                    <Icon d={ICONS.trash} size={13} /> Eliminar
                  </button>
                )}
                <div style={{ flex: 1 }} />
                <button className="btn btn-ghost" onClick={() => setModal(null)}>Cancelar</button>
                <button className="btn btn-primary" onClick={guardar} disabled={saving}>
                  {saving ? 'Guardando...' : <><Icon d={ICONS.check} size={13} /> Guardar</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal movimiento ── */}
      {modal === 'movimiento' && selected && (
        <div className={styles.overlay} onClick={() => setModal(null)}>
          <div className={styles.modal} style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span>{selected.insumo}</span>
              <button className={styles.closeBtn} onClick={() => setModal(null)}>
                <Icon d={ICONS.close} size={16} />
              </button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.stockActual}>
                <span className={styles.stockLabel}>Stock actual</span>
                <span className={styles.stockVal} style={{ color: nivelColor(selected) }}>
                  {fmtCant(selected)}
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
                <label>Cantidad a {tipoMov} ({selected.unidad || 'unidades'})</label>
                <input type="number" min="0.001" step="0.001" placeholder="0"
                  value={cantMov} onChange={e => setCantMov(e.target.value)}
                  autoFocus />
              </div>

              {/* Preview */}
              {cantMov && Number(cantMov) > 0 && (
                <div className={styles.preview}>
                  <span>{fmtCant(selected)}</span>
                  <span style={{ color: tipoMov === 'agregar' ? 'var(--success)' : 'var(--danger)' }}>
                    {tipoMov === 'agregar' ? '+' : '−'}{cantMov} {selected.unidad}
                  </span>
                  <span style={{ fontWeight: 600 }}>
                    = {(tipoMov === 'agregar'
                        ? selected.cantidad + Number(cantMov)
                        : Math.max(0, selected.cantidad - Number(cantMov))
                      ).toFixed(selected.unidad === 'unidad' ? 0 : 2)} {selected.unidad}
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

      {/* ── Confirm eliminar ── */}
      {confirmDel && (
        <div className={styles.overlay} onClick={() => setConfirmDel(null)}>
          <div className={styles.confirmModal} onClick={e => e.stopPropagation()}>
            <div className={styles.confirmIcon}><Icon d={ICONS.trash} size={22} /></div>
            <p className={styles.confirmTitle}>¿Eliminar {confirmDel.insumo}?</p>
            <p className={styles.confirmSub}>Esta acción no se puede deshacer.</p>
            <div className={styles.confirmBtns}>
              <button className="btn btn-ghost" onClick={() => setConfirmDel(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={eliminar}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
