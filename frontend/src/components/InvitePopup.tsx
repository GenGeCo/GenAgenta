// GenAgenTa - Invite Popup Component
// Mostra popup quando l'utente ha un invito pendente

import { useState } from 'react';
import { api } from '../utils/api';

interface InvitePopupProps {
  invito: {
    id: string;
    azienda_id: string;
    nome_azienda: string;
    invitato_da: string;
  };
  onAccept: () => void;
  onDecline: () => void;
}

export default function InvitePopup({ invito, onAccept, onDecline }: InvitePopupProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAccept = async () => {
    setLoading(true);
    setError('');
    try {
      await api.accettaInvito(invito.id);
      onAccept();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { error?: string } } };
      setError(error.response?.data?.error || 'Errore durante l\'accettazione');
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    setLoading(true);
    try {
      await api.rifiutaInvito(invito.id);
      onDecline();
    } catch {
      onDecline(); // Ignora errori nel rifiuto
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3000,
      }}
    >
      <div
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: '16px',
          padding: '32px',
          width: '90%',
          maxWidth: '400px',
          textAlign: 'center',
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '28px',
          }}
        >
          👥
        </div>

        <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '12px' }}>
          Hai ricevuto un invito!
        </h2>

        <p style={{ color: 'var(--text-secondary)', fontSize: '15px', marginBottom: '8px' }}>
          <strong>{invito.invitato_da}</strong> ti ha invitato a unirti al team:
        </p>

        <div
          style={{
            background: 'var(--bg-primary)',
            padding: '16px',
            borderRadius: '12px',
            marginBottom: '24px',
          }}
        >
          <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--primary)' }}>
            {invito.nome_azienda}
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.1)',
              color: '#ef4444',
              marginBottom: '16px',
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            className="btn btn-secondary"
            onClick={handleDecline}
            disabled={loading}
            style={{ flex: 1 }}
          >
            Rifiuta
          </button>
          <button
            className="btn btn-primary"
            onClick={handleAccept}
            disabled={loading}
            style={{ flex: 1 }}
          >
            {loading ? 'Un momento...' : 'Accetta'}
          </button>
        </div>
      </div>
    </div>
  );
}
