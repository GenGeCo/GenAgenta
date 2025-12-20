// GenAgenTa - Settings Modal Component

import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import type { User } from '../types';

interface SettingsModalProps {
  user: User;
  onClose: () => void;
  onUserUpdate: (user: Partial<User>) => void;
}

interface Membro {
  id: string;
  nome: string;
  email: string;
  ruolo_azienda: 'admin' | 'membro';
  data_creazione: string;
  foto_url?: string;
  is_me: boolean;
}

type Tab = 'profilo' | 'password' | 'team';

export default function SettingsModal({ user, onClose, onUserUpdate }: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>('profilo');

  // Profilo state
  const [nome, setNome] = useState(user.nome);
  const [fotoUrl, setFotoUrl] = useState(user.foto_url || '');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Password state
  const [passwordAttuale, setPasswordAttuale] = useState('');
  const [nuovaPassword, setNuovaPassword] = useState('');
  const [confermaPassword, setConfermaPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Team state
  const [membri, setMembri] = useState<Membro[]>([]);
  const [loadingMembri, setLoadingMembri] = useState(false);
  const [removingId, setRemovingId] = useState<string | null>(null);

  const isAdmin = user.ruolo_azienda === 'admin';

  // Carica membri quando si apre tab team
  useEffect(() => {
    if (activeTab === 'team' && user.azienda_id) {
      loadMembri();
    }
  }, [activeTab, user.azienda_id]);

  const loadMembri = async () => {
    setLoadingMembri(true);
    try {
      const response = await api.getAziendaMembri();
      setMembri(response.data);
    } catch (error) {
      console.error('Errore caricamento membri:', error);
    } finally {
      setLoadingMembri(false);
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileMessage(null);
    try {
      await api.updateProfile({ nome, foto_url: fotoUrl || undefined });
      onUserUpdate({ nome, foto_url: fotoUrl || undefined });
      setProfileMessage({ type: 'success', text: 'Profilo aggiornato!' });
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      setProfileMessage({ type: 'error', text: err.response?.data?.error || 'Errore aggiornamento profilo' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (nuovaPassword !== confermaPassword) {
      setPasswordMessage({ type: 'error', text: 'Le password non coincidono' });
      return;
    }
    if (nuovaPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'La password deve essere di almeno 6 caratteri' });
      return;
    }

    setSavingPassword(true);
    setPasswordMessage(null);
    try {
      await api.changePassword({
        password_attuale: passwordAttuale,
        nuova_password: nuovaPassword,
        conferma_password: confermaPassword,
      });
      setPasswordMessage({ type: 'success', text: 'Password aggiornata!' });
      setPasswordAttuale('');
      setNuovaPassword('');
      setConfermaPassword('');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      setPasswordMessage({ type: 'error', text: err.response?.data?.error || 'Errore cambio password' });
    } finally {
      setSavingPassword(false);
    }
  };

  const handleRemoveMembro = async (membroId: string, membroNome: string) => {
    if (!confirm(`Sei sicuro di voler rimuovere ${membroNome} dall'azienda?`)) {
      return;
    }

    setRemovingId(membroId);
    try {
      await api.removeAziendaMembro(membroId);
      setMembri(membri.filter(m => m.id !== membroId));
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      alert(err.response?.data?.error || 'Errore rimozione membro');
    } finally {
      setRemovingId(null);
    }
  };

  // Genera iniziali
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'var(--bg-secondary)',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-color)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Impostazioni</h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--border-color)',
            padding: '0 24px',
          }}
        >
          {[
            { id: 'profilo' as Tab, label: '👤 Profilo' },
            { id: 'password' as Tab, label: '🔒 Password' },
            ...(user.azienda_id ? [{ id: 'team' as Tab, label: '👥 Team' }] : []),
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: '12px 16px',
                background: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab.id ? '2px solid var(--primary)' : '2px solid transparent',
                color: activeTab === tab.id ? 'var(--primary)' : 'var(--text-secondary)',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={{ padding: '24px', overflowY: 'auto', flex: 1 }}>
          {/* TAB: Profilo */}
          {activeTab === 'profilo' && (
            <div>
              {/* Avatar preview */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
                <div
                  style={{
                    width: '80px',
                    height: '80px',
                    borderRadius: '50%',
                    background: fotoUrl ? `url(${fotoUrl}) center/cover` : 'linear-gradient(135deg, var(--primary), #8b5cf6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '24px',
                    fontWeight: 600,
                    color: 'white',
                  }}
                >
                  {!fotoUrl && getInitials(nome)}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '16px' }}>{nome}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>{user.email}</div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Nome visualizzato</label>
                <input
                  type="text"
                  className="form-input"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Il tuo nome"
                />
              </div>

              <div className="form-group">
                <label className="form-label">URL foto profilo (opzionale)</label>
                <input
                  type="url"
                  className="form-input"
                  value={fotoUrl}
                  onChange={(e) => setFotoUrl(e.target.value)}
                  placeholder="https://esempio.com/foto.jpg"
                />
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Puoi usare un URL di Gravatar, Google, o qualsiasi immagine pubblica
                </p>
              </div>

              {profileMessage && (
                <div
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: profileMessage.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: profileMessage.type === 'success' ? '#22c55e' : '#ef4444',
                    marginBottom: '16px',
                  }}
                >
                  {profileMessage.text}
                </div>
              )}

              <button
                className="btn btn-primary"
                onClick={handleSaveProfile}
                disabled={savingProfile || !nome.trim()}
                style={{ width: '100%' }}
              >
                {savingProfile ? 'Salvataggio...' : 'Salva modifiche'}
              </button>
            </div>
          )}

          {/* TAB: Password */}
          {activeTab === 'password' && (
            <div>
              <div className="form-group">
                <label className="form-label">Password attuale</label>
                <input
                  type="password"
                  className="form-input"
                  value={passwordAttuale}
                  onChange={(e) => setPasswordAttuale(e.target.value)}
                  placeholder="Inserisci la password attuale"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Nuova password</label>
                <input
                  type="password"
                  className="form-input"
                  value={nuovaPassword}
                  onChange={(e) => setNuovaPassword(e.target.value)}
                  placeholder="Minimo 6 caratteri"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Conferma nuova password</label>
                <input
                  type="password"
                  className="form-input"
                  value={confermaPassword}
                  onChange={(e) => setConfermaPassword(e.target.value)}
                  placeholder="Ripeti la nuova password"
                />
              </div>

              {passwordMessage && (
                <div
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    background: passwordMessage.type === 'success' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    color: passwordMessage.type === 'success' ? '#22c55e' : '#ef4444',
                    marginBottom: '16px',
                  }}
                >
                  {passwordMessage.text}
                </div>
              )}

              <button
                className="btn btn-primary"
                onClick={handleChangePassword}
                disabled={savingPassword || !passwordAttuale || !nuovaPassword || !confermaPassword}
                style={{ width: '100%' }}
              >
                {savingPassword ? 'Aggiornamento...' : 'Cambia password'}
              </button>
            </div>
          )}

          {/* TAB: Team */}
          {activeTab === 'team' && (
            <div>
              {/* Codice pairing (solo admin) */}
              {isAdmin && user.codice_pairing && (
                <div
                  style={{
                    padding: '16px',
                    background: 'var(--bg-primary)',
                    borderRadius: '12px',
                    marginBottom: '24px',
                  }}
                >
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Codice per invitare nuovi colleghi:
                  </div>
                  <div
                    style={{
                      fontFamily: 'monospace',
                      fontSize: '20px',
                      fontWeight: 600,
                      color: 'var(--primary)',
                      letterSpacing: '2px',
                    }}
                  >
                    {user.codice_pairing}
                  </div>
                </div>
              )}

              {/* Lista membri */}
              <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>
                Membri del team ({membri.length})
              </h3>

              {loadingMembri ? (
                <p style={{ color: 'var(--text-secondary)' }}>Caricamento...</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {membri.map((membro) => (
                    <div
                      key={membro.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px',
                        background: 'var(--bg-primary)',
                        borderRadius: '8px',
                      }}
                    >
                      {/* Avatar */}
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: membro.foto_url
                            ? `url(${membro.foto_url}) center/cover`
                            : 'linear-gradient(135deg, var(--primary), #8b5cf6)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: 'white',
                          flexShrink: 0,
                        }}
                      >
                        {!membro.foto_url && getInitials(membro.nome)}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {membro.nome}
                          {membro.is_me && (
                            <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>(tu)</span>
                          )}
                          {membro.ruolo_azienda === 'admin' && (
                            <span
                              style={{
                                background: 'var(--primary)',
                                color: 'white',
                                padding: '2px 6px',
                                borderRadius: '4px',
                                fontSize: '10px',
                              }}
                            >
                              Admin
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {membro.email}
                        </div>
                      </div>

                      {/* Azioni (solo admin, non su se stesso, non su altri admin) */}
                      {isAdmin && !membro.is_me && membro.ruolo_azienda !== 'admin' && (
                        <button
                          onClick={() => handleRemoveMembro(membro.id, membro.nome)}
                          disabled={removingId === membro.id}
                          style={{
                            padding: '6px 12px',
                            background: 'rgba(239, 68, 68, 0.1)',
                            color: '#ef4444',
                            border: 'none',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            fontSize: '12px',
                          }}
                        >
                          {removingId === membro.id ? '...' : 'Rimuovi'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
