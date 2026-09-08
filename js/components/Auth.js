window.Auth = function Auth({ mode }) {
  const { useState } = React;
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  const isRegister = mode === 'register';

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      if (isRegister) {
        await window.Api.auth.signUp(email, password);
        setInfo('Cuenta creada. Revisa tu correo para confirmar el email antes de iniciar sesion.');
      } else {
        await window.Api.auth.signIn(email, password);
        window.location.hash = '#/registros';
      }
    } catch (err) {
      setError(err.message || 'Ocurrio un error.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="card p-4">
        <h4 className="mb-3 text-center">
          <i className="bi bi-clock-history text-extra"></i> Horas Extras
        </h4>
        <p className="text-center text-muted-sm mb-3">
          {isRegister ? 'Crea tu cuenta' : 'Inicia sesion'}
        </p>

        <form onSubmit={submit}>
          <div className="mb-3">
            <label className="form-label">Correo</label>
            <input type="email" className="form-control" required
              value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="mb-3">
            <label className="form-label">Contrase&ntilde;a</label>
            <input type="password" className="form-control" required minLength={6}
              value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>

          {error && <div className="alert alert-danger py-2 small">{error}</div>}
          {info && <div className="alert alert-success py-2 small">{info}</div>}

          <button type="submit" className="btn btn-primary w-100" disabled={loading}>
            {loading ? 'Un momento…' : (isRegister ? 'Registrarme' : 'Entrar')}
          </button>
        </form>

        <div className="text-center mt-3">
          {isRegister
            ? <a href="#/login" className="small">Ya tengo cuenta</a>
            : <a href="#/register" className="small">¿No tienes cuenta? Registrate</a>}
        </div>
      </div>
    </div>
  );
};
