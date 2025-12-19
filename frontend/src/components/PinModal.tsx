// GenAgenTa - PIN Modal Component

import { useState, FormEvent, useRef, useEffect } from 'react';

interface PinModalProps {
  onVerify: (pin: string) => Promise<void>;
  onClose: () => void;
}

export default function PinModal({ onVerify, onClose }: PinModalProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus automatico
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) return;

    setError('');
    setLoading(true);

    try {
      await onVerify(pin);
    } catch (err) {
      setError('PIN non valido');
      setPin('');
      inputRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  // Chiudi con ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

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
          borderRadius: '12px',
          width: '100%',
          maxWidth: '360px',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
        }}
      >
        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '8px', textAlign: 'center' }}>
          Area Personale
        </h2>
        <p style={{ color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '24px' }}>
          Inserisci il PIN per accedere alle note personali e ai dati riservati
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <input
              ref={inputRef}
              type="password"
              className="form-input"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="PIN"
              maxLength={10}
              style={{
                fontSize: '24px',
                textAlign: 'center',
                letterSpacing: '8px',
                padding: '16px',
              }}
            />
          </div>

          {error && (
            <div style={{
              padding: '12px',
              marginBottom: '16px',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
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
              className="btn btn-secondary"
              onClick={onClose}
              style={{ flex: 1 }}
            >
              Annulla
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!pin.trim() || loading}
              style={{ flex: 1 }}
            >
              {loading ? 'Verifica...' : 'Accedi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
