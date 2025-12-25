// GenAgenTa - Detail Panel Component

import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import type { Neurone, Sinapsi, NotaPersonale, VenditaProdotto, FamigliaProdotto } from '../types';
import SinapsiFormModal from './SinapsiFormModal';

interface CategoriaConfig {
  id: string;
  tipo_id: string;
  nome: string;
  colore: string;
  ordine: number;
}

interface DetailPanelProps {
  neurone: Neurone;
  personalAccess: boolean;
  categorie: CategoriaConfig[]; // Per ottenere il colore della testata
  onClose: () => void;
  onSelectNeurone?: (id: string) => void;
  onEdit?: () => void; // Apre il form di modifica
  // Props per connessione su mappa
  onRequestConnectionMapPick?: () => void;
  connectionTargetEntity?: { id: string; nome: string; tipo: string } | null;
  onClearConnectionTarget?: () => void;
  onSinapsiCreated?: () => void;
}

export default function DetailPanel({
  neurone,
  personalAccess,
  categorie,
  onClose,
  onSelectNeurone,
  onEdit,
  onRequestConnectionMapPick,
  connectionTargetEntity,
  onClearConnectionTarget,
  onSinapsiCreated,
}: DetailPanelProps) {
  // Debug connectionTargetEntity
  console.log('DEBUG DetailPanel render, connectionTargetEntity:', connectionTargetEntity);

  const [sinapsi, setSinapsi] = useState<Sinapsi[]>([]);
  const [note, setNote] = useState<NotaPersonale[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'vendite' | 'connessioni' | 'note'>('info');
  const [loading, setLoading] = useState(true);

  // Ottieni il colore della prima categoria del neurone
  const getHeaderColor = () => {
    if (neurone.categorie.length > 0 && categorie.length > 0) {
      const primaCat = neurone.categorie[0];
      const catConfig = categorie.find(c => c.nome === primaCat);
      if (catConfig?.colore) {
        return catConfig.colore;
      }
    }
    // Colore default per tipo
    const coloriTipo: Record<string, string> = {
      persona: '#3b82f6',
      impresa: '#22c55e',
      cantiere: '#f97316',
      ente: '#8b5cf6',
    };
    return coloriTipo[neurone.tipo] || '#6b7280';
  };

  const headerColor = getHeaderColor();

  // Quando viene selezionata un'entità dalla mappa, passa automaticamente al tab connessioni
  useEffect(() => {
    if (connectionTargetEntity) {
      setActiveTab('connessioni');
    }
  }, [connectionTargetEntity]);

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
      {/* Header con colore categoria */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid var(--border-color)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        background: `linear-gradient(135deg, ${headerColor}20 0%, ${headerColor}05 100%)`,
        borderLeft: `4px solid ${headerColor}`,
      }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '4px', color: headerColor }}>
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
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Bottone Modifica */}
          {onEdit && (
            <button
              onClick={onEdit}
              style={{
                background: headerColor,
                border: 'none',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
                fontWeight: 500,
              }}
            >
              ✏️ Modifica
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: headerColor,
              lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--border-color)',
      }}>
        {['info', 'vendite', 'connessioni', 'note'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as 'info' | 'vendite' | 'connessioni' | 'note')}
            style={{
              flex: 1,
              padding: '12px',
              border: 'none',
              background: activeTab === tab ? 'var(--bg-secondary)' : 'transparent',
              borderBottom: activeTab === tab ? '2px solid var(--color-primary)' : '2px solid transparent',
              cursor: 'pointer',
              fontWeight: activeTab === tab ? 600 : 400,
              textTransform: 'capitalize',
              fontSize: '13px',
            }}
          >
            {tab === 'vendite' ? 'transazioni' : tab}
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
            {activeTab === 'vendite' && (
              <VenditeTab
                neurone={neurone}
                onUpdate={() => {
                  // Potrebbe essere necessario ricaricare il neurone per il rendering 3D
                }}
              />
            )}
            {activeTab === 'connessioni' && (
              <ConnessioniTab
                sinapsi={sinapsi}
                neurone={neurone}
                personalAccess={personalAccess}
                onSelectNeurone={onSelectNeurone}
                onSinapsiChange={() => {
                  api.getNeuroneSinapsi(neurone.id).then((res) => setSinapsi(res.data));
                  onSinapsiCreated?.(); // Ricarica sinapsi globali per la mappa
                }}
                onRequestMapPick={onRequestConnectionMapPick}
                preselectedEntity={connectionTargetEntity}
                onClearPreselected={onClearConnectionTarget}
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
  const [saving, setSaving] = useState(false);
  const [naturaLocale, setNaturaLocale] = useState({
    is_acquirente: neurone.is_acquirente,
    is_venditore: neurone.is_venditore,
    is_intermediario: neurone.is_intermediario,
    is_influencer: neurone.is_influencer,
  });

  const toggleNatura = async (campo: 'is_acquirente' | 'is_venditore' | 'is_intermediario' | 'is_influencer') => {
    setSaving(true);
    const nuovoValore = !naturaLocale[campo];
    try {
      await api.updateNeurone(neurone.id, { [campo]: nuovoValore });
      setNaturaLocale(prev => ({ ...prev, [campo]: nuovoValore }));
    } catch (error) {
      console.error('Errore aggiornamento natura:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Natura Commerciale */}
      <div style={{ marginBottom: '20px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
          Natura commerciale
        </div>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px',
            background: naturaLocale.is_acquirente ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-primary)',
            border: `1px solid ${naturaLocale.is_acquirente ? '#3b82f6' : 'var(--border-color)'}`,
            borderRadius: '6px', cursor: saving ? 'wait' : 'pointer', fontSize: '13px',
            opacity: saving ? 0.6 : 1,
          }}>
            <input type="checkbox" checked={!!naturaLocale.is_acquirente} onChange={() => toggleNatura('is_acquirente')} disabled={saving} />
            🛒 Acquirente
          </label>
          <label style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px',
            background: naturaLocale.is_venditore ? 'rgba(34, 197, 94, 0.15)' : 'var(--bg-primary)',
            border: `1px solid ${naturaLocale.is_venditore ? '#22c55e' : 'var(--border-color)'}`,
            borderRadius: '6px', cursor: saving ? 'wait' : 'pointer', fontSize: '13px',
            opacity: saving ? 0.6 : 1,
          }}>
            <input type="checkbox" checked={!!naturaLocale.is_venditore} onChange={() => toggleNatura('is_venditore')} disabled={saving} />
            🏭 Venditore
          </label>
          <label style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px',
            background: naturaLocale.is_intermediario ? 'rgba(234, 179, 8, 0.15)' : 'var(--bg-primary)',
            border: `1px solid ${naturaLocale.is_intermediario ? '#eab308' : 'var(--border-color)'}`,
            borderRadius: '6px', cursor: saving ? 'wait' : 'pointer', fontSize: '13px',
            opacity: saving ? 0.6 : 1,
          }}>
            <input type="checkbox" checked={!!naturaLocale.is_intermediario} onChange={() => toggleNatura('is_intermediario')} disabled={saving} />
            🔄 Intermediario
          </label>
          <label style={{
            display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 10px',
            background: naturaLocale.is_influencer ? 'rgba(168, 85, 247, 0.15)' : 'var(--bg-primary)',
            border: `1px solid ${naturaLocale.is_influencer ? '#a855f7' : 'var(--border-color)'}`,
            borderRadius: '6px', cursor: saving ? 'wait' : 'pointer', fontSize: '13px',
            opacity: saving ? 0.6 : 1,
          }}>
            <input type="checkbox" checked={!!naturaLocale.is_influencer} onChange={() => toggleNatura('is_influencer')} disabled={saving} />
            💡 Influencer
          </label>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px', fontStyle: 'italic' }}>
          Modifica la natura commerciale specifica per questa entità
        </div>
      </div>

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
  neurone,
  personalAccess,
  onSelectNeurone,
  onSinapsiChange,
  onRequestMapPick,
  preselectedEntity,
  onClearPreselected,
}: {
  sinapsi: Sinapsi[];
  neurone: Neurone;
  personalAccess: boolean;
  onSelectNeurone?: (id: string) => void;
  onSinapsiChange: () => void;
  onRequestMapPick?: () => void;
  preselectedEntity?: { id: string; nome: string; tipo: string } | null;
  onClearPreselected?: () => void;
}) {
  const [showForm, setShowForm] = useState(false);
  const [editingSinapsi, setEditingSinapsi] = useState<Sinapsi | undefined>(undefined);

  // Apri automaticamente il form se c'è un'entità pre-selezionata dalla mappa
  useEffect(() => {
    console.log('DEBUG ConnessioniTab preselectedEntity:', preselectedEntity);
    if (preselectedEntity) {
      console.log('DEBUG: Aprendo form con preselectedEntity:', preselectedEntity.nome);
      setEditingSinapsi(undefined);
      setShowForm(true);
    }
  }, [preselectedEntity]);

  const handleAddClick = () => {
    setEditingSinapsi(undefined);
    setShowForm(true);
  };

  const handleFormClose = () => {
    setShowForm(false);
    onClearPreselected?.();
  };

  const handleEditClick = (s: Sinapsi, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingSinapsi(s);
    setShowForm(true);
  };

  const handleDeleteClick = async (s: Sinapsi, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Eliminare la connessione con "${s.neurone_da === neurone.id ? s.nome_a : s.nome_da}"?`)) {
      return;
    }
    try {
      await api.deleteSinapsi(s.id);
      onSinapsiChange();
    } catch (error) {
      console.error('Errore eliminazione sinapsi:', error);
      alert('Errore durante l\'eliminazione');
    }
  };

  // Icona certezza
  const getCertezzaIcon = (certezza: string) => {
    switch (certezza) {
      case 'ipotesi':
        return '🔴';
      case 'probabile':
        return '🟡';
      case 'certo':
        return '🟢';
      default:
        return '';
    }
  };

  return (
    <div>
      {/* Pulsante aggiungi */}
      <button
        className="btn btn-primary"
        onClick={handleAddClick}
        style={{ width: '100%', marginBottom: '16px' }}
      >
        + Aggiungi connessione
      </button>

      {sinapsi.length === 0 ? (
        <p style={{ color: 'var(--text-secondary)' }}>Nessuna connessione</p>
      ) : (
        sinapsi.map((s) => {
          const isOutgoing = s.neurone_da === neurone.id;
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
                    {Array.isArray(s.tipo_connessione)
                      ? s.tipo_connessione.map(t => t.replace(/_/g, ' ')).join(' • ')
                      : String(s.tipo_connessione || '').replace(/_/g, ' ')}
                    {s.prodotto_nome && (
                      <span style={{ marginLeft: '6px', background: 'var(--bg-tertiary)', padding: '2px 6px', borderRadius: '4px' }}>
                        📦 {s.prodotto_nome}
                      </span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span title={s.certezza}>
                    {getCertezzaIcon(s.certezza)}
                  </span>
                  <button
                    onClick={(e) => handleEditClick(s, e)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      opacity: 0.6,
                    }}
                    title="Modifica"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={(e) => handleDeleteClick(s, e)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '14px',
                      opacity: 0.6,
                      color: '#ef4444',
                    }}
                    title="Elimina"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                {s.data_inizio} {s.data_fine ? `→ ${s.data_fine}` : '→ oggi'}
                {s.valore && ` • €${s.valore.toLocaleString()}`}
              </div>

              {/* Fonte informazione */}
              {s.fonte && (
                <div style={{ marginTop: '6px', fontSize: '11px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                  📍 {s.fonte}
                </div>
              )}

              {/* Data verifica (se certo) */}
              {s.certezza === 'certo' && s.data_verifica && (
                <div style={{ marginTop: '4px', fontSize: '11px', color: 'var(--color-success)' }}>
                  ✓ Verificato il {s.data_verifica}
                </div>
              )}

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
        })
      )}

      {/* Modal form */}
      {showForm && (
        <SinapsiFormModal
          neuroneCorrente={neurone}
          sinapsiDaModificare={editingSinapsi}
          personalAccess={personalAccess}
          onClose={handleFormClose}
          onSaved={() => {
            onSinapsiChange();
            onClearPreselected?.();
          }}
          onRequestMapPick={onRequestMapPick}
          preselectedEntity={preselectedEntity}
        />
      )}
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

// Interfaccia per controparte (neurone connesso)
interface Controparte {
  id: string;
  nome: string;
  sinapsi_id: string;
}

// Tab Vendite
function VenditeTab({
  neurone,
  onUpdate,
}: {
  neurone: Neurone;
  onUpdate?: () => void;
}) {
  const [vendite, setVendite] = useState<VenditaProdotto[]>([]);
  const [famiglie, setFamiglie] = useState<FamigliaProdotto[]>([]);
  const [controparti, setControparti] = useState<Controparte[]>([]);
  const [potenziale, setPotenziale] = useState<number>(neurone.potenziale || 0);
  const [totaleVenduto, setTotaleVenduto] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPotenziale, setEditingPotenziale] = useState(false);
  const [tempPotenziale, setTempPotenziale] = useState<string>('');

  // Etichetta dinamica in base alla natura commerciale
  const getEtichettaPotenziale = () => {
    if (neurone.is_intermediario) {
      return 'Valore Potenziale';
    }
    if (neurone.is_influencer) {
      return 'Valore Potenziale';
    }
    if (neurone.is_venditore && !neurone.is_acquirente) {
      return 'Potenziale di vendita';
    }
    return 'Potenziale di acquisto';
  };

  // Colori per le famiglie (se non hanno colore assegnato)
  const coloriDefault = [
    '#ef4444', '#f97316', '#eab308', '#22c55e', '#14b8a6',
    '#3b82f6', '#8b5cf6', '#ec4899', '#6366f1', '#84cc16'
  ];

  useEffect(() => {
    loadData();
  }, [neurone.id]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Carica famiglie prodotto, vendite e sinapsi in parallelo
      const [famiglieRes, venditeRes, sinapsiRes] = await Promise.all([
        api.getFamiglieProdotto({ flat: true }),
        api.get(`/vendite?neurone_id=${neurone.id}`),
        api.getNeuroneSinapsi(neurone.id),
      ]);

      // Flatten famiglie per select
      const flatFamiglie: FamigliaProdotto[] = [];
      const flatten = (items: FamigliaProdotto[], level = 0) => {
        items.forEach(item => {
          flatFamiglie.push({ ...item, nome: '  '.repeat(level) + item.nome });
          if (item.children) flatten(item.children, level + 1);
        });
      };
      flatten(famiglieRes.data);
      setFamiglie(flatFamiglie);

      // Estrai controparti dalle sinapsi (entità connesse)
      const listaControparti: Controparte[] = sinapsiRes.data.map((s: Sinapsi) => {
        const isOutgoing = s.neurone_da === neurone.id;
        return {
          id: isOutgoing ? s.neurone_a : s.neurone_da,
          nome: isOutgoing ? (s.nome_a || 'Sconosciuto') : (s.nome_da || 'Sconosciuto'),
          sinapsi_id: s.id,
        };
      });
      // Rimuovi duplicati (stessa entità può avere multiple connessioni)
      const uniqueControparti = listaControparti.filter(
        (c, index, self) => index === self.findIndex(t => t.id === c.id)
      );
      setControparti(uniqueControparti);

      console.log('=== DEBUG GET VENDITE ===');
      console.log('Neurone ID:', neurone.id);
      console.log('Risposta GET:', venditeRes.data);
      console.log('Controparti disponibili:', uniqueControparti);

      setVendite(venditeRes.data.data || []);
      setPotenziale(venditeRes.data.potenziale || 0);
      setTotaleVenduto(venditeRes.data.totale_venduto || 0);
    } catch (error) {
      console.error('Errore caricamento vendite:', error);
    } finally {
      setLoading(false);
    }
  };

  const savePotenziale = async () => {
    setSaving(true);
    try {
      await api.post('/vendite', {
        neurone_id: neurone.id,
        potenziale: parseFloat(tempPotenziale) || 0,
      });
      setPotenziale(parseFloat(tempPotenziale) || 0);
      setEditingPotenziale(false);
      onUpdate?.();
    } catch (error) {
      console.error('Errore salvataggio potenziale:', error);
    } finally {
      setSaving(false);
    }
  };

  const saveVendita = async (
    famigliaId: string,
    importo: number,
    dataVendita: string,
    controparteId?: string,
    sinapsiId?: string,
    tipoTransazione: 'acquisto' | 'vendita' = 'vendita'
  ) => {
    setSaving(true);
    try {
      const postResponse = await api.post('/vendite', {
        neurone_id: neurone.id,
        famiglia_id: famigliaId,
        importo,
        data_vendita: dataVendita || new Date().toISOString().split('T')[0],
        // Parametri transazione bilaterale
        controparte_id: controparteId || null,
        sinapsi_id: sinapsiId || null,
        tipo_transazione: tipoTransazione,
      });
      console.log('=== DEBUG POST VENDITA ===');
      console.log('Neurone ID:', neurone.id);
      console.log('Bilaterale:', !!controparteId);
      console.log('Risposta POST:', postResponse.data);

      await loadData();
      onUpdate?.();
    } catch (error) {
      console.error('Errore salvataggio vendita:', error);
    } finally {
      setSaving(false);
    }
  };

  const deleteVendita = async (venditaId: string) => {
    // Conferma prima di eliminare
    if (!window.confirm('Sei sicuro di voler eliminare questa vendita?')) {
      return;
    }

    setSaving(true);
    try {
      await api.delete(`/vendite/${venditaId}`);
      await loadData();
      onUpdate?.();
    } catch (error) {
      console.error('Errore eliminazione vendita:', error);
    } finally {
      setSaving(false);
    }
  };

  const percentuale = potenziale > 0 ? Math.round((totaleVenduto / potenziale) * 100) : 0;

  if (loading) {
    return <p style={{ color: 'var(--text-secondary)' }}>Caricamento...</p>;
  }

  return (
    <div>
      {/* Potenziale */}
      <div style={{ marginBottom: '20px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <label style={{ fontWeight: 600, fontSize: '14px' }}>{getEtichettaPotenziale()}</label>
          {!editingPotenziale ? (
            <button
              onClick={() => { setEditingPotenziale(true); setTempPotenziale(potenziale.toString()); }}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '12px' }}
            >
              ✏️ Modifica
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={savePotenziale}
                disabled={saving}
                style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
              >
                Salva
              </button>
              <button
                onClick={() => setEditingPotenziale(false)}
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
              >
                ✕
              </button>
            </div>
          )}
        </div>
        {editingPotenziale ? (
          <input
            type="number"
            className="form-input"
            value={tempPotenziale}
            onChange={(e) => setTempPotenziale(e.target.value)}
            placeholder="es: 100000"
            style={{ fontSize: '18px', fontWeight: 600 }}
            autoFocus
          />
        ) : (
          <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--primary)' }}>
            €{potenziale.toLocaleString('it-IT')}
          </div>
        )}
      </div>

      {/* Barra progresso */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Venduto: €{totaleVenduto.toLocaleString('it-IT')}</span>
          <span style={{ fontSize: '12px', fontWeight: 600, color: percentuale >= 100 ? '#22c55e' : 'var(--text-primary)' }}>{percentuale}%</span>
        </div>
        <div style={{ height: '12px', background: 'var(--bg-secondary)', borderRadius: '6px', overflow: 'hidden' }}>
          <div
            style={{
              height: '100%',
              width: `${Math.min(percentuale, 100)}%`,
              background: percentuale >= 100 ? '#22c55e' : percentuale >= 50 ? '#eab308' : '#ef4444',
              borderRadius: '6px',
              transition: 'width 0.3s ease',
            }}
          />
        </div>
      </div>

      {/* Nuova vendita */}
      <NuovaVenditaForm
        famiglie={famiglie}
        coloriDefault={coloriDefault}
        controparti={controparti}
        neurone={neurone}
        onSave={saveVendita}
        saving={saving}
      />

      {/* Lista vendite */}
      <div style={{ marginTop: '20px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
          Storico vendite ({vendite.length})
        </h4>

        {vendite.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Nessuna transazione registrata. Usa il form sopra per aggiungerne una.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {vendite.map((vendita, index) => {
              const famiglia = famiglie.find(f => f.id === vendita.famiglia_id);
              const colore = vendita.colore || famiglia?.colore || coloriDefault[index % coloriDefault.length];
              const isAcquisto = vendita.tipo_transazione === 'acquisto';
              const isBilaterale = !!vendita.controparte_id;

              return (
                <div
                  key={vendita.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 12px',
                    background: 'var(--bg-primary)',
                    borderRadius: '6px',
                    borderLeft: `4px solid ${colore}`,
                  }}
                >
                  {/* Icona tipo transazione */}
                  <div style={{
                    fontSize: '16px',
                    width: '24px',
                    textAlign: 'center',
                  }}>
                    {isAcquisto ? '🛒' : '🏭'}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {vendita.famiglia_nome || famiglia?.nome || 'Prodotto'}
                      {isBilaterale && (
                        <span style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          background: isAcquisto ? 'rgba(59, 130, 246, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                          color: isAcquisto ? '#3b82f6' : '#22c55e',
                          borderRadius: '4px',
                        }}>
                          🔗 Bilaterale
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                      📅 {vendita.data_vendita ? new Date(vendita.data_vendita).toLocaleDateString('it-IT') : '-'}
                      {vendita.controparte_nome && (
                        <span> • {isAcquisto ? 'da' : 'a'} <strong>{vendita.controparte_nome}</strong></span>
                      )}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: 600,
                    color: isAcquisto ? '#ef4444' : colore,
                  }}>
                    {isAcquisto ? '-' : '+'}€{vendita.importo.toLocaleString('it-IT')}
                  </div>
                  <button
                    onClick={() => deleteVendita(vendita.id)}
                    disabled={saving}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ef4444',
                      cursor: 'pointer',
                      padding: '4px',
                      fontSize: '12px',
                      opacity: 0.6,
                    }}
                    title="Elimina transazione"
                  >
                    🗑️
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview visuale - aggregata per famiglia */}
      {potenziale > 0 && vendite.length > 0 && (() => {
        // Aggrega vendite per famiglia
        const venditePerFamiglia = vendite.reduce((acc, v) => {
          acc[v.famiglia_id] = (acc[v.famiglia_id] || 0) + v.importo;
          return acc;
        }, {} as Record<string, number>);

        return (
          <div style={{ marginTop: '24px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
            <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-secondary)' }}>
              Anteprima 3D (totale per prodotto)
            </h4>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '100px', padding: '0 20px' }}>
              {Object.entries(venditePerFamiglia).map(([famigliaId, totale], index) => {
                const famiglia = famiglie.find(f => f.id === famigliaId);
                const colore = famiglia?.colore || coloriDefault[index % coloriDefault.length];
                const altezza = potenziale > 0 ? (totale / potenziale) * 100 : 0;

                return (
                  <div
                    key={famigliaId}
                    title={`${famiglia?.nome?.trim() || 'Prodotto'}: €${totale.toLocaleString('it-IT')}`}
                    style={{
                      width: '24px',
                      height: `${Math.max(altezza, 5)}%`,
                      background: colore,
                      borderRadius: '2px 2px 0 0',
                      transition: 'height 0.3s ease',
                    }}
                  />
                );
              })}
            </div>
            <div style={{
              borderTop: '2px dashed var(--border-color)',
              marginTop: '8px',
              paddingTop: '8px',
              fontSize: '11px',
              color: 'var(--text-secondary)',
              textAlign: 'center',
            }}>
              Linea venduto totale: {percentuale}%
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// Form nuova vendita con supporto transazioni bilaterali
function NuovaVenditaForm({
  famiglie,
  controparti,
  neurone,
  onSave,
  saving,
}: {
  famiglie: FamigliaProdotto[];
  coloriDefault: string[];
  controparti: Controparte[];
  neurone: Neurone;
  onSave: (
    famigliaId: string,
    importo: number,
    dataVendita: string,
    controparteId?: string,
    sinapsiId?: string,
    tipoTransazione?: 'acquisto' | 'vendita'
  ) => void;
  saving: boolean;
}) {
  const [famigliaId, setFamigliaId] = useState('');
  const [importo, setImporto] = useState('');
  const [dataVendita, setDataVendita] = useState(new Date().toISOString().split('T')[0]);
  const [controparteId, setControparteId] = useState('');
  const [tipoTransazione, setTipoTransazione] = useState<'acquisto' | 'vendita'>('vendita');
  const [expanded, setExpanded] = useState(false);

  // Determina il tipo transazione di default in base alla natura del neurone
  useEffect(() => {
    if (neurone.is_acquirente && !neurone.is_venditore) {
      setTipoTransazione('acquisto');
    } else {
      setTipoTransazione('vendita');
    }
  }, [neurone.is_acquirente, neurone.is_venditore]);

  const handleSubmit = () => {
    if (!famigliaId || !importo) return;

    // Trova sinapsi_id dalla controparte selezionata
    const controparte = controparti.find(c => c.id === controparteId);
    const sinapsiId = controparte?.sinapsi_id;

    onSave(
      famigliaId,
      parseFloat(importo),
      dataVendita,
      controparteId || undefined,
      sinapsiId,
      tipoTransazione
    );
    setImporto('');
    // Mantieni stessa famiglia, controparte e data per inserimenti rapidi
  };

  // Etichetta dinamica
  const getEtichettaTipo = () => {
    if (tipoTransazione === 'acquisto') {
      return neurone.is_venditore ? 'Acquistato da' : 'Comprato da';
    }
    return neurone.is_acquirente ? 'Venduto a' : 'Fornito a';
  };

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="btn btn-primary"
        style={{ width: '100%', marginBottom: '12px' }}
      >
        + Nuova transazione
      </button>
    );
  }

  return (
    <div style={{
      padding: '16px',
      background: 'var(--bg-secondary)',
      borderRadius: '8px',
      marginBottom: '12px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 600 }}>Nuova transazione</h4>
        <button
          onClick={() => setExpanded(false)}
          style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: 'var(--text-secondary)' }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Tipo transazione */}
        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
            Tipo transazione
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setTipoTransazione('vendita')}
              style={{
                flex: 1,
                padding: '8px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                background: tipoTransazione === 'vendita' ? '#22c55e' : 'var(--bg-primary)',
                color: tipoTransazione === 'vendita' ? 'white' : 'var(--text-primary)',
                fontWeight: tipoTransazione === 'vendita' ? 600 : 400,
              }}
            >
              🏭 Vendita
            </button>
            <button
              type="button"
              onClick={() => setTipoTransazione('acquisto')}
              style={{
                flex: 1,
                padding: '8px',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                background: tipoTransazione === 'acquisto' ? '#3b82f6' : 'var(--bg-primary)',
                color: tipoTransazione === 'acquisto' ? 'white' : 'var(--text-primary)',
                fontWeight: tipoTransazione === 'acquisto' ? 600 : 400,
              }}
            >
              🛒 Acquisto
            </button>
          </div>
        </div>

        {/* Prodotto */}
        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
            Prodotto *
          </label>
          <select
            className="form-input"
            value={famigliaId}
            onChange={(e) => setFamigliaId(e.target.value)}
          >
            <option value="">Seleziona prodotto...</option>
            {famiglie.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome.trim()}
              </option>
            ))}
          </select>
        </div>

        {/* Controparte */}
        <div>
          <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
            {getEtichettaTipo()}
          </label>
          <select
            className="form-input"
            value={controparteId}
            onChange={(e) => setControparteId(e.target.value)}
          >
            <option value="">👤 Cliente generico/occasionale</option>
            {controparti.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
          {controparteId ? (
            <div style={{
              marginTop: '6px',
              padding: '8px',
              background: tipoTransazione === 'acquisto' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(34, 197, 94, 0.1)',
              borderRadius: '4px',
              fontSize: '11px',
              color: tipoTransazione === 'acquisto' ? '#3b82f6' : '#22c55e',
            }}>
              🔗 Transazione bilaterale: verrà registrata anche su "{controparti.find(c => c.id === controparteId)?.nome}"
            </div>
          ) : (
            <div style={{
              marginTop: '6px',
              padding: '8px',
              background: 'rgba(156, 163, 175, 0.1)',
              borderRadius: '4px',
              fontSize: '11px',
              color: '#6b7280',
            }}>
              💡 Per tracciare chi compra/vende, prima crea una connessione con l'entità
            </div>
          )}
        </div>

        {/* Importo e Data */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
              Importo (€) *
            </label>
            <input
              type="number"
              className="form-input"
              value={importo}
              onChange={(e) => setImporto(e.target.value)}
              placeholder="es: 5000"
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px', display: 'block' }}>
              Data *
            </label>
            <input
              type="date"
              className="form-input"
              value={dataVendita}
              onChange={(e) => setDataVendita(e.target.value)}
            />
          </div>
        </div>

        {/* Pulsante salva */}
        <button
          onClick={handleSubmit}
          disabled={saving || !famigliaId || !importo}
          className="btn btn-primary"
          style={{ marginTop: '8px' }}
        >
          {saving ? 'Salvataggio...' : controparteId ? 'Salva (bilaterale)' : 'Salva (cliente generico)'}
        </button>
      </div>
    </div>
  );
}
