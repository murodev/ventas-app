// Genera e imprime un remito PDF para una venta
// Usa la API de impresión del navegador para generar el PDF

export async function generarRemito(venta, detalle, pagos) {
  const fmt = (n) =>
    '$' + Number(n || 0).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

  const fmtFecha = (s) =>
    s ? new Date(s).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '—'

  const totalPagado = pagos?.reduce((s, p) => s + (p.monto || 0), 0) || 0

  const filas = detalle.map(d => `
    <tr>
      <td>${d.productos?.producto || d.producto || '—'}</td>
      <td>${d.cantidad}</td>
      <td>${d.lote || '—'}</td>
      <td>${fmt(d.precio)}</td>
      <td>${fmt(d.subtotal || d.cantidad * d.precio)}</td>
    </tr>
  `).join('')

  const filasPagos = pagos?.length > 0 ? pagos.map(p => `
    <tr>
      <td>${p.mediospagos?.mediopago || '—'}</td>
      <td>${fmtFecha(p.fechapago)}</td>
      <td style="text-align:right">${fmt(p.monto)}</td>
    </tr>
  `).join('') : ''

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <title>Remito V-${venta.idventa}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, sans-serif;
      font-size: 12px;
      color: #111;
      padding: 40px;
      max-width: 800px;
      margin: 0 auto;
    }
    h1 {
      text-align: center;
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 24px;
      letter-spacing: 1px;
    }
    .info-block { margin-bottom: 20px; line-height: 1.9; }
    .info-block p { font-size: 12px; }
    .info-block strong { font-weight: bold; }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 16px;
    }
    th {
      background: #f0f0f0;
      border: 1px solid #ccc;
      padding: 8px 10px;
      font-size: 12px;
      font-weight: bold;
      text-align: center;
    }
    td {
      border: 1px solid #ccc;
      padding: 7px 10px;
      font-size: 12px;
      text-align: center;
    }
    td:first-child { text-align: left; }

    .totales {
      margin-top: 8px;
      text-align: right;
    }
    .totales p {
      font-size: 13px;
      margin-bottom: 4px;
    }
    .totales .total-venta {
      font-size: 15px;
      font-weight: bold;
      margin-top: 8px;
    }
    .totales .pendiente {
      color: #cc0000;
      font-weight: bold;
    }

    .pagos-section { margin-top: 20px; }
    .pagos-section h3 {
      font-size: 13px;
      font-weight: bold;
      margin-bottom: 8px;
      border-bottom: 1px solid #ccc;
      padding-bottom: 4px;
    }
    .pagos-section table th,
    .pagos-section table td {
      text-align: left;
    }

    .footer {
      margin-top: 40px;
      border-top: 1px solid #ccc;
      padding-top: 16px;
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: #666;
    }
    .firma {
      text-align: center;
      margin-top: 60px;
      border-top: 1px solid #333;
      padding-top: 8px;
      width: 200px;
      font-size: 11px;
    }

    @media print {
      body { padding: 20px; }
      @page { margin: 10mm; }
    }
  </style>
</head>
<body>
  <h1>VENTA - V-${venta.idventa}</h1>

  <div class="info-block">
    <p><strong>Nombre:</strong> ${venta.clientes?.nombre || '—'}</p>
    <p><strong>Emprendimiento:</strong> ${venta.clientes?.alias || '—'}</p>
    ${venta.clientes?.direccion ? `<p><strong>Dirección:</strong> ${venta.clientes.direccion}</p>` : ''}
    <p><strong>Fecha:</strong> ${fmtFecha(venta.fecha)}</p>
    <p><strong>Entregado:</strong> ${venta.entregado ? 'SÍ' : 'NO'}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>Producto</th>
        <th>Cantidad / Peso</th>
        <th>Lote</th>
        <th>Precio</th>
        <th>Subtotal</th>
      </tr>
    </thead>
    <tbody>
      ${filas}
    </tbody>
  </table>

  <div class="totales">
    ${totalPagado > 0 ? `<p>Pagado: ${fmt(totalPagado)}</p>` : ''}
    ${venta.montopendiente > 0 ? `<p class="pendiente">Pendiente: ${fmt(venta.montopendiente)}</p>` : ''}
    <p class="total-venta">TOTAL VENTA: ${fmt(venta.montoventa)}</p>
  </div>

  ${filasPagos ? `
  <div class="pagos-section">
    <h3>Pagos registrados</h3>
    <table>
      <thead>
        <tr><th>Medio de pago</th><th>Fecha</th><th>Monto</th></tr>
      </thead>
      <tbody>${filasPagos}</tbody>
    </table>
  </div>` : ''}

  <div class="footer">
    <span>Generado el ${new Date().toLocaleDateString('es-AR')}</span>
    <div class="firma">Firma / Recibí conforme</div>
  </div>
</body>
</html>`

  // Abrir en nueva ventana e imprimir (genera PDF desde el diálogo del navegador)
  const ventana = window.open('', '_blank', 'width=900,height=700')
  ventana.document.write(html)
  ventana.document.close()
  ventana.onload = () => {
    ventana.focus()
    ventana.print()
  }
}
