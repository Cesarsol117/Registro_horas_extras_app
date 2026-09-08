window.Registros = function Registros() {
  const { useState, useEffect } = React;
  const { TIPOS_HORA, horasEntre, horas2, tipoInfo, fechaHoyKey } = window.Utils;

  const emptyForm = () => ({
    fecha: fechaHoyKey(),
    inicio: '',
    fin: '',
    tipo: 'diurna',
    observacion: '',
  });

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState(null);

  async function reload() {
    setLoading(true);
    setError('');
    try {
      const [uid, list] = await Promise.all([
        window.Api.auth.getUserId(),
        window.Api.registros.listAll(),
      ]);
      setUserId(uid);
      setRows(list);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { reload(); }, []);

  function setField(key, val) {
    setForm(f => ({ ...f, [key]: val }));
  }

  function beginEdit(row) {
    setEditingId(row.id);
    setForm({
      fecha: row.fecha,
      inicio: row.inicio.slice(0, 5),
      fin: row.fin.slice(0, 5),
      tipo: row.tipo,
      observacion: row.observacion || '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(emptyForm());
  }

  async function submit(e) {
    e.preventDefault();
    if (!form.fecha || !form.inicio || !form.fin) {
      setError('Completa fecha, hora de inicio y hora de fin.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        user_id: userId,
        fecha: form.fecha,
        inicio: form.inicio,
        fin: form.fin,
        tipo: form.tipo,
        observacion: form.observacion || '',
      };
      if (editingId) {
        await window.Api.registros.update(editingId, payload);
      } else {
        await window.Api.registros.create(payload);
      }
      cancelEdit();
      await reload();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!confirm('¿Eliminar este registro?')) return;
    try {
      await window.Api.registros.remove(id);
      if (editingId === id) cancelEdit();
      await reload();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="container">
      {/* Formulario */}
      <div className="card p-4 mb-3">
        <h5 className="mb-3">
          <i className={`bi ${editingId ? 'bi-pencil-square' : 'bi-plus-circle'} me-1 text-extra`}></i>
          {editingId ? 'Editar registro' : 'Nuevo registro'}
        </h5>
        <form onSubmit={submit}>
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Fecha</label>
              <input type="date" className="form-control" required
                value={form.fecha} onChange={e => setField('fecha', e.target.value)} />
            </div>
            <div className="col-md-4">
              <label className="form-label">Hora inicio</label>
              <input type="time" className="form-control" required
                value={form.inicio} onChange={e => setField('inicio', e.target.value)} />
            </div>
            <div className="col-md-4">
              <label className="form-label">Hora fin</label>
              <input type="time" className="form-control" required
                value={form.fin} onChange={e => setField('fin', e.target.value)} />
            </div>
            <div className="col-md-6">
              <label className="form-label">Tipo</label>
              <select className="form-select"
                value={form.tipo} onChange={e => setField('tipo', e.target.value)}>
                {TIPOS_HORA.map(t => (
                  <option key={t.key} value={t.key}>{t.label}</option>
                ))}
              </select>
            </div>
            <div className="col-md-6">
              <label className="form-label">Observaci&oacute;n</label>
              <input type="text" className="form-control"
                placeholder="Ej: ajuste minibloque"
                value={form.observacion} onChange={e => setField('observacion', e.target.value)} />
            </div>
          </div>

          {form.inicio && form.fin && (
            <div className="text-muted-sm mt-2">
              <i className="bi bi-clock"></i> {horas2(horasEntre(form.inicio, form.fin))} horas
            </div>
          )}

          {error && <div className="alert alert-danger py-2 mt-3 small">{error}</div>}

          <div className="d-flex gap-2 justify-content-end mt-3">
            {editingId && (
              <button type="button" className="btn btn-outline-secondary" onClick={cancelEdit}>
                Cancelar
              </button>
            )}
            <button type="submit" className="btn btn-violeta" disabled={saving}>
              {saving ? 'Guardando…' : (editingId ? 'Actualizar' : 'Guardar registro')}
            </button>
          </div>
        </form>
      </div>

      {/* Historial */}
      <div className="card p-4">
        <div className="d-flex justify-content-between align-items-center mb-3">
          <h5 className="mb-0"><i className="bi bi-list-ul me-1 text-muted"></i> Historial</h5>
          <span className="text-muted-sm">{rows.length} registros</span>
        </div>

        {loading ? (
          <p className="text-center text-muted py-4">Cargando…</p>
        ) : rows.length === 0 ? (
          <p className="text-center text-muted py-4">A&uacute;n no hay registros. Agrega el primero arriba.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-hoja align-middle small mb-0">
              <thead>
                <tr>
                  <th>Fecha</th><th>Inicio</th><th>Fin</th><th>Horas</th>
                  <th>Tipo</th><th>Observaci&oacute;n</th><th></th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const info = tipoInfo(r.tipo);
                  return (
                    <tr key={r.id}>
                      <td>{r.fecha}</td>
                      <td>{r.inicio.slice(0, 5)}</td>
                      <td>{r.fin.slice(0, 5)}</td>
                      <td>{horas2(horasEntre(r.inicio.slice(0, 5), r.fin.slice(0, 5)))}</td>
                      <td><span className={`badge-tipo ${info.badge}`}>{info.label}</span></td>
                      <td className="text-muted-sm">{r.observacion}</td>
                      <td className="text-end" style={{ whiteSpace: 'nowrap' }}>
                        <button className="btn btn-sm btn-link no-underline" onClick={() => beginEdit(r)}>
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button className="btn btn-sm btn-link no-underline text-danger" onClick={() => remove(r.id)}>
                          <i className="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
