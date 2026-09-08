// ============================================================================
// Utilidades compartidas por toda la app. Se cuelga de window.Utils para que
// los componentes lo usen como window.Utils.xxx (mismo patron de Mis Finanzas).
// ============================================================================

window.Utils = (function () {
  const MESES_ES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
  ];
  const MESES_ES_UP = MESES_ES.map(m => m.toUpperCase());

  // Todos los tipos de hora extra que maneja la app
  const TIPOS_HORA = [
    { key: 'diurna',                    label: 'Hora extra diurna',          badge: 'b-diurna',   defaultPct: 0.25 },
    { key: 'nocturna',                  label: 'Hora extra nocturna',        badge: 'b-nocturna', defaultPct: 0.75 },
    { key: 'recargo_nocturno',          label: 'Recargo nocturno',           badge: 'b-recargo',  defaultPct: 0.35 },
    { key: 'recargo_festivo',           label: 'Recargo festivo',            badge: 'b-festivo',  defaultPct: 0.75 },
    { key: 'recargo_nocturno_festivo',  label: 'Recargo nocturno festivo',   badge: 'b-festivo',  defaultPct: 1.10 },
    { key: 'dominical',                 label: 'Hora extra dominical',       badge: 'b-festivo',  defaultPct: 1.00 },
    { key: 'festiva',                   label: 'Hora extra festiva',         badge: 'b-festivo',  defaultPct: 1.00 },
    { key: 'nocturna_festiva',          label: 'Hora extra nocturna festiva', badge: 'b-festivo', defaultPct: 1.50 },
  ];

  // Tipos que se pagan SOLO como adicional (base * porcentaje).
  // Los demas son horas extras completas y se pagan base * (1 + porcentaje).
  const RECARGOS_PUROS = new Set([
    'recargo_nocturno',
    'recargo_festivo',
    'recargo_nocturno_festivo',
  ]);

  // Divisor para calcular hora ordinaria: salario / 210 (jornada 42h/semana Colombia)
  const HORAS_MES = 210;

  function tipoInfo(key) {
    return TIPOS_HORA.find(t => t.key === key) || TIPOS_HORA[0];
  }

  function calcularValorHora(baseHora, tipoKey, pct) {
    if (!baseHora) return 0;
    if (RECARGOS_PUROS.has(tipoKey)) return baseHora * pct;
    return baseHora * (1 + pct);
  }

  function horasEntre(inicio, fin) {
    // inicio/fin como 'HH:MM'
    const [sh, sm] = inicio.split(':').map(Number);
    const [eh, em] = fin.split(':').map(Number);
    let mins = eh * 60 + em - (sh * 60 + sm);
    if (mins <= 0) mins += 24 * 60;
    return Math.round((mins / 60) * 100) / 100;
  }

  function cop(n) {
    if (n == null || n === 0 || isNaN(n)) return '—';
    return '$' + Math.round(n).toLocaleString('es-CO');
  }

  function horas2(n) {
    if (n == null) return '0';
    const r = Math.round(Number(n) * 100) / 100;
    return r === Math.floor(r) ? String(Math.floor(r)) : r.toFixed(2);
  }

  function mesLabel(mesKey) {
    if (!mesKey) return '';
    const [y, m] = mesKey.split('-');
    const idx = parseInt(m, 10) - 1;
    if (idx < 0 || idx > 11) return mesKey;
    return `${MESES_ES[idx]} ${y}`;
  }

  function mesLabelUp(mesKey) {
    if (!mesKey) return '';
    const [y, m] = mesKey.split('-');
    return `${MESES_ES_UP[parseInt(m, 10) - 1]} ${y}`;
  }

  function fechaHoyKey() {
    // 'YYYY-MM-DD' en hora local
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function mesActualKey() {
    return fechaHoyKey().slice(0, 7);
  }

  function mesFromFecha(fechaKey) {
    return (fechaKey || '').slice(0, 7);
  }

  return {
    MESES_ES, MESES_ES_UP,
    TIPOS_HORA, RECARGOS_PUROS, HORAS_MES,
    tipoInfo, calcularValorHora, horasEntre,
    cop, horas2, mesLabel, mesLabelUp,
    fechaHoyKey, mesActualKey, mesFromFecha,
  };
})();
