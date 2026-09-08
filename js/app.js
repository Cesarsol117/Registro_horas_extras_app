// ============================================================================
// App shell: router hash-based + guardia de sesion.
// Rutas:
//   #/login    #/register
//   #/registros   #/resumen   #/precios   #/perfil   #/exportar
// ============================================================================

function parseRoute() {
  const hash = (window.location.hash || '').replace(/^#\/?/, '').split('?')[0];
  return hash.split('/').filter(Boolean);
}

function App() {
  const { useState, useEffect } = React;
  const [route, setRoute] = useState(parseRoute());
  const [session, setSession] = useState(undefined); // undefined = cargando

  useEffect(() => {
    window.Api.auth.getSession().then(s => setSession(s));
    const unsub = window.Api.auth.onChange(s => setSession(s));
    const onHashChange = () => setRoute(parseRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => {
      unsub && unsub();
      window.removeEventListener('hashchange', onHashChange);
    };
  }, []);

  // Loading inicial
  if (session === undefined) {
    return <div className="boot-loading">Cargando…</div>;
  }

  const first = route[0] || '';
  const isAuthRoute = first === 'login' || first === 'register';

  // Redirecciones segun sesion
  if (!session && !isAuthRoute) {
    window.location.hash = '#/login';
    return <div className="boot-loading">Redirigiendo…</div>;
  }
  if (session && isAuthRoute) {
    window.location.hash = '#/registros';
    return <div className="boot-loading">Redirigiendo…</div>;
  }

  // Sin sesion -> auth
  if (!session) {
    return <window.Auth mode={first === 'register' ? 'register' : 'login'} />;
  }

  // Con sesion -> app
  async function logout() {
    await window.Api.auth.signOut();
    window.location.hash = '#/login';
  }

  const email = session.user?.email;
  let page;
  switch (first) {
    case 'resumen': page = <window.Resumen />; break;
    case 'precios': page = <window.PreciosYSalario />; break;
    case 'perfil':  page = <window.Perfil />; break;
    case 'exportar': page = <window.Exportar route={route} />; break;
    case 'registros':
    default:        page = <window.Registros />;
  }

  return (
    <>
      <window.Nav route={route} onLogout={logout} email={email} />
      {page}
    </>
  );
}

const rootEl = document.getElementById('root');
ReactDOM.createRoot(rootEl).render(<App />);
