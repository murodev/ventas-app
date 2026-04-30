import emailjs from '@emailjs/browser'

const SERVICE_ID  = process.env.REACT_APP_EMAILJS_SERVICE_ID
const TEMPLATE_ID = process.env.REACT_APP_EMAILJS_TEMPLATE_ID
const PUBLIC_KEY  = process.env.REACT_APP_EMAILJS_PUBLIC_KEY

export async function enviarRemitoEmail({ venta, detalle, pagos, emailDestino }) {
  const fmt = (n) =>
    '$' + Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const fmtFecha = (s) =>
    s ? new Date(s).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

  const totalPagado = pagos?.reduce((s, p) => s + (p.monto || 0), 0) || 0

  const filas = detalle.map(d => `
    <tr>
      <td style="border:1px solid #ccc;padding:7px 10px;text-align:left">${d.productos?.producto || '—'}</td>
      <td style="border:1px solid #ccc;padding:7px 10px;text-align:center">${d.cantidad}</td>
      <td style="border:1px solid #ccc;padding:7px 10px;text-align:center">${d.lote || '—'}</td>
      <td style="border:1px solid #ccc;padding:7px 10px;text-align:center">${fmt(d.precio)}</td>
      <td style="border:1px solid #ccc;padding:7px 10px;text-align:center">${fmt(d.subtotal || d.cantidad * d.precio)}</td>
    </tr>
  `).join('')

  const filasPagos = pagos?.length > 0 ? `
    <h3 style="font-size:13px;font-weight:bold;margin:20px 0 8px;border-bottom:1px solid #ccc;padding-bottom:4px">
      Pagos registrados
    </h3>
    <table style="width:100%;border-collapse:collapse">
      <thead>
        <tr>
          <th style="border:1px solid #ccc;padding:7px 10px;background:#f0f0f0;text-align:left">Medio de pago</th>
          <th style="border:1px solid #ccc;padding:7px 10px;background:#f0f0f0;text-align:left">Fecha</th>
          <th style="border:1px solid #ccc;padding:7px 10px;background:#f0f0f0;text-align:right">Monto</th>
        </tr>
      </thead>
      <tbody>
        ${pagos.map(p => `
          <tr>
            <td style="border:1px solid #ccc;padding:7px 10px">${p.mediospagos?.mediopago || '—'}</td>
            <td style="border:1px solid #ccc;padding:7px 10px">${fmtFecha(p.fechapago)}</td>
            <td style="border:1px solid #ccc;padding:7px 10px;text-align:right">${fmt(p.monto)}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  ` : ''

  const remitoHtml = `
    <div style="font-family:Arial,sans-serif;font-size:12px;color:#111;max-width:700px;margin:0 auto;padding:30px">
      <h1 style="text-align:center;font-size:18px;font-weight:bold;margin-bottom:24px;letter-spacing:1px">
        VENTA - V-${venta.idventa}
      </h1>

      <div style="margin-bottom:20px;line-height:1.9">
        <p><strong>Nombre:</strong> ${venta.clientes?.nombre || '—'}</p>
        ${venta.clientes?.alias ? `<p><strong>Alias:</strong> ${venta.clientes.alias}</p>` : ''}
        ${venta.clientes?.direccion ? `<p><strong>Dirección:</strong> ${venta.clientes.direccion}</p>` : ''}
        ${venta.clientes?.telefono ? `<p><strong>Teléfono:</strong> ${venta.clientes.telefono}</p>` : ''}
        <p><strong>Fecha:</strong> ${fmtFecha(venta.fecha)}</p>
        <p><strong>Entregado:</strong> ${venta.entregado ? 'SÍ' : 'NO'}</p>
        <p><strong>Estado:</strong> ${venta.estado}</p>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
        <thead>
          <tr>
            <th style="border:1px solid #ccc;padding:8px 10px;background:#f0f0f0;text-align:left">Producto</th>
            <th style="border:1px solid #ccc;padding:8px 10px;background:#f0f0f0;text-align:center">Cantidad</th>
            <th style="border:1px solid #ccc;padding:8px 10px;background:#f0f0f0;text-align:center">Lote</th>
            <th style="border:1px solid #ccc;padding:8px 10px;background:#f0f0f0;text-align:center">Precio</th>
            <th style="border:1px solid #ccc;padding:8px 10px;background:#f0f0f0;text-align:center">Subtotal</th>
          </tr>
        </thead>
        <tbody>${filas}</tbody>
      </table>

      <div style="text-align:right;margin-top:8px">
        ${totalPagado > 0 ? `<p style="font-size:13px;margin-bottom:4px">Pagado: ${fmt(totalPagado)}</p>` : ''}
        ${venta.montopendiente > 0 ? `<p style="font-size:13px;color:#cc0000;font-weight:bold;margin-bottom:4px">Pendiente: ${fmt(venta.montopendiente)}</p>` : ''}
        <p style="font-size:15px;font-weight:bold;margin-top:8px">TOTAL VENTA: ${fmt(venta.montoventa)}</p>
      </div>

      ${filasPagos}

      <div style="margin-top:30px;border-top:1px solid #ccc;padding-top:12px;font-size:11px;color:#666">
        Generado el ${new Date().toLocaleDateString('es-AR')}
      </div>
    </div>
  `

  const templateParams = {
    to_email:       emailDestino,
    to_name:        venta.clientes?.nombre || 'Cliente',
    venta_id:       venta.idventa,
    cliente_nombre: venta.clientes?.nombre || '—',
    remito_html:    remitoHtml,
  }

  return emailjs.send(SERVICE_ID, TEMPLATE_ID, templateParams, PUBLIC_KEY)
}
