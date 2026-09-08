window.Nav = function Nav({ route, onLogout, email }) {
  const active = route[0] || 'registros';
  const link = (key, label, icon) => (
    <a href={`#/${key}`}
       className={'nav-link ' + (active === key ? 'active fw-medium' : '')}>
      <i className={`bi ${icon} me-1`}></i>{label}
    </a>
  );

  return (
    <nav className="navbar navbar-expand-md navbar-light bg-white border-bottom mb-4">
      <div className="container">
        <a className="navbar-brand fw-medium" href="#/registros">
          <i className="bi bi-clock-history text-extra me-1"></i> Horas Extras
        </a>
        <button className="navbar-toggler" data-bs-toggle="collapse" data-bs-target="#nav-cont">
          <span className="navbar-toggler-icon"></span>
        </button>
        <div id="nav-cont" className="collapse navbar-collapse">
          <ul className="navbar-nav me-auto mb-2 mb-md-0">
            <li className="nav-item">{link('registros', 'Registros', 'bi-journal-plus')}</li>
            <li className="nav-item">{link('resumen', 'Resumen', 'bi-bar-chart')}</li>
            <li className="nav-item">{link('precios', 'Precios', 'bi-cash-coin')}</li>
            <li className="nav-item">{link('perfil', 'Perfil', 'bi-person-circle')}</li>
          </ul>
          <div className="d-flex align-items-center gap-3">
            {email && <span className="text-muted-sm d-none d-md-inline">{email}</span>}
            <button className="btn btn-sm btn-outline-secondary" onClick={onLogout}>
              <i className="bi bi-box-arrow-right"></i> Salir
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
