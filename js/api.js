// ============================================================================
// Capa de acceso a Supabase. Todos los componentes llaman a window.Api.*
// en lugar de hablar directo con window.db. Esto centraliza:
//   - las columnas que se seleccionan
//   - el filtrado por user_id (RLS lo aplica igual del lado servidor, pero
//     asi el codigo cliente es explicito y facil de leer)
//   - los errores (throw para que el componente los muestre)
// ============================================================================

window.Api = (function () {
  const db = window.db;

  // Devuelve el primer dia del mes siguiente: '2026-02' -> '2026-03-01'.
  // Usado en los rangos de fecha para evitar dias invalidos (31 de febrero).
  function primerDiaSiguienteMes(mesKey) {
    const [y, m] = mesKey.split('-').map(Number);
    const ny = m === 12 ? y + 1 : y;
    const nm = m === 12 ? 1 : m + 1;
    return `${ny}-${String(nm).padStart(2, '0')}-01`;
  }

  // ------------------- AUTH -------------------
  const auth = {
    async getSession() {
      const { data } = await db.auth.getSession();
      return data.session;
    },
    async getUserId() {
      const { data } = await db.auth.getUser();
      return data.user?.id || null;
    },
    async signIn(email, password) {
      const { error } = await db.auth.signInWithPassword({ email, password });
      if (error) throw error;
    },
    async signUp(email, password) {
      const { error } = await db.auth.signUp({ email, password });
      if (error) throw error;
    },
    async signOut() {
      await db.auth.signOut();
    },
    onChange(cb) {
      const { data } = db.auth.onAuthStateChange((_ev, session) => cb(session));
      return () => data.subscription.unsubscribe();
    },
  };

  // ------------------- REGISTROS -------------------
  const registros = {
    async listByMes(mesKey) {
      // 'YYYY-MM' -> [primer dia del mes, primer dia del siguiente)
      const { data, error } = await db
        .from('registros')
        .select('*')
        .gte('fecha', `${mesKey}-01`)
        .lt('fecha', primerDiaSiguienteMes(mesKey))
        .order('fecha', { ascending: true })
        .order('inicio', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    async listAll() {
      const { data, error } = await db
        .from('registros')
        .select('*')
        .order('fecha', { ascending: false })
        .order('inicio', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    async create(reg) {
      const { data, error } = await db.from('registros').insert(reg).select().single();
      if (error) throw error;
      return data;
    },
    async update(id, reg) {
      const { data, error } = await db.from('registros').update(reg).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    async remove(id) {
      const { error } = await db.from('registros').delete().eq('id', id);
      if (error) throw error;
    },
  };

  // ------------------- SALARIOS -------------------
  const salarios = {
    async getByMes(mesKey) {
      const { data, error } = await db.from('salarios').select('*').eq('mes', mesKey).maybeSingle();
      if (error) throw error;
      return data;
    },
    async listAll() {
      const { data, error } = await db.from('salarios').select('*').order('mes', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    async upsert(mesKey, salario) {
      // Requiere user_id (lo agrega el componente antes de llamar)
      const { data, error } = await db
        .from('salarios')
        .upsert({ mes: mesKey, salario }, { onConflict: 'user_id,mes' })
        .select().single();
      if (error) throw error;
      return data;
    },
    async remove(mesKey) {
      const { error } = await db.from('salarios').delete().eq('mes', mesKey);
      if (error) throw error;
    },
  };

  // ------------------- RECARGOS -------------------
  const recargos = {
    async listVigentes(fechaRef) {
      // devuelve un dict {tipo: porcentaje} con el recargo vigente
      // para cada tipo a la fecha_ref
      const { data, error } = await db
        .from('recargos')
        .select('*')
        .lte('vigente_desde', fechaRef)
        .order('vigente_desde', { ascending: false });
      if (error) throw error;
      const vigentes = {};
      for (const row of data || []) {
        if (vigentes[row.tipo] === undefined) vigentes[row.tipo] = Number(row.porcentaje);
      }
      // Fallback a defaults si no hay uno cargado para ese tipo
      for (const t of window.Utils.TIPOS_HORA) {
        if (vigentes[t.key] === undefined) vigentes[t.key] = t.defaultPct;
      }
      return vigentes;
    },
    async upsert(tipo, porcentaje, vigenteDesde, observacion) {
      const { data, error } = await db
        .from('recargos')
        .upsert(
          { tipo, porcentaje, vigente_desde: vigenteDesde, observacion: observacion || '' },
          { onConflict: 'user_id,tipo,vigente_desde' }
        )
        .select().single();
      if (error) throw error;
      return data;
    },
  };

  // ------------------- PRECIOS MANUALES -------------------
  const preciosManuales = {
    async listByMes(mesKey) {
      const { data, error } = await db.from('precios_manuales').select('*').eq('mes', mesKey);
      if (error) throw error;
      const dict = {};
      for (const r of data || []) dict[r.tipo] = Number(r.valor);
      return dict;
    },
    async upsertMany(mesKey, valores) {
      // valores: { tipo: valor|null }. null/undefined => borra ese override
      const inserts = [];
      const borrarTipos = [];
      for (const [tipo, v] of Object.entries(valores)) {
        if (v === null || v === undefined || v === '' || isNaN(v)) borrarTipos.push(tipo);
        else inserts.push({ mes: mesKey, tipo, valor: Number(v) });
      }
      if (borrarTipos.length) {
        const { error } = await db
          .from('precios_manuales').delete()
          .eq('mes', mesKey).in('tipo', borrarTipos);
        if (error) throw error;
      }
      if (inserts.length) {
        const { error } = await db
          .from('precios_manuales')
          .upsert(inserts, { onConflict: 'user_id,mes,tipo' });
        if (error) throw error;
      }
    },
  };

  // ------------------- COLABORADOR (perfil) -------------------
  const colaborador = {
    async get() {
      const { data, error } = await db.from('colaborador').select('*').maybeSingle();
      if (error) throw error;
      return data;
    },
    async upsert(row) {
      const { data, error } = await db
        .from('colaborador')
        .upsert(row, { onConflict: 'user_id' })
        .select().single();
      if (error) throw error;
      return data;
    },
  };

  return { auth, registros, salarios, recargos, preciosManuales, colaborador };
})();
