import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import styles from './Clientes.module.css'

const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const ICONS = {
  plus:    'M12 5v14M5 12h14',
  search:  'M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z',
  edit:    'M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z',
  trash:   'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  check:   'M20 6L9 17l-5-5',
  close:   'M18 6L6 18M6 6l12 12',
  user:    'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
  phone:   'M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 012.12 4.18 2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z',
  mail:    'M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2zm16 2l-8 5-8-5',
  map:     'M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z M12 10a1 1 0 100-2 1 1 0 000 2z',
  history: 'M12 8v4l3 3M3.05 11a9 9 0 109.9-8.95',
  cart:    'M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0',
}

const EMPTY = { alias:'', nombre:'', email:'', telefono:'', direccion:'' }

export default function Clientes() {
  const [clientes,  setClientes]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [busq,      setBusq]      = useState('')
  const [modal,     setModal]     = useState(null)   // null | 'nuevo' | 'editar' | 'ver'
  const [selected,  setSelected]  = useState(null)
  const [form,      setForm]      = useState(EMPTY)
  const [saving,    setSaving]    = useState(false)
  const [error,     setError]     = useState('')
  const [confirmDel,setConfirmDel]= useState(null)
  const [historial, setHistorial] = useState([])
  const [loadingHist, setLoadingHist] = useState(false)

  const cargar = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('clientes')
      .select('*')
      .order('nombre')
    setClientes(data || [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  const filtrados = clientes.filter(c =>
    `${c.nombre} ${c.alias || ''} ${c.email || ''} ${c.telefono || ''}`.toLowerCase()
      .includes(busq.toLowerCase())
  )

  const abrirNuevo = () => {
    setForm(EMPTY); setError(''); setModal('nuevo')
  }

  const abrirEditar = (c) => {
    setSelected(c)
    setForm({ alias: c.alias||'', nombre: c.nombre||'', email: c.email||'', telefono: c.telefono||'', direccion: c.direccion||'' })
    setError('')
    setModal('editar')
  }

  const abrirVer = async (c) => {
    setSelected(c)
    setModal('ver')
    setLoadingHist(true)
    const { data } = await supabase
      .from('ventas')
      .select('idventa, fecha, montoventa, montopendiente, estado')
      .eq('idcliente', c.idcliente)
      .order('fecha', { ascending: false })
      .limit(10)
    setHistorial(data || [])
    setLoadingHist(false)
  }

  const guardar = async () => {
    setError('')
    if (!form.nombre.trim()) return setError('El nombre es obligatorio.')
    setSaving(true)
    try {
      if (modal === 'nuevo') {
        const { error: e } = await supabase.from('clientes').insert({ ...form, fecha_ins: new Date().toISOString() })
        if (e) throw e
      } else {
        const { error: e } = await supabase.from('clientes').update(form).eq('idcliente', selected.idcliente)
        if (e) throw e
      }
      await cargar()
      setModal(null)
    } catch (e) {
      setError('Error al guardar: ' + (e.message || 'intentá de nuevo.'))
    } finally {
      setSaving(false)
    }
  }

  const eliminar = async (id) => {
    await supabase.from('clientes').delete().eq('idcliente', id)
    setConfirmDel(null)
    setModal(null)
    await cargar()
  }

  const fmt = (n) => '$' + Number(n || 0).toLocaleString('es-AR')
  const fmtFecha = (s) => s ? new Date(s).toLocaleDateString('es-AR', { day:'2-digit', month:'short', year:'numeric' }) : '—'
  const iniciales = (nombre) => nombre?.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() || '?'
  const totalCompras = historial.reduce((s, v) => s + (v.montoventa || 0), 0)

  return (
    <div className={styles.wrap}>

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.searchWrap}>
          <Icon d={ICONS.search} size={14} />
          <input
            type="text" placeholder="Buscar por nombre, email, teléfono..."
            value={busq} onChange={e => setBusq(e.target.value)}
          />
        </div>
        <button className="btn btn-primary" onClick={abrirNuevo}>
          <Icon d={ICONS.plus} size={14} /> Nuevo cliente
        </button>
      </div>

      {/* Tabla */}
      {loading
        ? <div className={styles.empty}>Cargando...</div>
        : filtrados.length === 0
          ? <div className={styles.empty}>{busq ? 'Sin resultados para esa búsqueda.' : 'No hay clientes aún. ¡Agregá el primero!'}</div>
          : <div className={styles.table}>
              <div className={styles.tableHead}>
                <span>Cliente</span>
                <span>Teléfono</span>
                <span>Email</span>
                <span>Dirección</span>
                <span></span>
              </div>
              {filtrados.map(c => (
                <div key={c.idcliente} className={styles.tableRow} onClick={() => abrirVer(c)}>
                  <div className={styles.clienteCell}>
                    <div className={styles.avatar}>{iniciales(c.nombre)}</div>
                    <div>
                      <div className={styles.nombre}>{c.nombre}</div>
                      {c.alias && <div className={styles.alias}>{c.alias}</div>}
                    </div>
                  </div>
                  <span className={styles.cell}>{c.telefono || '—'}</span>
                  <span className={styles.cell}>{c.email || '—'}</span>
                  <span className={styles.cell}>{c.direccion || '—'}</span>
                  <div className={styles.actions} onClick={e => e.stopPropagation()}>
                    <button className={styles.iconBtn} onClick={() => abrirEditar(c)} title="Editar">
                      <Icon d={ICONS.edit} size={14} />
                    </button>
                    <button className={`${styles.iconBtn} ${styles.danger}`} onClick={() => setConfirmDel(c)} title="Eliminar">
                      <Icon d={ICONS.trash} size={14} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
      }

      <div className={styles.count}>{filtrados.length} cliente{filtrados.length !== 1 ? 's' : ''}</div>

      {/* ── Modal nuevo / editar ── */}
      {(modal === 'nuevo' || modal === 'editar') && (
        <div className={styles.overlay} onClick={() => setModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span>{modal === 'nuevo' ? 'Nuevo cliente' : 'Editar cliente'}</span>
              <button className={styles.closeBtn} onClick={() => setModal(null)}><Icon d={ICONS.close} size={16} /></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.formGrid}>
                <div className="field" style={{ gridColumn: '1/-1' }}>
                  <label>Nombre *</label>
                  <input type="text" placeholder="Nombre completo"
                    value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Alias / Apodo</label>
                  <input type="text" placeholder="Como lo conocés"
                    value={form.alias} onChange={e => setForm(f => ({ ...f, alias: e.target.value }))} />
                </div>
                <div className="field">
                  <label>Teléfono</label>
                  <input type="text" placeholder="11-1234-5678"
                    value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
                </div>
                <div className="field" style={{ gridColumn: '1/-1' }}>
                  <label>Email</label>
                  <input type="email" placeholder="correo@ejemplo.com"
                    value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="field" style={{ gridColumn: '1/-1' }}>
                  <label>Dirección</label>
                  <input type="text" placeholder="Calle, número, localidad"
                    value={form.direccion} onChange={e => setForm(f => ({ ...f, direccion: e.target.value }))} />
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

      {/* ── Modal ver detalle ── */}
      {modal === 'ver' && selected && (
        <div className={styles.overlay} onClick={() => setModal(null)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <span>Detalle de cliente</span>
              <button className={styles.closeBtn} onClick={() => setModal(null)}><Icon d={ICONS.close} size={16} /></button>
            </div>
            <div className={styles.modalBody}>
              {/* Info del cliente */}
              <div className={styles.clienteInfo}>
                <div className={styles.avatarLg}>{iniciales(selected.nombre)}</div>
                <div>
                  <div className={styles.nombreLg}>{selected.nombre}</div>
                  {selected.alias && <div className={styles.aliasLg}>{selected.alias}</div>}
                </div>
              </div>
              <div className={styles.infoGrid}>
                {selected.telefono && <div className={styles.infoItem}><Icon d={ICONS.phone} size={13} />{selected.telefono}</div>}
                {selected.email    && <div className={styles.infoItem}><Icon d={ICONS.mail} size={13} />{selected.email}</div>}
                {selected.direccion&& <div className={styles.infoItem}><Icon d={ICONS.map} size={13} />{selected.direccion}</div>}
                <div className={styles.infoItem}><Icon d={ICONS.history} size={13} />Cliente desde {fmtFecha(selected.fecha_ins)}</div>
              </div>

              {/* Historial de compras */}
              <div className={styles.histTitle}>
                <Icon d={ICONS.cart} size={13} /> Historial de compras
              </div>
              {loadingHist
                ? <div className={styles.empty} style={{ padding: '16px 0' }}>Cargando...</div>
                : historial.length === 0
                  ? <div className={styles.empty} style={{ padding: '16px 0' }}>Sin compras registradas.</div>
                  : <>
                    <div className={styles.histSummary}>
                      <div className={styles.histStat}>
                        <span>{historial.length}</span><label>Compras</label>
                      </div>
                      <div className={styles.histStat}>
                        <span>{fmt(totalCompras)}</span><label>Total comprado</label>
                      </div>
                      <div className={styles.histStat}>
                        <span>{fmt(historial.reduce((s, v) => s + (v.montopendiente || 0), 0))}</span>
                        <label>Pendiente</label>
                      </div>
                    </div>
                    {historial.map(v => (
                      <div key={v.idventa} className={styles.histRow}>
                        <div>
                          <div className={styles.histId}>Venta #{v.idventa}</div>
                          <div className={styles.histFecha}>{fmtFecha(v.fecha)}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div className={styles.histMonto}>{fmt(v.montoventa)}</div>
                          <span className={`badge ${v.estado === 'Pagado' ? 'badge-ok' : v.estado === 'Parcial' ? 'badge-pending' : 'badge-danger'}`}>
                            {v.estado}
                          </span>
                        </div>
                      </div>
                    ))}
                  </>
              }

              <div className={styles.modalFooter}>
                <button className="btn btn-ghost" onClick={() => { setModal(null); setTimeout(() => abrirEditar(selected), 50) }}>
                  <Icon d={ICONS.edit} size={13} /> Editar
                </button>
                <button className="btn btn-primary" onClick={() => setModal(null)}>Cerrar</button>
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
            <p className={styles.confirmTitle}>¿Eliminar a {confirmDel.nombre}?</p>
            <p className={styles.confirmSub}>Esta acción no se puede deshacer. El historial de ventas se mantendrá.</p>
            <div className={styles.confirmBtns}>
              <button className="btn btn-ghost" onClick={() => setConfirmDel(null)}>Cancelar</button>
              <button className="btn btn-danger" onClick={() => eliminar(confirmDel.idcliente)}>Sí, eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
