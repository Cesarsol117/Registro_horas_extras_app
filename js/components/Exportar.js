// ============================================================================
// Exportar Excel — usa ExcelJS para generar el archivo del lado cliente,
// llenando el layout de la plantilla oficial de Bussie.
// ============================================================================

window.Exportar = function Exportar({ route }) {
  const { useState, useEffect } = React;
  const {
    mesLabel, mesLabelUp, mesActualKey, horasEntre, horas2, tipoInfo,
  } = window.Utils;

  // Mes desde el querystring o el actual
  const qsMatch = (window.location.hash || '').match(/mes=([\d-]+)/);
  const mesInicial = qsMatch ? qsMatch[1] : mesActualKey();

  const [mesSel, setMesSel] = useState(mesInicial);
  const [meses, setMeses] = useState([]);
  const [regs, setRegs] = useState([]);
  const [colab, setColab] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);

  async function reload() {
    setLoading(true); setError('');
    try {
      const [c, r, todos] = await Promise.all([
        window.Api.colaborador.get(),
        window.Api.registros.listByMes(mesSel),
        window.Api.registros.listAll(),
      ]);
      setColab(c);
      setRegs(r);

      const set = new Set(todos.map(x => x.fecha.slice(0, 7)));
      set.add(mesSel); set.add(mesActualKey());
      setMeses(Array.from(set).sort().reverse());
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  }

  useEffect(() => { reload(); }, [mesSel]);

  const camposFaltantes = !colab
    ? ['todos los datos personales']
    : ['nombre', 'cedula', 'codigo_meta4', 'compania'].filter(k => !colab[k]);

  // Mapeo tipo -> columna en la plantilla
  const TIPO_A_COL = {
    diurna: 'K',
    nocturna: 'L',
    recargo_nocturno: 'M',
    dominical: 'N',
    festiva: 'N',
    nocturna_festiva: 'O',
    recargo_nocturno_festivo: 'P',
    recargo_festivo: 'Q',
  };

  async function generar() {
    if (camposFaltantes.length > 0) return;
    setGenerating(true); setError('');
    try {
      // 1) Cargar la plantilla desde assets/
      const res = await fetch('assets/plantilla.xlsx');
      if (!res.ok) throw new Error('No se pudo cargar la plantilla xlsx');
      const buf = await res.arrayBuffer();

      // 2) Abrir con ExcelJS
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(buf);
      const ws = wb.worksheets[0];

      const FILA_INICIO = 10;
      const MIN_FILAS_FORMATO = 60;
      const COLUMNAS = 'ABCDEFGHIJKLMNOPQRS'.split('');

      // 3) Guardar estilo de la fila de referencia (fila 10) para propagarlo
      const estilos = {};
      COLUMNAS.forEach(col => {
        const cell = ws.getCell(`${col}${FILA_INICIO}`);
        estilos[col] = {
          font: cell.font && { ...cell.font },
          fill: cell.fill && JSON.parse(JSON.stringify(cell.fill)),
          border: cell.border && JSON.parse(JSON.stringify(cell.border)),
          alignment: cell.alignment && { ...cell.alignment },
          numFmt: cell.numFmt,
        };
      });

      // 4) Limpiar valores de filas de datos
      const ultimaFila = Math.max(ws.rowCount, FILA_INICIO + regs.length, FILA_INICIO + MIN_FILAS_FORMATO);
      for (let row = FILA_INICIO; row <= ultimaFila; row++) {
        COLUMNAS.forEach(col => { ws.getCell(`${col}${row}`).value = null; });
      }

      // 5) Escribir los registros
      let fila = FILA_INICIO;
      for (const r of regs) {
        ws.getCell(`A${fila}`).value = colab.codigo_meta4;
        ws.getCell(`B${fila}`).value = colab.cedula;
        ws.getCell(`C${fila}`).value = colab.nombre;
        ws.getCell(`D${fila}`).value = colab.compania;
        ws.getCell(`E${fila}`).value = new Date(r.fecha + 'T00:00:00');
        // F: turno — en blanco
        ws.getCell(`G${fila}`).value = r.inicio.slice(0, 5);
        ws.getCell(`H${fila}`).value = r.fin.slice(0, 5);
        const h = horasEntre(r.inicio.slice(0, 5), r.fin.slice(0, 5));
        ws.getCell(`I${fila}`).value = h;
        // J: en blanco
        const col = TIPO_A_COL[r.tipo];
        if (col) ws.getCell(`${col}${fila}`).value = h;
        // R: en blanco
        ws.getCell(`S${fila}`).value = r.observacion || '';
        fila++;
      }

      // 6) B7: contador (siempre 1 por ahora)
      ws.getCell('B7').value = 1;

      // 7) Propagar estilos a filas hasta MIN_FILAS_FORMATO
      const filaFinFormato = FILA_INICIO + MIN_FILAS_FORMATO - 1;
      for (let row = FILA_INICIO; row <= filaFinFormato; row++) {
        COLUMNAS.forEach(col => {
          const cell = ws.getCell(`${col}${row}`);
          const es = estilos[col];
          if (es.font) cell.font = { ...es.font };
          if (es.fill) cell.fill = JSON.parse(JSON.stringify(es.fill));
          if (es.border) cell.border = JSON.parse(JSON.stringify(es.border));
          if (es.alignment) cell.alignment = { ...es.alignment };
          if (es.numFmt) cell.numFmt = es.numFmt;
        });
      }

      // 8) Descargar
      const out = await wb.xlsx.writeBuffer();
      const nombre = colab.nombre || 'REPORTE';
      const filename = `LAYOUT_HORAS_EXTRAS ${nombre} ${mesLabelUp(mesSel)}.xlsx`;
      const blob = new Blob([out], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename;
      document.body.appendChild(a); a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    } finally { setGenerating(false); }
  }

  return (
    <div className="container">
      <div className="card p-4" style={{ maxWidth: 640, margin: '0 auto' }}>
        <h5 className="mb-3"><i className="bi bi-file-earmark-excel text-money me-1"></i> Exportar a Excel</h5>
        <p className="text-muted-sm mb-3">
          Genera un archivo .xlsx con la plantilla oficial de Bussi&eacute; llena con los registros del mes.
        </p>

        {loading ? (
          <p className="text-center text-muted py-4">Cargando…</p>
        ) : (
          <>
            <div className="mb-3">
              <label className="form-label">Mes a exportar</label>
              <select className="form-select" value={mesSel} onChange={e => setMesSel(e.target.value)}>
                {meses.map(m => <option key={m} value={m}>{mesLabel(m)}</option>)}
              </select>
              <div className="text-muted-sm mt-1">
                <i className="bi bi-info-circle"></i> {regs.length} registros en este mes
              </div>
            </div>

            {camposFaltantes.length > 0 && (
              <div className="alert alert-warning py-2 small">
                <i className="bi bi-exclamation-triangle"></i> Configura primero tus datos personales
                en <a href="#/perfil">Perfil</a>
                {colab && (<> (faltan: {camposFaltantes.join(', ')})</>)}.
              </div>
            )}

            {error && <div className="alert alert-danger py-2 small">{error}</div>}

            <div className="d-flex justify-content-end gap-2">
              <a href="#/resumen" className="btn btn-outline-secondary">Volver</a>
              <button className="btn btn-violeta"
                disabled={generating || camposFaltantes.length > 0 || regs.length === 0}
                onClick={generar}>
                <i className="bi bi-download me-1"></i>
                {generating ? 'Generando…' : 'Descargar Excel'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
