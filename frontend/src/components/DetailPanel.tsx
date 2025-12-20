// GenAgenTa - Detail Panel Component

import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import type { Neurone, Sinapsi, NotaPersonale } from '../types';

interface DetailPanelProps {
  neurone: Neurone;
  personalAccess: boolean;
  onClose: () => void;
  onSelectNeurone?: (id: string) => void;
}

export default function DetailPanel({ neurone, personalAccess, onClose, onSelectNeurone }: DetailPanelProps) {
  const [sinapsi, setSinapsi] = useState<Sinapsi[]>([]);
  const [note, setNote] = useState<NotaPersonale[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'connessioni' | 'note'>('info');
  const [loading, setLoading] = useState(true);

  // Carica sinapsi e note
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [sinapsiRes, noteRes] = await Promise.all([
          api.getNeuroneSinapsi(neurone.id),
          personalAccess ? api.getNote(neurone.id) : Promise.resolve({ data: [] }),
        ]);
        setSinapsi(sinapsiRes.data);
        setNote(noteRes.data);
      } catch (error) {
        console.error('Errore caricamento dettagli:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [neurone.id, personalAccess]);

  // Badge tipo
  const getBadgeClass = () => {
    return `badge badge-${neurone.tipo}`;
  };

  return (
    <div className="detail-panel">
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
      }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px' }}>
            {neurone.nome}
            {neurone.has_note && !personalAccess && (
              <span className="icon-lock" title="Ha note personali (richiede PIN)">
                🔒
              </span>
            )}
          </h2>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            <span className={getBadgeClass()}>{neurone.tipo}</span>
            {neurone.categorie.map((cat) => (
              <span key={cat} className="badge">{cat}</span>
            ))}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '24px',
            cursor: 'pointer',
            color: 'var(--text-secondary)',
            lineHeight: 1,
          }}
        >
          &times;
        </button>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-color)',
      }}>
        {['info', 'connessioni', 'note'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as 'info' | 'connessioni' | 'note')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: activeTab === tab ? 'var(--bg-secondary)' : 'transparent',
              borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: activeTab === tab ? 600 : 400,
              textTransform: 'capitalize',
            }}
          >
            {tab}
            {tab === 'connessioni' && ` (${sinapsi.length})`}
            {tab === 'note' && personalAccess && ` (${note.length})`}
            {tab === 'note' && !personalAccess && neurone.has_note && ' 🔒'}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '16px', overflowY: 'auto' }}>
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Caricamento...</p>
        ) : (
          <>
            {activeTab === 'info' && <InfoTab neurone={neurone} />}
            {activeTab === 'connessioni' && (
              <ConnessioniTab
                sinapsi={sinapsi}
                neuroneId={neurone.id}
                onSelectNeurone={onSelectNeurone}
              />
            )}
            {activeTab === 'note' && (
              <NoteTab
                note={note}
                personalAccess={personalAccess}
                neuroneId={neurone.id}
                onNoteChange={setNote}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// Tab Info
function InfoTab({ neurone }: { neurone: Neurone }) {
  return (
    <div>
      {neurone.indirizzo && (
        <InfoRow label="Indirizzo" value={neurone.indirizzo} />
      )}
      {neurone.telefono && (
        <InfoRow label="Telefono" value={neurone.telefono} />
      )}
      {neurone.email && (
        <InfoRow label="Email" value={neurone.email} />
      )}
      {neurone.sito_web && (
        <InfoRow label="Sito web" value={neurone.sito_web} />
      )}
      {neurone.lat && neurone.lng && (
        <InfoRow label="Coordinate" value={`${neurone.lat}, ${neurone.lng}`} />
      )}

      {/* Dati extra */}
      {neurone.dati_extra && Object.keys(neurone.dati_extra).length > 0 && (
        <div style={{ marginTop: '16px' }}>
          <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px' }}>
            Dettagli aggiuntivi
          </h4>
          {Object.entries(neurone.dati_extra).map(([key, value]) => (
            <InfoRow
              key={key}
              label={key.replace(/_/g, ' ')}
              value={String(value)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ marginBottom: '12px' }}>
      <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
        {label}
      </div>
      <div style={{ fontSize: '14px' }}>{value}</div>
    </div>
  );
}

// Tab Connessioni
function ConnessioniTab({
  sinapsi,
  neuroneId,
  onSelectNeurone,
}: {
  sinapsi: Sinapsi[];
  neuroneId: string;
  onSelectNeurone?: (id: string) => void;
}) {
  if (sinapsi.length === 0) {
    return <p style={{ color: 'var(--text-secondary)' }}>Nessuna connessione</p>;
  }

  return (
    <div>
      {sinapsi.map((s) => {
        const isOutgoing = s.neurone_da === neuroneId;
        const altroNome = isOutgoing ? s.nome_a : s.nome_da;
        const altroId = isOutgoing ? s.neurone_a : s.neurone_da;

        return (
          <div
            key={s.id}
            className="card"
            style={{
              padding: '12px',
              cursor: onSelectNeurone ? 'pointer' : 'default',
              transition: 'background 0.15s',
            }}
            onClick={() => onSelectNeurone?.(altroId)}
            onMouseEnter={(e) => {
              if (onSelectNeurone) e.currentTarget.style.background = 'var(--bg-secondary)';
            }}
            onMouseLeave={(e) => {
              if (onSelectNeurone) e.currentTarget.style.background = '';
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontWeight: 500, marginBottom: '4px', color: 'var(--color-primary)' }}>
                  {isOutgoing ? '→' : '←'} {altroNome}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                  {s.tipo_connessione.replace(/_/g, ' ')}
                </div>
              </div>
              <span className={`badge badge-${s.certezza}`}>
                {s.certezza}
              </span>
            </div>

            <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              {s.data_inizio} {s.data_fine ? `→ ${s.data_fine}` : '→ oggi'}
              {s.valore && ` • €${s.valore.toLocaleString()}`}
            </div>

            {s.note && (
              <div style={{
                marginTop: '8px',
                padding: '8px',
                background: 'var(--bg-secondary)',
                borderRadius: '4px',
                fontSize: '13px',
              }}>
                {s.note}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Tab Note
function NoteTab({
  note,
  personalAccess,
  neuroneId,
  onNoteChange,
}: {
  note: NotaPersonale[];
  personalAccess: boolean;
  neuroneId: string;
  onNoteChange: (note: NotaPersonale[]) => void;
}) {
  const [newNota, setNewNota] = useState('');
  const [saving, setSaving] = useState(false);

  if (!personalAccess) {
    return (
      <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-secondary)' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔒</div>
        <p>Inserisci il PIN per vedere le note personali</p>
      </div>
    );
  }

  const handleAddNota = async () => {
    if (!newNota.trim()) return;

    setSaving(true);
    try {
      const { id } = await api.createNota(neuroneId, newNota);
      onNoteChange([
        ...note,
        {
          id,
          utente_id: '',
          neurone_id: neuroneId,
          testo: newNota,
          data_creazione: new Date().toISOString(),
          data_modifica: new Date().toISOString(),
        },
      ]);
      setNewNota('');
    } catch (error) {
      console.error('Errore salvataggio nota:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Form nuova nota */}
      <div style={{ marginBottom: '16px' }}>
        <textarea
          className="form-input"
          placeholder="Aggiungi una nota personale..."
          value={newNota}
          onChange={(e) => setNewNota(e.target.value)}
          rows={3}
          style={{ resize: 'vertical' }}
        />
        <button
          className="btn btn-primary"
          onClick={handleAddNota}
          disabled={!newNota.trim() || saving}
          style={{ marginTop: '8px' }}
        >
          {saving ? 'Salvataggio...' : 'Aggiungi nota'}
        </button>
      </div>

      {/* Lista note */}
      {note.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>Nessuna nota personale</p>
      ) : (
        note.map((n) => (
          <div key={n.id} className="card" style={{ padding: '12px' }}>
            <div style={{ whiteSpace: 'pre-wrap' }}>{n.testo}</div>
            <div style={{
              marginTop: '8px',
              fontSize: '11px',
              color: 'var(--text-secondary)',
            }}>
              {new Date(n.data_modifica).toLocaleString('it-IT')}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
