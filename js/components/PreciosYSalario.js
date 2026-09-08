window.PreciosYSalario = function PreciosYSalario() {
  const { useState, useEffect, useMemo } = React;
  const {
    TIPOS_HORA, calcularValorHora, cop, mesLabel, mesActualKey,
    tipoInfo, HORAS_MES, fechaHoyKey,
  } = window.Utils;

  const [mesSel, setMesSel] = useState(mesActualKey());
  const [meses, setMeses] = useState([]);
  const [salario, setSalario] = useState('');
  const [pctByTipo, setPctByTipo] = useState({});
  const [manuales, setManuales] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [userId, setUserId] = useState(null);
  const [editRecargo, setEditRecargo] = useState(null); // { tipo, pct, fecha }

  async function reload() {
    setLoading(true);
    try {
      const [uid, sal, pct, man, todos] = await Promise.all([
        window.Api.auth.getUserId(),
        window.Api.salarios.getByMes(mesSel),
        window.Api.recargos.listVigentes(`${mesSel}-01`),
        window.Api.preciosManuales.listByMes(mesSel),
        window.Api.registros.listAll(),
      ]);
      setUserId(uid);
      setSalario(sal ? String(sal.salario) : '');
      setPctByTipo(pct);
      setManuales(Object.fromEntries(
        Object.entries(man).map(([k, v]) => [k, String(v)])
      ));

      const set = new Set(todos.map(r => r.fecha.slice(0, 7)));
      set.add(mesSel); set.add(mesActualKey());
      setMeses(Array.from(set).sort().reverse());
    } catch (e) {
      console.error(e);
      setMsg({ type: 'danger', text: e.message });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); }, [mesSel]);

  const base = useMemo(() => {
    const s = Number(salario);
    return s > 0 ? s / HORAS_MES : 0;
  }, [salario]);

  async function guardarSalario(e) {
    e.preventDefault();
    setSaving(true); setMsg(null);
    try {
      if (salario === '' || Number(salario) <= 0) {
        await window.Api.salarios.remove(mesSel);
        setMsg({ type: 'success', text: 'Salario borrado' });
      } else {
        await window.Api.salarios.upsert(mesSel, Number(salario));
        setMsg({ type: 'success', text: `Salario de ${mesLabel(mesSel)} guardado` });
      }
      await reload();
    } catch (e) {
      setMsg({ type: 'danger', text: e.message });
    } finally { setSaving(false); }
  }

  async function guardarManuales(e) {
    e.preventDefault();
    setSaving(true); setMsg(null);
    try {
      const clean = {};
      for (const t of TIPOS_HORA) {
        const v = manuales[t.key];
        clean[t.key] = (v === '' || v == null) ? null : Number(v);
      }
      await window.Api.preciosManuales.upsertMany(mesSel, clean);
      setMsg({ type: 'success', text: 'Precios manuales guardados' });
      await reload();
    } catch (e) {
      setMsg({ type: 'danger', text: e.message });
    } finally { setSaving(false); }
  }

  async function guardarRecargo() {
    if (!editRecargo) return;
    const { tipo, pct, fecha } = editRecargo;
    setSaving(true); setMsg(null);
    try {
      const pctFrac = Number(pct) / 100;
      await window.Api.recargos.upsert(tipo, pctFrac, fecha, 'Editado desde la app');
      setEditRecargo(null);
      setMsg({ type: 'success', text: `Recargo de ${tipoInfo(tipo).label} actualizado` });
      await reload();
    } catch (e) {
      setMsg({ type: 'danger', text: e.message });
    } finally { setSaving(false); }
  }

  return (
    <div className="container">
      {/* Selector de mes */}
      <div className="d-flex align-items-center gap-2 mb-3">
        <label className="mb-0 text-muted-sm">Mes a configurar:</label>
        <select className="form-select form-select-sm" style={{ width: 'auto' }}
          value={mesSel} onChange={e => setMesSel(e.target.value)}>
          {meses.map(m => <option key={m} value={m}>{mesLabel(m)}</option>)}
        </select>
      </div>

      {msg && <div className={`alert alert-${msg.type} py-2 small`}>{msg.text}</div>}

      {loading ? (
        <p className="text-center text-muted py-5">Cargando…</p>
      ) : (
        <>
          {/* Salario */}
          <div className="card p-4 mb-3">
            <h5 className="mb-3"><i className="bi bi-cash-stack text-money me-1"></i> Salario base</h5>
            <div className="alert alert-secondary py-2 small mb-3">
              El valor de la hora ordinaria = <strong>salario / {HORAS_MES}</strong> (jornada 42h/semana Colombia).
              Los recargos se aplican sobre esa base. Puedes forzar valores manuales m&aacute;s abajo.
            </div>
            <form onSubmit={guardarSalario} className="row g-3 align-items-end">
              <div className="col-md-4">
                <label className="form-label">Mes</label>
                <input type="text" className="form-control" disabled value={mesLabel(mesSel)} />
              </div>
              <div className="col-md-5">
                <label className="form-label">Salario mensual (COP)</label>
                <input type="number" className="form-control" min="0" step="0.01"
                  value={salario} onChange={e => setSalario(e.target.value)}
                  placeholder="Ej: 3417000" />
              </div>
              <div className="col-md-3 text-md-end">
                <button type="submit" className="btn btn-violeta w-100" disabled={saving}>
                  {saving ? 'Guardando…' : 'Guardar salario'}
                </button>
              </div>
            </form>
            {base > 0 && (
              <div className="text-muted-sm mt-2">
                <i className="bi bi-calculator"></i> Hora ordinaria: <strong>{cop(base)}</strong>
              </div>
            )}
          </div>

          {/* Recargos y precios */}
          <div className="card p-4 mb-3">
            <h5 className="mb-3"><i className="bi bi-percent text-recargo me-1"></i> Recargos y precios por hora</h5>
            <form onSubmit={guardarManuales}>
              <div className="table-responsive">
                <table className="table table-hoja align-middle small">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Recargo</th>
                      <th>Valor autom&aacute;tico</th>
                      <th>Manual (opcional)</th>
                      <th className="text-end">Editar %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TIPOS_HORA.map(t => {
                      const pct = pctByTipo[t.key] ?? t.defaultPct;
                      const auto = calcularValorHora(base, t.key, pct);
                      return (
                        <tr key={t.key}>
                          <td><span className={`badge-tipo ${t.badge}`}>{t.label}</span></td>
                          <td>{(pct * 100).toFixed(2)}%</td>
                          <td>{cop(auto)}</td>
                          <td>
                            <input type="number" min="0" step="0.01"
                              className="form-control form-control-sm"
                              placeholder="auto"
                              value={manuales[t.key] ?? ''}
                              onChange={e => setManuales(m => ({ ...m, [t.key]: e.target.value }))} />
                          </td>
                          <td className="text-end">
                            <button type="button" className="btn btn-sm btn-outline-secondary"
                              onClick={() => setEditRecargo({
                                tipo: t.key,
                                pct: (pct * 100).toFixed(2),
                                fecha: `${mesSel}-01`,
                              })}>
                              Cambiar %
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="text-end mt-2">
                <button type="submit" className="btn btn-violeta" disabled={saving}>
                  {saving ? 'Guardando…' : 'Guardar precios manuales'}
                </button>
              </div>
            </form>
          </div>

          {/* Modal-like para editar recargo */}
          {editRecargo && (
            <div className="card p-4 mb-3 border-primary">
              <h6 className="mb-3">
                Cambiar recargo de <strong>{tipoInfo(editRecargo.tipo).label}</strong>
              </h6>
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Nuevo porcentaje (%)</label>
                  <input type="number" min="0" step="0.01" className="form-control"
                    value={editRecargo.pct}
                    onChange={e => setEditRecargo(r => ({ ...r, pct: e.target.value }))} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Vigente desde</label>
                  <input type="date" className="form-control"
                    value={editRecargo.fecha}
                    onChange={e => setEditRecargo(r => ({ ...r, fecha: e.target.value }))} />
                </div>
              </div>
              <div className="d-flex gap-2 justify-content-end mt-3">
                <button className="btn btn-outline-secondary" onClick={() => setEditRecargo(null)}>Cancelar</button>
                <button className="btn btn-violeta" onClick={guardarRecargo} disabled={saving}>Guardar recargo</button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
