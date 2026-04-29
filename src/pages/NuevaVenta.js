import React, { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import styles from './NuevaVenta.module.css'

// ─── Íconos ────────────────────────────────────────────────────
const Icon = ({ d, size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d={d} />
  </svg>
)

const ICONS = {
  search:  'M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z',
  plus:    'M12 5v14M5 12h14',
  trash:   'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  check:   'M20 6L9 17l-5-5',
  close:   'M18 6L6 18M6 6l12 12',
  user:    'M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z',
  cart:    'M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4zM3 6h18M16 10a4 4 0 01-8 0',
  money:   'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  arrow:   'M19 12H5M12 5l-7 7 7 7',
}

// ─── Componente principal ───────────────────────────────────────
export default function NuevaVenta() {
  // Datos maestros
  const [clientes,    setClientes]    = useState([])
  const [productos,   setProductos]   = useState([])
  const [stockMap,    setStockMap]    = useState({})

  // Estado del formulario
  const [clienteId,   setClienteId]   = useState('')
  const [clienteNombre, setClienteNombre] = useState('')
  const [busqCliente, setBusqCliente] = useState('')
  const [showClientes,setShowClientes]= useState(false)
  const [items,       setItems]       = useState([])   // líneas de detalle
  const [busqProd,    setBusqProd]    = useState('')
  const [showProds,   setShowProds]   = useState(false)
  const [entregado,   setEntregado]   = useState(false)

  // UI
  const [saving,   setSaving]   = useState(false)
  const [success,  setSuccess]  = useState(false)
  const [error,    setError]    = useState('')
  const [ventaId,  setVentaId]  = useState(null)

  // ── Carga inicial ──────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      const [{ data: c }, { data: p }, { data: s }] = await Promise.all([
        supabase.from('clientes').select('idcliente,alias,nombre').order('nombre'),
        supabase.from('productos').select('idproducto,producto').order('producto'),
        supabase.from('stock').select('idproducto,lote,cantidad').gt('cantidad', 0),
      ])
      setClientes(c || [])
      setProductos(p || [])
      // Armar mapa de stock por producto
      const sm = {}
      ;(s || []).forEach(r => {
        if (!sm[r.idproducto]) sm[r.idproducto] = []
        sm[r.idproducto].push({ lote: r.lote, cantidad: r.cantidad })
      })
      setStockMap(sm)
    }
    load()
  }, [])

  // ── Clientes filtrados ─────────────────────────────────────
  const clientesFiltrados = clientes.filter(c =>
    `${c.nombre} ${c.alias || ''}`.toLowerCase().includes(busqCliente.toLowerCase())
  ).slice(0, 8)

  const seleccionarCliente = (c) => {
    setClienteId(c.idcliente)
    setClienteNombre(c.nombre)
    setBusqCliente(c.nombre)
    setShowClientes(false)
  }

  // ── Productos filtrados ────────────────────────────────────
  const productosFiltrados = productos.filter(p =>
    p.producto.toLowerCase().includes(busqProd.toLowerCase()) &&
    !items.find(i => i.idproducto === p.idproducto)
  ).slice(0, 8)

  const agregarProducto = (p) => {
    const lotes = stockMap[p.idproducto] || []
    const lote  = lotes[0]?.lote || ''
    const stockDisp = lotes[0]?.cantidad || 0
    setItems(prev => [...prev, {
      idproducto: p.idproducto,
      nombre:     p.producto,
      lote,
      lotes,
      cantidad:   1,
      precio:     '',
      stockDisp,
    }])
    setBusqProd('')
    setShowProds(false)
  }

  const actualizarItem = (idx, campo, valor) => {
    setItems(prev => prev.map((it, i) => {
      if (i !== idx) return it
      if (campo === 'lote') {
        const loteObj = it.lotes.find(l => l.lote === valor)
        return { ...it, lote: valor, stockDisp: loteObj?.cantidad || 0 }
      }
      return { ...it, [campo]: valor }
    }))
  }

  const quitarItem = (idx) => setItems(prev => prev.filter((_, i) => i !== idx))

  // ── Totales ────────────────────────────────────────────────
  const totalVenta = items.reduce((s, it) => s + (Number(it.cantidad) * Number(it.precio) || 0), 0)
  const fmt = (n) => '$' + Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  // ── Guardar ────────────────────────────────────────────────
  const guardar = async () => {
    setError('')
    if (!clienteId)          return setError('Seleccioná un cliente.')
    if (items.length === 0)  return setError('Agregá al menos un producto.')
    if (items.some(it => !it.precio || Number(it.precio) <= 0))
                             return setError('Completá el precio de todos los productos.')
    if (items.some(it => Number(it.cantidad) <= 0))
                             return setError('La cantidad debe ser mayor a 0.')

    setSaving(true)
    try {
      const estadoVenta = 'Pendiente'

      // 1. Insertar venta
      const { data: venta, error: errVenta } = await supabase
        .from('ventas')
        .insert({
          idcliente:      clienteId,
          montoventa:     totalVenta,
          montopendiente: totalVenta,
          estado:         estadoVenta,
          entregado:      entregado,
          fecha:          new Date().toISOString(),
        })
        .select()
        .single()

      if (errVenta) throw errVenta

      // 2. Insertar detalle
      const detalle = items.map(it => ({
        idventa:    venta.idventa,
        idproducto: it.idproducto,
        lote:       it.lote,
        cantidad:   Number(it.cantidad),
        precio:     Number(it.precio),
        fecha_ins:  new Date().toISOString(),
      }))
      const { error: errDet } = await supabase.from('detalleventas').insert(detalle)
      if (errDet) throw errDet

      // 3. Descontar stock por producto y lote
      for (const it of items) {
        const { data: stockActual } = await supabase
          .from('stock')
          .select('cantidad')
          .eq('idproducto', it.idproducto)
          .eq('lote', it.lote)
          .single()

        const nuevaCantidad = Math.max(0, (stockActual?.cantidad || 0) - Number(it.cantidad))

        await supabase
          .from('stock')
          .update({ cantidad: nuevaCantidad })
          .eq('idproducto', it.idproducto)
          .eq('lote', it.lote)
      }

      setVentaId(venta.idventa)
      setSuccess(true)
    } catch (e) {
      console.error(e)
      setError('Error al guardar: ' + (e.message || 'intentá de nuevo.'))
    } finally {
      setSaving(false)
    }
  }

  const nuevaVenta = () => {
    setClienteId(''); setClienteNombre(''); setBusqCliente('')
    setItems([]); setEntregado(false)
    setSuccess(false); setVentaId(null); setError('')
  }

  // ── Pantalla de éxito ──────────────────────────────────────
  if (success) return (
    <div className={styles.successWrap}>
      <div className={styles.successCard}>
        <button className={styles.successClose} onClick={nuevaVenta} title="Cerrar">
          <Icon d={ICONS.close} size={16} />
        </button>
        <div className={styles.successIcon}><Icon d={ICONS.check} size={28} /></div>
        <h2 className={styles.successTitle}>¡Venta registrada!</h2>
        <p className={styles.successSub}>Venta #{ventaId} · {fmt(totalVenta)}</p>
        <div className={styles.successMeta}>
          <span>Cliente: <strong>{clienteNombre}</strong></span>
          <span>Estado: <strong>Pendiente de cobro</strong></span>
        </div>
        <div className={styles.successBtns}>
          <button className="btn btn-ghost" onClick={nuevaVenta}>
            <Icon d={ICONS.plus} size={13} /> Nueva venta
          </button>
          <button className="btn btn-primary" onClick={nuevaVenta}>
            <Icon d={ICONS.check} size={13} /> Listo
          </button>
        </div>
      </div>
    </div>
  )

  // ── Formulario ─────────────────────────────────────────────
  return (
    <div className={styles.wrap}>
      <div className={styles.cols}>

        {/* ── Columna izquierda: cliente + productos ── */}
        <div className={styles.left}>

          {/* Cliente */}
          <div className="card" style={{ marginBottom: 12 }}>
            <div className={styles.sectionTitle}>
              <Icon d={ICONS.user} /> Cliente
            </div>
            <div className={styles.searchWrap}>
              <input
                type="text"
                placeholder="Buscar cliente..."
                value={busqCliente}
                onChange={e => { setBusqCliente(e.target.value); setShowClientes(true); setClienteId('') }}
                onFocus={() => setShowClientes(true)}
              />
              {showClientes && clientesFiltrados.length > 0 && (
                <div className={styles.dropdown}>
                  {clientesFiltrados.map(c => (
                    <div key={c.idcliente} className={styles.dropItem}
                      onMouseDown={() => seleccionarCliente(c)}>
                      <span className={styles.dropMain}>{c.nombre}</span>
                      {c.alias && <span className={styles.dropSub}>{c.alias}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {clienteId && (
              <div className={styles.selectedBadge}>
                <Icon d={ICONS.check} /> {clienteNombre}
              </div>
            )}
          </div>

          {/* Productos */}
          <div className="card">
            <div className={styles.sectionTitle}>
              <Icon d={ICONS.cart} /> Productos
            </div>

            {/* Buscador de productos */}
            <div className={styles.searchWrap} style={{ marginBottom: 12 }}>
              <input
                type="text"
                placeholder="Buscar y agregar producto..."
                value={busqProd}
                onChange={e => { setBusqProd(e.target.value); setShowProds(true) }}
                onFocus={() => setShowProds(true)}
              />
              {showProds && busqProd && productosFiltrados.length > 0 && (
                <div className={styles.dropdown}>
                  {productosFiltrados.map(p => (
                    <div key={p.idproducto} className={styles.dropItem}
                      onMouseDown={() => agregarProducto(p)}>
                      <span className={styles.dropMain}>{p.producto}</span>
                      {stockMap[p.idproducto]
                        ? <span className={styles.dropSub}>Stock: {stockMap[p.idproducto].reduce((s, l) => s + l.cantidad, 0)} u.</span>
                        : <span className={styles.dropSub} style={{ color: 'var(--danger)' }}>Sin stock</span>
                      }
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Tabla de items */}
            {items.length === 0
              ? <div className={styles.emptyItems}>Agregá productos usando el buscador</div>
              : <>
                <div className={styles.itemsHeader}>
                  <span style={{ flex: 2 }}>Producto</span>
                  <span>Lote</span>
                  <span>Cant.</span>
                  <span>Precio</span>
                  <span>Subtotal</span>
                  <span></span>
                </div>
                {items.map((it, idx) => (
                  <div key={idx} className={styles.itemRow}>
                    <div style={{ flex: 2 }}>
                      <div className={styles.itemNombre}>{it.nombre}</div>
                      {it.stockDisp > 0
                        ? <div className={styles.itemStock}>Stock: {it.stockDisp} u.</div>
                        : <div className={styles.itemStock} style={{ color: 'var(--danger)' }}>Sin stock en lote</div>
                      }
                    </div>
                    <select value={it.lote}
                      onChange={e => actualizarItem(idx, 'lote', e.target.value)}
                      style={{ width: 80 }}>
                      {it.lotes.map(l => <option key={l.lote} value={l.lote}>{l.lote}</option>)}
                      {it.lotes.length === 0 && <option value="">—</option>}
                    </select>
                    <input type="number" min="1" value={it.cantidad} style={{ width: 60 }}
                      onChange={e => actualizarItem(idx, 'cantidad', e.target.value)} />
                    <input type="number" min="0" placeholder="0.00" value={it.precio} style={{ width: 80 }}
                      onChange={e => actualizarItem(idx, 'precio', e.target.value)} />
                    <div className={styles.itemSubtotal}>
                      {fmt(Number(it.cantidad) * Number(it.precio) || 0)}
                    </div>
                    <button className={styles.btnTrash} onClick={() => quitarItem(idx)}>
                      <Icon d={ICONS.trash} size={14} />
                    </button>
                  </div>
                ))}
              </>
            }
          </div>
        </div>

        {/* ── Columna derecha: entrega + resumen ── */}
        <div className={styles.right}>

          {/* Entrega */}
          <div className="card" style={{ marginBottom: 12 }}>
            <label className={styles.checkLabel}>
              <input type="checkbox" checked={entregado}
                onChange={e => setEntregado(e.target.checked)} />
              <span>Mercadería entregada</span>
            </label>
          </div>

          {/* Resumen */}
          <div className={`card ${styles.resumen}`}>
            <div className={styles.resumenRow}>
              <span>Total venta</span>
              <span>{fmt(totalVenta)}</span>
            </div>
            <div className={`${styles.resumenRow} ${styles.resumenTotal}`}>
              <span>Estado</span>
              <span style={{ color: entregado ? 'var(--success)' : 'var(--warning)' }}>
                {entregado ? 'Pagado' : 'Pendiente'}
              </span>
            </div>

            {error && <div className="err" style={{ marginBottom: 10 }}>{error}</div>}

            <button
              className={`btn btn-primary ${styles.guardarBtn}`}
              onClick={guardar}
              disabled={saving}
            >
              {saving ? 'Guardando...' : <><Icon d={ICONS.check} /> Confirmar venta</>}
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
