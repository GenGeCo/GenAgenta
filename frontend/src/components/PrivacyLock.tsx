// GenAgenTa - Privacy Lock Modals
// Modal per verifica e impostazione PIN

import { useState, FormEvent, useRef, useEffect } from 'react';

interface PinVerifyModalProps {
  onVerify: (pin: string) => Promise<void>;
  onClose: () => void;
}

interface PinSetModalProps {
  onSetPin: (pin: string) => Promise<void>;
  onClose: () => void;
}

// Modal per verificare PIN
export function PinVerifyModal({ onVerify, onClose }: PinVerifyModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;

    setError('');
    setLoading(true);

    try {
      await onVerify(pin);
      onClose();
    } catch {
      setError('PIN non valido');
      setPin('');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'white',
          padding: '32px',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '360px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>
            Area Personale
          </h2>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            Inserisci il PIN per vedere i tuoi dati privati
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <input
            ref={inputRef}
            type="password"
            inputMode="numeric"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
            placeholder="PIN"
            maxLength={10}
            style={{
              width: '100%',
              fontSize: '32px',
              textAlign: 'center',
              letterSpacing: '12px',
              padding: '16px',
              border: '2px solid #e5e7eb',
              borderRadius: '12px',
              marginBottom: '16px',
              boxSizing: 'border-box',
            }}
          />

          {error && (
            <div style={{
              padding: '12px',
              marginBottom: '16px',
              background: '#fef2f2',
              color: '#dc2626',
              borderRadius: '8px',
              fontSize: '14px',
              textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '14px',
                border: '1px solid #e5e7eb',
                borderRadius: '10px',
                background: 'white',
                fontSize: '15px',
                cursor: 'pointer',
              }}
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={!pin.trim() || loading}
              style={{
                flex: 1,
                padding: '14px',
                border: 'none',
                borderRadius: '10px',
                background: '#6366f1',
                color: 'white',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                opacity: !pin.trim() || loading ? 0.5 : 1,
              }}
            >
              {loading ? '...' : 'Sblocca'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Modal per impostare PIN
export function PinSetModal({ onSetPin, onClose }: PinSetModalProps) {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 100);
  }, []);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;

    if (pin.length < 4) {
      setError('PIN deve essere almeno 4 cifre');
      return;
    }
    if (!/^[0-9]+$/.test(pin)) {
      setError('PIN deve contenere solo numeri');
      return;
    }
    if (pin !== confirmPin) {
      setError('I PIN non coincidono');
      return;
    }

    setError('');
    setLoading(true);

    try {
      await onSetPin(pin);
      onClose();
    } catch {
      setError('Errore nel salvare il PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: 'white',
          padding: '32px',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '360px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔐</div>
          <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>
            Crea il tuo PIN
          </h2>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            Il PIN protegge i tuoi dati personali. Solo tu potrai vederli.
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '12px' }}>
            <label style={{ fontSize: '13px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
              Nuovo PIN (min 4 cifre)
            </label>
            <input
              ref={inputRef}
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              maxLength={10}
              style={{
                width: '100%',
                fontSize: '24px',
                textAlign: 'center',
                letterSpacing: '8px',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '13px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
              Conferma PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
              maxLength={10}
              style={{
                width: '100%',
                fontSize: '24px',
                textAlign: 'center',
                letterSpacing: '8px',
                padding: '12px',
                border: '2px solid #e5e7eb',
                borderRadius: '10px',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '12px',
              marginBottom: '16px',
              background: '#fef2f2',
              color: '#dc2626',
              borderRadius: '8px',
              fontSize: '14px',
              textAlign: 'center',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '14px',
                border: '1px solid #e5e7eb',
                borderRadius: '10px',
                background: 'white',
                fontSize: '15px',
                cursor: 'pointer',
              }}
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={!pin || !confirmPin || loading}
              style={{
                flex: 1,
                padding: '14px',
                border: 'none',
                borderRadius: '10px',
                background: '#22c55e',
                color: 'white',
                fontSize: '15px',
                fontWeight: 600,
                cursor: 'pointer',
                opacity: !pin || !confirmPin || loading ? 0.5 : 1,
              }}
            >
              {loading ? '...' : 'Salva PIN'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
