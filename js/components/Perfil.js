window.Perfil = function Perfil() {
  const { useState, useEffect } = React;

  const empty = { codigo_meta4: '', cedula: '', nombre: '', compania: '' };
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [userId, setUserId] = useState(null);

  async function reload() {
    setLoading(true); setMsg(null);
    try {
      const [uid, cola] = await Promise.all([
        window.Api.auth.getUserId(),
        window.Api.colaborador.get(),
      ]);
      setUserId(uid);
      if (cola) setForm({
        codigo_meta4: cola.codigo_meta4 || '',
        cedula: cola.cedula || '',
        nombre: cola.nombre || '',
        compania: cola.compania || '',
      });
    } catch (e) {
      setMsg({ type: 'danger', text: e.message });
    } finally { setLoading(false); }
  }

  useEffect(() => { reload(); }, []);

  async function submit(e) {
    e.preventDefault();
    setSaving(true); setMsg(null);
    try {
      await window.Api.colaborador.upsert({ user_id: userId, ...form });
      setMsg({ type: 'success', text: 'Perfil guardado' });
    } catch (e) {
      setMsg({ type: 'danger', text: e.message });
    } finally { setSaving(false); }
  }

  return (
    <div className="container">
      <div className="card p-4" style={{ maxWidth: 640, margin: '0 auto' }}>
        <h5 className="mb-3"><i className="bi bi-person-circle text-extra me-1"></i> Datos personales</h5>
        <p className="text-muted-sm mb-4">
          Esta informaci&oacute;n se imprime en las columnas A-D de la plantilla oficial cuando exportes a Excel.
        </p>

        {loading ? (
          <p className="text-center text-muted py-4">Cargando…</p>
        ) : (
          <form onSubmit={submit}>
            <div className="row g-3">
              <div className="col-md-6">
                <label className="form-label">C&oacute;digo Meta 4</label>
                <input type="text" className="form-control"
                  value={form.codigo_meta4}
                  onChange={e => setForm(f => ({ ...f, codigo_meta4: e.target.value }))}
                  placeholder="Ej: M14566" />
              </div>
              <div className="col-md-6">
                <label className="form-label">C&eacute;dula</label>
                <input type="text" className="form-control"
                  value={form.cedula}
                  onChange={e => setForm(f => ({ ...f, cedula: e.target.value }))}
                  placeholder="Solo n&uacute;meros" />
              </div>
              <div className="col-md-12">
                <label className="form-label">Nombre completo</label>
                <input type="text" className="form-control"
                  value={form.nombre}
                  onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))}
                  placeholder="Ej: CESAR PACHECO ROJAS" />
              </div>
              <div className="col-md-12">
                <label className="form-label">Compa&ntilde;&iacute;a</label>
                <input type="text" className="form-control"
                  value={form.compania}
                  onChange={e => setForm(f => ({ ...f, compania: e.target.value }))}
                  placeholder="Ej: LABORATORIOS BUSSI&Eacute;" />
              </div>
            </div>

            {msg && <div className={`alert alert-${msg.type} py-2 small mt-3 mb-0`}>{msg.text}</div>}

            <div className="text-end mt-3">
              <button type="submit" className="btn btn-violeta" disabled={saving}>
                {saving ? 'Guardando…' : 'Guardar perfil'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
