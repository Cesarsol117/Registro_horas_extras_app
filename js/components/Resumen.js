window.Resumen = function Resumen() {
  const { useState, useEffect, useRef, useMemo } = React;
  const {
    TIPOS_HORA, horasEntre, calcularValorHora, cop, horas2,
    mesLabel, mesActualKey, tipoInfo, HORAS_MES,
  } = window.Utils;

  const [mesSel, setMesSel] = useState(mesActualKey());
  const [rows, setRows] = useState([]);
  const [salario, setSalario] = useState(null);
  const [pctByTipo, setPctByTipo] = useState({});
  const [manuales, setManuales] = useState({});
  const [loading, setLoading] = useState(true);
  const [meses, setMeses] = useState([]);

  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  async function reload() {
    setLoading(true);
    try {
      const [regs, sal, pct, man, todos] = await Promise.all([
        window.Api.registros.listByMes(mesSel),
        window.Api.salarios.getByMes(mesSel),
        window.Api.recargos.listVigentes(`${mesSel}-01`),
        window.Api.preciosManuales.listByMes(mesSel),
        window.Api.registros.listAll(),
      ]);
      setRows(regs);
      setSalario(sal ? Number(sal.salario) : null);
      setPctByTipo(pct);
      setManuales(man);

      // Construir set de meses disponibles
      const set = new Set(todos.map(r => r.fecha.slice(0, 7)));
      set.add(mesSel);
      set.add(mesActualKey());
      setMeses(Array.from(set).sort().reverse());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); }, [mesSel]);

  // Calculo del resumen
  const { tabla, totalHoras, totalDinero } = useMemo(() => {
    const base = salario ? salario / HORAS_MES : 0;
    const totales = {};
    TIPOS_HORA.forEach(t => { totales[t.key] = { horas: 0, dinero: 0 }; });

    for (const r of rows) {
      const h = horasEntre(r.inicio.slice(0, 5), r.fin.slice(0, 5));
      const pct = pctByTipo[r.tipo] ?? 0;
      const vHora = manuales[r.tipo] != null ? manuales[r.tipo] : calcularValorHora(base, r.tipo, pct);
      totales[r.tipo].horas += h;
      totales[r.tipo].dinero += h * vHora;
    }

    const tabla = TIPOS_HORA
      .filter(t => totales[t.key].horas > 0)
      .map(t => {
        const pct = pctByTipo[t.key] ?? 0;
        const vHora = manuales[t.key] != null ? manuales[t.key] : calcularValorHora(base, t.key, pct);
        return {
          tipo: t.key, label: t.label, badge: t.badge,
          horas: totales[t.key].horas,
          valorHora: vHora,
          total: totales[t.key].dinero,
        };
      });

    return {
      tabla,
      totalHoras: tabla.reduce((s, r) => s + r.horas, 0),
      totalDinero: tabla.reduce((s, r) => s + r.total, 0),
    };
  }, [rows, salario, pctByTipo, manuales]);

  // Grafica: pie de horas por tipo
  useEffect(() => {
    if (!chartRef.current) return;
    if (chartInstance.current) { chartInstance.current.destroy(); chartInstance.current = null; }
    if (tabla.length === 0) return;

    const colors = ['#e0b979', '#5b8fd0', '#8f83e0', '#d97878', '#e29fa0', '#7fbf9f', '#c39be0', '#a05a5a'];
    chartInstance.current = new Chart(chartRef.current, {
      type: 'doughnut',
      data: {
        labels: tabla.map(r => r.label),
        datasets: [{ data: tabla.map(r => r.horas), backgroundColor: colors, borderWidth: 0 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, padding: 10 } } },
      },
    });
    return () => { if (chartInstance.current) chartInstance.current.destroy(); };
  }, [tabla]);

  return (
    <div className="container">
      {/* Selector de mes + boton exportar */}
      <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
        <div className="d-flex align-items-center gap-2">
          <label className="mb-0 text-muted-sm">Mes:</label>
          <select className="form-select form-select-sm" style={{ width: 'auto' }}
            value={mesSel} onChange={e => setMesSel(e.target.value)}>
            {meses.map(m => <option key={m} value={m}>{mesLabel(m)}</option>)}
          </select>
        </div>
        <a href={`#/exportar?mes=${mesSel}`} className="btn btn-violeta btn-sm">
          <i className="bi bi-file-earmark-excel me-1"></i> Exportar Excel
        </a>
      </div>

      {loading ? (
        <p className="text-center text-muted py-5">Cargando…</p>
      ) : (
        <>
          {/* KPIs */}
          <div className="row g-3 mb-3">
            <div className="col-md-4">
              <div className="card stat-card p-3">
                <div className="label">Total horas extra</div>
                <div className="value text-extra">{horas2(totalHoras)}</div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card stat-card p-3">
                <div className="label">Registros</div>
                <div className="value">{rows.length}</div>
              </div>
            </div>
            <div className="col-md-4">
              <div className="card stat-card p-3">
                <div className="label">Valor generado</div>
                <div className="value text-money">{cop(totalDinero)}</div>
              </div>
            </div>
          </div>

          <div className="row g-3">
            {/* Grafica */}
            <div className="col-md-5">
              <div className="card p-3">
                <h6 className="mb-3">Horas por tipo</h6>
                {tabla.length ? (
                  <div style={{ position: 'relative', height: '280px' }}>
                    <canvas ref={chartRef}></canvas>
                  </div>
                ) : (
                  <p className="text-center text-muted my-4">Sin datos este mes.</p>
                )}
              </div>
            </div>

            {/* Tabla */}
            <div className="col-md-7">
              <div className="card p-3">
                <h6 className="mb-3">Detalle</h6>
                {tabla.length === 0 ? (
                  <p className="text-center text-muted my-4">No hay horas registradas este mes.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hoja align-middle small mb-0">
                      <thead>
                        <tr><th>Tipo</th><th>Horas</th><th>Valor hora</th><th>Total</th></tr>
                      </thead>
                      <tbody>
                        {tabla.map(r => (
                          <tr key={r.tipo}>
                            <td><span className={`badge-tipo ${r.badge}`}>{r.label}</span></td>
                            <td>{horas2(r.horas)}</td>
                            <td>{cop(r.valorHora)}</td>
                            <td className="fw-medium">{cop(r.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {!salario && (
                  <div className="alert alert-warning py-2 small mt-3 mb-0">
                    <i className="bi bi-exclamation-triangle"></i> No hay salario configurado para este mes.
                    Ve a <a href="#/precios">Precios</a> para agregarlo.
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
