// GenAgenTa - User Menu Component

import { useState, useRef, useEffect } from 'react';
import type { User } from '../types';
import SettingsModal from './SettingsModal';

interface UserMenuProps {
  user: User;
  onLogout: () => void;
  onUserUpdate?: (updates: Partial<User>) => void;
}

export default function UserMenu({ user, onLogout, onUserUpdate }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('theme') as 'dark' | 'light') || 'dark';
  });
  const menuRef = useRef<HTMLDivElement>(null);

  // Chiudi menu quando clicchi fuori
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Applica tema
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const handleCopyCode = async () => {
    if (user.codice_pairing) {
      await navigator.clipboard.writeText(user.codice_pairing);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleTheme = () => {
    setTheme(t => t === 'dark' ? 'light' : 'dark');
  };

  // Genera iniziali per avatar
  const initials = user.nome
    .split(' ')
    .map(n => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // Avatar style con foto o iniziali
  const avatarStyle = (size: number) => ({
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    background: user.foto_url
      ? `url(${user.foto_url}) center/cover`
      : 'linear-gradient(135deg, var(--primary), #8b5cf6)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: `${size * 0.375}px`,
    fontWeight: 600,
    color: 'white',
  });

  return (
    <>
      <div ref={menuRef} style={{ position: 'relative' }}>
        {/* Trigger - Avatar + Nome */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '6px 12px 6px 6px',
            background: isOpen ? 'var(--bg-secondary)' : 'transparent',
            border: '1px solid var(--border-color)',
            borderRadius: '24px',
            color: 'var(--text-primary)',
            cursor: 'pointer',
            fontSize: '14px',
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            if (!isOpen) e.currentTarget.style.background = 'var(--bg-secondary)';
          }}
          onMouseLeave={(e) => {
            if (!isOpen) e.currentTarget.style.background = 'transparent';
          }}
        >
          {/* Avatar */}
          <div style={avatarStyle(32)}>
            {!user.foto_url && initials}
          </div>
          <span style={{ fontWeight: 500 }}>{user.nome}</span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            style={{
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s',
            }}
          >
            <path
              d="M2.5 4.5L6 8L9.5 4.5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              minWidth: '300px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              zIndex: 1000,
              overflow: 'hidden',
            }}
          >
            {/* Header profilo */}
            <div
              style={{
                padding: '20px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(139, 92, 246, 0.1))',
                borderBottom: '1px solid var(--border-color)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Avatar grande */}
                <div style={avatarStyle(48)}>
                  {!user.foto_url && initials}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '15px' }}>{user.nome}</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                    {user.email}
                  </div>
                </div>
              </div>

              {/* Badge azienda */}
              {user.nome_azienda && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '8px 12px',
                    background: 'var(--bg-primary)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }}>🏢</span>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>
                      {user.nome_azienda}
                    </span>
                  </div>
                  {user.ruolo_azienda === 'admin' && (
                    <span
                      style={{
                        background: 'var(--primary)',
                        color: 'white',
                        padding: '3px 8px',
                        borderRadius: '4px',
                        fontSize: '10px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                      }}
                    >
                      Admin
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Codice Pairing (solo per admin) */}
            {user.codice_pairing && user.ruolo_azienda === 'admin' && (
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--border-color)',
                }}
              >
                <div
                  style={{
                    fontSize: '12px',
                    color: 'var(--text-secondary)',
                    marginBottom: '8px',
                    fontWeight: 500,
                  }}
                >
                  👥 Invita colleghi
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <div
                    style={{
                      flex: 1,
                      padding: '10px 12px',
                      background: 'var(--bg-primary)',
                      borderRadius: '8px',
                      fontFamily: 'monospace',
                      fontSize: '15px',
                      letterSpacing: '2px',
                      color: 'var(--primary)',
                      fontWeight: 600,
                      textAlign: 'center',
                    }}
                  >
                    {user.codice_pairing}
                  </div>
                  <button
                    onClick={handleCopyCode}
                    style={{
                      padding: '10px 14px',
                      background: copied ? '#22c55e' : 'var(--primary)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 600,
                      transition: 'all 0.2s',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {copied ? '✓ Copiato!' : 'Copia'}
                  </button>
                </div>
              </div>
            )}

            {/* Opzioni */}
            <div style={{ padding: '8px' }}>
              {/* Impostazioni */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowSettings(true);
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <span style={{ fontSize: '16px' }}>⚙️</span>
                <span>Impostazioni</span>
              </button>

              {/* Toggle Tema */}
              <button
                onClick={toggleTheme}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  color: 'var(--text-primary)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--bg-hover)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ fontSize: '16px' }}>{theme === 'dark' ? '🌙' : '☀️'}</span>
                  <span>Tema {theme === 'dark' ? 'scuro' : 'chiaro'}</span>
                </span>
                {/* Toggle switch */}
                <div
                  style={{
                    width: '44px',
                    height: '24px',
                    background: theme === 'dark' ? 'var(--primary)' : '#94a3b8',
                    borderRadius: '12px',
                    position: 'relative',
                    transition: 'background 0.2s',
                  }}
                >
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      background: 'white',
                      borderRadius: '50%',
                      position: 'absolute',
                      top: '2px',
                      left: theme === 'dark' ? '22px' : '2px',
                      transition: 'left 0.2s',
                    }}
                  />
                </div>
              </button>

              {/* Separatore */}
              <div
                style={{
                  height: '1px',
                  background: 'var(--border-color)',
                  margin: '8px 0',
                }}
              />

              {/* Esci */}
              <button
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontSize: '14px',
                  textAlign: 'left',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                }}
              >
                <span style={{ fontSize: '16px' }}>🚪</span>
                <span>Esci</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          user={user}
          onClose={() => setShowSettings(false)}
          onUserUpdate={(updates) => {
            onUserUpdate?.(updates);
          }}
        />
      )}
    </>
  );
}
