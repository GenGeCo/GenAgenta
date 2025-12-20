// GenAgenTa - Registration Page

import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { api } from '../utils/api';

type RegistrationMode = 'new' | 'join';

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Se arriva con ?codice=XXX, pre-compila e metti in modalità "join"
  const codiceFromUrl = searchParams.get('codice') || '';

  const [mode, setMode] = useState<RegistrationMode>(codiceFromUrl ? 'join' : 'new');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nomeAzienda, setNomeAzienda] = useState('');
  const [codiceAzienda, setCodiceAzienda] = useState(codiceFromUrl);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Aggiorna codice se cambia nella URL
  useEffect(() => {
    if (codiceFromUrl) {
      setCodiceAzienda(codiceFromUrl);
      setMode('join');
    }
  }, [codiceFromUrl]);
  const [success, setSuccess] = useState<{
    azienda: { nome: string; codice_pairing: string };
  } | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    // Validazione
    if (password !== confirmPassword) {
      setError('Le password non coincidono');
      return;
    }

    if (password.length < 6) {
      setError('La password deve essere di almeno 6 caratteri');
      return;
    }

    if (mode === 'new' && !nomeAzienda.trim()) {
      setError('Inserisci il nome della tua azienda');
      return;
    }

    if (mode === 'join' && !codiceAzienda.trim()) {
      setError('Inserisci il codice azienda');
      return;
    }

    setLoading(true);

    try {
      const result = await api.register({
        email,
        password,
        nome,
        nome_azienda: mode === 'new' ? nomeAzienda : undefined,
        codice_azienda: mode === 'join' ? codiceAzienda.toUpperCase() : undefined,
      });

      if (mode === 'new') {
        // Mostra il codice pairing
        setSuccess({
          azienda: result.azienda,
        });
      } else {
        // Vai direttamente alla dashboard
        navigate('/', { replace: true });
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Errore durante la registrazione');
    } finally {
      setLoading(false);
    }
  };

  // Schermata di successo con codice pairing
  if (success) {
    return (
      <div className="login-container">
        <div className="login-card">
          <h1 className="login-title">🎉 Registrazione Completata!</h1>

          <div style={{
            background: 'rgba(34, 197, 94, 0.1)',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px',
            textAlign: 'center'
          }}>
            <p style={{ marginBottom: '12px', color: 'var(--text-secondary)' }}>
              La tua azienda <strong>{success.azienda.nome}</strong> è stata creata.
            </p>
            <p style={{ marginBottom: '8px', fontSize: '14px', color: 'var(--text-secondary)' }}>
              Codice per invitare i colleghi:
            </p>
            <div style={{
              fontSize: '24px',
              fontWeight: 'bold',
              fontFamily: 'monospace',
              color: 'var(--primary)',
              letterSpacing: '2px',
              padding: '12px',
              background: 'var(--bg-primary)',
              borderRadius: '8px'
            }}>
              {success.azienda.codice_pairing}
            </div>
          </div>

          <p style={{
            fontSize: '13px',
            color: 'var(--text-secondary)',
            marginBottom: '24px',
            textAlign: 'center'
          }}>
            Condividi questo codice con i tuoi colleghi.<br />
            Lo useranno per unirsi alla tua azienda durante la registrazione.
          </p>

          <button
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={() => navigate('/', { replace: true })}
          >
            Vai alla Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1 className="login-title">GenAgenTa</h1>
        <p className="login-subtitle">Crea il tuo account</p>

        {/* Toggle modalità */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px'
        }}>
          <button
            type="button"
            className={`btn ${mode === 'new' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, fontSize: '13px' }}
            onClick={() => setMode('new')}
          >
            Nuova Azienda
          </button>
          <button
            type="button"
            className={`btn ${mode === 'join' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flex: 1, fontSize: '13px' }}
            onClick={() => setMode('join')}
          >
            Unisciti
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="nome">Il tuo nome</label>
            <input
              id="nome"
              type="text"
              className="form-input"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Mario Rossi"
              required
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">Email</label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@esempio.it"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimo 6 caratteri"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">Conferma Password</label>
            <input
              id="confirmPassword"
              type="password"
              className="form-input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ripeti la password"
              required
            />
          </div>

          {mode === 'new' ? (
            <div className="form-group">
              <label className="form-label" htmlFor="nomeAzienda">Nome Azienda</label>
              <input
                id="nomeAzienda"
                type="text"
                className="form-input"
                value={nomeAzienda}
                onChange={(e) => setNomeAzienda(e.target.value)}
                placeholder="La tua azienda S.r.l."
                required
              />
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Riceverai un codice da condividere con i colleghi
              </p>
            </div>
          ) : (
            <div className="form-group">
              <label className="form-label" htmlFor="codiceAzienda">Codice Azienda</label>
              <input
                id="codiceAzienda"
                type="text"
                className="form-input"
                value={codiceAzienda}
                onChange={(e) => setCodiceAzienda(e.target.value.toUpperCase())}
                placeholder="GEA-XXXXXX"
                style={{ fontFamily: 'monospace', letterSpacing: '1px' }}
                required
              />
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Chiedi il codice all'amministratore della tua azienda
              </p>
            </div>
          )}

          {error && (
            <div style={{
              padding: '12px',
              marginBottom: '16px',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              borderRadius: '8px',
              fontSize: '14px'
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%' }}
            disabled={loading}
          >
            {loading ? 'Registrazione in corso...' : 'Registrati'}
          </button>
        </form>

        <p style={{
          marginTop: '24px',
          fontSize: '14px',
          color: 'var(--text-secondary)',
          textAlign: 'center'
        }}>
          Hai già un account?{' '}
          <Link to="/login" style={{ color: 'var(--primary)' }}>
            Accedi
          </Link>
        </p>
      </div>
    </div>
  );
}
