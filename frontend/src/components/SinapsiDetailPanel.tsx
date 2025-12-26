// GenAgenTa - Pannello Dettagli Connessione (Sinapsi)

import { useState, useEffect } from 'react';
import type { Sinapsi } from '../types';
import { api } from '../utils/api';

interface DatiOggettivi {
  volume_totale: number;
  numero_transazioni: number;
  ultima_transazione: string | null;
  prima_transazione: string | null;
}

interface SinapsiDetailPanelProps {
  sinapsiId: string;
  onClose: () => void;
}

// Componente stelline cliccabili
function StarRating({
  value,
  onChange,
  label,
  disabled = false,
}: {
  value: number;
  onChange: (val: number) => void;
  label: string;
  disabled?: boolean;
}) {
  const [hover, setHover] = useState(0);

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
      <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{label}</span>
      <div style={{ display: 'flex', gap: '2px' }}>
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => onChange(value === star ? 0 : star)} // Click su stesso valore = reset
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            style={{
              background: 'none',
              border: 'none',
              cursor: disabled ? 'default' : 'pointer',
              fontSize: '18px',
              color: star <= (hover || value) ? '#f59e0b' : '#d1d5db',
              transition: 'color 0.15s',
              padding: '0 1px',
            }}
          >
            ★
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SinapsiDetailPanel({ sinapsiId, onClose }: SinapsiDetailPanelProps) {
  const [sinapsi, setSinapsi] = useState<Sinapsi | null>(null);
  const [datiOggettivi, setDatiOggettivi] = useState<DatiOggettivi | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Valori soggettivi editabili
  const [influenza, setInfluenza] = useState(0);
  const [qualitaRelazione, setQualitaRelazione] = useState(0);
  const [importanzaStrategica, setImportanzaStrategica] = useState(0);
  const [affidabilita, setAffidabilita] = useState(0);
  const [potenziale, setPotenziale] = useState(0);
  const [noteRelazione, setNoteRelazione] = useState('');

  // Carica dati sinapsi
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const data = await api.getSinapsiById(sinapsiId);
        setSinapsi(data);
        setDatiOggettivi(data.dati_oggettivi || null);

        // Imposta valori soggettivi
        setInfluenza(data.influenza || 0);
        setQualitaRelazione(data.qualita_relazione || 0);
        setImportanzaStrategica(data.importanza_strategica || 0);
        setAffidabilita(data.affidabilita || 0);
        setPotenziale(data.potenziale || 0);
        setNoteRelazione(data.note_relazione || '');
      } catch (err) {
        console.error('Errore caricamento sinapsi:', err);
        setError('Errore caricamento dati');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [sinapsiId]);

  // Salva valutazione
  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      await api.updateSinapsi(sinapsiId, {
        influenza: influenza || null,
        qualita_relazione: qualitaRelazione || null,
        importanza_strategica: importanzaStrategica || null,
        affidabilita: affidabilita || null,
        potenziale: potenziale || null,
        note_relazione: noteRelazione || null,
      });
      // Feedback visivo
      setError(''); // Clear any error
    } catch (err) {
      console.error('Errore salvataggio:', err);
      setError('Errore salvataggio');
    } finally {
      setSaving(false);
    }
  };

  // Parse tipo connessione
  const getTipoLabel = () => {
    if (!sinapsi) return 'Connessione';
    const tipo = sinapsi.tipo_connessione;
    if (Array.isArray(tipo) && tipo.length > 0) {
      return tipo.map(t => t.charAt(0).toUpperCase() + t.slice(1)).join(', ');
    }
    return 'Connessione';
  };

  // Icona tipo
  const getTipoIcon = () => {
    const label = getTipoLabel().toLowerCase();
    if (label.includes('commerciale')) return '💰';
    if (label.includes('influencer') || label.includes('prescrittore')) return '⭐';
    if (label.includes('tecnico')) return '🔧';
    if (label.includes('forni')) return '📦';
    if (label.includes('partner') || label.includes('collabor')) return '🤝';
    return '🔗';
  };

  // Colore certezza
  const getCertezzaStyle = () => {
    if (!sinapsi) return { color: '#94a3b8', label: '' };
    switch (sinapsi.certezza) {
      case 'certo': return { color: '#22c55e', label: 'Certo' };
      case 'probabile': return { color: '#eab308', label: 'Probabile' };
      default: return { color: '#94a3b8', label: 'Ipotetico' };
    }
  };

  if (loading) {
    return (
      <div className="detail-panel">
        <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Caricamento...
        </div>
      </div>
    );
  }

  if (!sinapsi) {
    return (
      <div className="detail-panel">
        <div style={{ padding: '20px' }}>
          <button onClick={onClose} style={{ float: 'right', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
          <p style={{ color: 'var(--text-secondary)' }}>Connessione non trovata</p>
        </div>
      </div>
    );
  }

  const certezza = getCertezzaStyle();

  return (
    <div className="detail-panel">
      {/* Header */}
      <div style={{
        padding: '16px',
        borderBottom: '1px solid var(--border-color)',
        background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.02) 100%)',
        borderLeft: '4px solid #6366f1',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '24px' }}>{getTipoIcon()}</span>
              <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: '#6366f1' }}>
                {getTipoLabel()}
              </h2>
              <span style={{ fontSize: '12px', color: certezza.color }}>● {certezza.label}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#6366f1' }}
          >
            &times;
          </button>
        </div>
      </div>

      {/* Contenuto scrollabile */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {/* Entità collegate */}
        <div style={{
          background: 'var(--bg-secondary)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px',
        }}>
          <div style={{ fontWeight: 500, fontSize: '14px' }}>{sinapsi.nome_da || 'Entità 1'}</div>
          {sinapsi.tipo_da && <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{sinapsi.tipo_da}</div>}
          <div style={{ textAlign: 'center', color: 'var(--text-secondary)', margin: '8px 0', fontSize: '16px' }}>↕</div>
          <div style={{ fontWeight: 500, fontSize: '14px' }}>{sinapsi.nome_a || 'Entità 2'}</div>
          {sinapsi.tipo_a && <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>{sinapsi.tipo_a}</div>}
        </div>

        {/* Dati Oggettivi */}
        {datiOggettivi && (datiOggettivi.volume_totale > 0 || datiOggettivi.numero_transazioni > 0) && (
          <div style={{
            background: '#f0fdf4',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '16px',
          }}>
            <div style={{ fontSize: '11px', color: '#22c55e', fontWeight: 600, marginBottom: '8px', textTransform: 'uppercase' }}>
              Dati Oggettivi
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Volume totale</span>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>€{datiOggettivi.volume_totale.toLocaleString('it-IT')}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Transazioni</span>
              <span style={{ fontSize: '13px', fontWeight: 600 }}>{datiOggettivi.numero_transazioni}</span>
            </div>
            {datiOggettivi.ultima_transazione && (
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginTop: '8px' }}>
                Ultima: {new Date(datiOggettivi.ultima_transazione).toLocaleDateString('it-IT')}
              </div>
            )}
          </div>
        )}

        {/* Valutazione Soggettiva */}
        <div style={{
          background: 'var(--bg-secondary)',
          borderRadius: '8px',
          padding: '12px',
          marginBottom: '16px',
        }}>
          <div style={{ fontSize: '11px', color: '#f59e0b', fontWeight: 600, marginBottom: '12px', textTransform: 'uppercase' }}>
            Valutazione Soggettiva
          </div>

          <StarRating
            label="Influenza"
            value={influenza}
            onChange={setInfluenza}
          />
          <StarRating
            label="Qualità relazione"
            value={qualitaRelazione}
            onChange={setQualitaRelazione}
          />
          <StarRating
            label="Importanza strategica"
            value={importanzaStrategica}
            onChange={setImportanzaStrategica}
          />
          <StarRating
            label="Affidabilità"
            value={affidabilita}
            onChange={setAffidabilita}
          />
          <StarRating
            label="Potenziale"
            value={potenziale}
            onChange={setPotenziale}
          />

          <div style={{ marginTop: '12px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
              Note sulla relazione
            </label>
            <textarea
              value={noteRelazione}
              onChange={(e) => setNoteRelazione(e.target.value)}
              placeholder="Appunti sulla relazione..."
              style={{
                width: '100%',
                padding: '8px',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                fontSize: '13px',
                resize: 'vertical',
                minHeight: '60px',
                background: 'var(--bg-primary)',
              }}
            />
          </div>
        </div>

        {/* Info aggiuntive */}
        <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
          {sinapsi.data_inizio && (
            <div style={{ marginBottom: '4px' }}>
              <strong>Dal:</strong> {new Date(sinapsi.data_inizio).toLocaleDateString('it-IT')}
            </div>
          )}
          {sinapsi.fonte && (
            <div style={{ marginBottom: '4px' }}>
              <strong>Fonte:</strong> {sinapsi.fonte}
            </div>
          )}
        </div>

        {error && (
          <div style={{ padding: '8px', background: 'rgba(239,68,68,0.1)', borderRadius: '6px', color: '#ef4444', fontSize: '12px', marginTop: '12px' }}>
            {error}
          </div>
        )}
      </div>

      {/* Footer con bottone Salva */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border-color)',
        display: 'flex',
        gap: '8px',
      }}>
        <button
          onClick={onClose}
          style={{
            flex: 1,
            padding: '10px',
            border: '1px solid var(--border-color)',
            borderRadius: '8px',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          Chiudi
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            flex: 1,
            padding: '10px',
            border: 'none',
            borderRadius: '8px',
            background: '#6366f1',
            color: 'white',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 600,
          }}
        >
          {saving ? 'Salvataggio...' : 'Salva Valutazione'}
        </button>
      </div>
    </div>
  );
}
