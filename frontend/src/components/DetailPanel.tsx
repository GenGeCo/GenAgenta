// GenAgenTa - Detail Panel Component

import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import type { Neurone, Sinapsi, NotaPersonale, VenditaProdotto, FamigliaProdotto } from '../types';
import SinapsiFormModal from './SinapsiFormModal';

interface DetailPanelProps {
  neurone: Neurone;
  personalAccess: boolean;
  onClose: () => void;
  onSelectNeurone?: (id: string) => void;
  onDelete?: () => void;
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
  onClose,
  onSelectNeurone,
  onDelete,
  onEdit,
  onRequestConnectionMapPick,
  connectionTargetEntity,
  onClearConnectionTarget,
  onSinapsiCreated,
}: DetailPanelProps) {
  const [sinapsi, setSinapsi] = useState<Sinapsi[]>([]);
  const [note, setNote] = useState<NotaPersonale[]>([]);
  const [activeTab, setActiveTab] = useState<'info' | 'vendite' | 'connessioni' | 'note'>('info');
  const [loading, setLoading] = useState(true);

  // Stato per eliminazione con doppio avviso
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0); // 0=no, 1=primo avviso, 2=conferma finale
  const [deleting, setDeleting] = useState(false);

  // Handler eliminazione
  const handleDelete = async () => {
    if (deleteStep === 0) {
      setDeleteStep(1);
      return;
    }
    if (deleteStep === 1) {
      setDeleteStep(2);
      return;
    }
    // Step 2: eliminazione effettiva
    setDeleting(true);
    try {
      await api.deleteNeurone(neurone.id);
      onDelete?.();
      onClose();
    } catch (error) {
      console.error('Errore eliminazione:', error);
      alert('Errore durante l\'eliminazione');
    } finally {
      setDeleting(false);
      setDeleteStep(0);
    }
  };

  const cancelDelete = () => {
    setDeleteStep(0);
  };

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
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {/* Bottone Modifica */}
          {onEdit && (
            <button
              onClick={onEdit}
              style={{
                background: 'var(--primary)',
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
          {/* Bottone Elimina */}
          <button
            onClick={handleDelete}
            disabled={deleting}
            style={{
              background: deleteStep > 0 ? '#ef4444' : 'transparent',
              border: deleteStep > 0 ? 'none' : '1px solid #ef4444',
              color: deleteStep > 0 ? 'white' : '#ef4444',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {deleting ? '...' : deleteStep === 0 ? 'Elimina' : deleteStep === 1 ? 'Conferma?' : 'ELIMINA!'}
          </button>
          {deleteStep > 0 && (
            <button
              onClick={cancelDelete}
              style={{
                background: 'transparent',
                border: '1px solid var(--border-color)',
                color: 'var(--text-secondary)',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              Annulla
            </button>
          )}
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
      </div>

      {/* Avviso eliminazione */}
      {deleteStep > 0 && (
        <div style={{
          padding: '12px 16px',
          background: deleteStep === 1 ? '#fef3c7' : '#fee2e2',
          borderBottom: '1px solid var(--border-color)',
          fontSize: '13px',
          color: deleteStep === 1 ? '#92400e' : '#b91c1c',
        }}>
          {deleteStep === 1 ? (
            <>
              <strong>Attenzione!</strong> Stai per eliminare "{neurone.nome}".
              {sinapsi.length > 0 && ` Verranno eliminate anche ${sinapsi.length} connessioni.`}
              {note.length > 0 && ` E ${note.length} note personali.`}
              <br />Clicca di nuovo per confermare.
            </>
          ) : (
            <>
              <strong>ULTIMA CONFERMA!</strong> L'eliminazione è irreversibile.
              <br />Clicca "ELIMINA!" per procedere o "Annulla" per tornare indietro.
            </>
          )}
        </div>
      )}

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
            {tab === 'vendite' ? '📊' : tab}
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
    if (preselectedEntity) {
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
                    {s.tipo_connessione.replace(/_/g, ' ')}
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
  const [potenziale, setPotenziale] = useState<number>(neurone.potenziale || 0);
  const [totaleVenduto, setTotaleVenduto] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPotenziale, setEditingPotenziale] = useState(false);
  const [tempPotenziale, setTempPotenziale] = useState<string>('');

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
      // Carica famiglie prodotto e vendite in parallelo
      const [famiglieRes, venditeRes] = await Promise.all([
        api.getFamiglieProdotto({ flat: true }),
        api.get(`/vendite?neurone_id=${neurone.id}`),
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

  const saveVendita = async (famigliaId: string, importo: number) => {
    setSaving(true);
    try {
      await api.post('/vendite', {
        neurone_id: neurone.id,
        famiglia_id: famigliaId,
        importo,
      });
      await loadData();
      onUpdate?.();
    } catch (error) {
      console.error('Errore salvataggio vendita:', error);
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
          <label style={{ fontWeight: 600, fontSize: '14px' }}>Potenziale di acquisto</label>
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

      {/* Lista vendite per famiglia */}
      <div>
        <h4 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>Vendite per prodotto</h4>

        {famiglie.length === 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
            Nessuna famiglia prodotto definita. Vai in Impostazioni → Prodotti per crearle.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {famiglie.filter(f => !f.nome.startsWith('  ')).map((famiglia, index) => {
              const vendita = vendite.find(v => v.famiglia_id === famiglia.id);
              const colore = famiglia.colore || coloriDefault[index % coloriDefault.length];
              const importo = vendita?.importo || 0;
              const percentualeFamiglia = potenziale > 0 ? (importo / potenziale) * 100 : 0;

              return (
                <VenditaRow
                  key={famiglia.id}
                  famiglia={famiglia}
                  colore={colore}
                  importo={importo}
                  percentuale={percentualeFamiglia}
                  onSave={(val) => saveVendita(famiglia.id, val)}
                  saving={saving}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Preview visuale */}
      {potenziale > 0 && vendite.length > 0 && (
        <div style={{ marginTop: '24px', padding: '16px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
          <h4 style={{ fontSize: '13px', fontWeight: 600, marginBottom: '12px', color: 'var(--text-secondary)' }}>
            Anteprima 3D
          </h4>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', height: '100px', padding: '0 20px' }}>
            {famiglie.filter(f => !f.nome.startsWith('  ')).map((famiglia, index) => {
              const vendita = vendite.find(v => v.famiglia_id === famiglia.id);
              const colore = famiglia.colore || coloriDefault[index % coloriDefault.length];
              const importo = vendita?.importo || 0;
              const altezza = potenziale > 0 ? (importo / potenziale) * 100 : 0;

              if (importo === 0) return null;

              return (
                <div
                  key={famiglia.id}
                  title={`${famiglia.nome}: €${importo.toLocaleString('it-IT')}`}
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
      )}
    </div>
  );
}

// Riga vendita singola famiglia
function VenditaRow({
  famiglia,
  colore,
  importo,
  percentuale,
  onSave,
  saving,
}: {
  famiglia: FamigliaProdotto;
  colore: string;
  importo: number;
  percentuale: number;
  onSave: (val: number) => void;
  saving: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [tempValue, setTempValue] = useState('');

  const handleSave = () => {
    const val = parseFloat(tempValue) || 0;
    onSave(val);
    setEditing(false);
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 12px',
      background: 'var(--bg-primary)',
      borderRadius: '6px',
      borderLeft: `4px solid ${colore}`,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '13px', fontWeight: 500 }}>{famiglia.nome.trim()}</div>
        {!editing && (
          <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
            {percentuale > 0 ? `${percentuale.toFixed(1)}% del potenziale` : 'Nessuna vendita'}
          </div>
        )}
      </div>
      {editing ? (
        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
          <span style={{ fontSize: '14px' }}>€</span>
          <input
            type="number"
            className="form-input"
            value={tempValue}
            onChange={(e) => setTempValue(e.target.value)}
            style={{ width: '100px', padding: '4px 8px' }}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSave();
              if (e.key === 'Escape') setEditing(false);
            }}
          />
          <button
            onClick={handleSave}
            disabled={saving}
            style={{ background: 'var(--primary)', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
          >
            ✓
          </button>
          <button
            onClick={() => setEditing(false)}
            style={{ background: 'none', border: '1px solid var(--border-color)', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      ) : (
        <div
          onClick={() => { setEditing(true); setTempValue(importo.toString()); }}
          style={{
            fontSize: '14px',
            fontWeight: 600,
            color: importo > 0 ? colore : 'var(--text-secondary)',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '4px',
            background: 'var(--bg-secondary)',
          }}
          title="Clicca per modificare"
        >
          €{importo.toLocaleString('it-IT')}
        </div>
      )}
    </div>
  );
}
