// GenAgenTa - Form Modal per creazione/modifica Sinapsi

import { useState, useEffect } from 'react';
import { api } from '../utils/api';
import type { Neurone, Sinapsi, Certezza, Livello, TipoSinapsiConfig, FamigliaProdotto } from '../types';
import EntityPickerModal from './EntityPickerModal';

interface SinapsiFormModalProps {
  neuroneCorrente: Neurone;
  sinapsiDaModificare?: Sinapsi;
  personalAccess: boolean;
  onClose: () => void;
  onSaved: () => void;
  onRequestMapPick?: () => void;
  preselectedEntity?: { id: string; nome: string; tipo: string } | null;
}

export default function SinapsiFormModal({
  neuroneCorrente,
  sinapsiDaModificare,
  personalAccess,
  onClose,
  onSaved,
  onRequestMapPick,
  preselectedEntity,
}: SinapsiFormModalProps) {
  const isEditing = !!sinapsiDaModificare;

  // Form state
  const [neuroneCollegato, setNeuroneCollegato] = useState<string>(
    preselectedEntity?.id ||
    (sinapsiDaModificare
      ? sinapsiDaModificare.neurone_da === neuroneCorrente.id
        ? sinapsiDaModificare.neurone_a
        : sinapsiDaModificare.neurone_da
      : '')
  );
  const [neuroneCollegatoNome, setNeuroneCollegatoNome] = useState<string>(
    preselectedEntity?.nome ||
    (sinapsiDaModificare
      ? sinapsiDaModificare.neurone_da === neuroneCorrente.id
        ? sinapsiDaModificare.nome_a || ''
        : sinapsiDaModificare.nome_da || ''
      : '')
  );
  const [tipoConnessione, setTipoConnessione] = useState(sinapsiDaModificare?.tipo_connessione || '');
  const [direzione, setDirezione] = useState<'uscita' | 'entrata'>(
    sinapsiDaModificare?.neurone_da === neuroneCorrente.id ? 'uscita' : 'entrata'
  );
  const [dataInizio, setDataInizio] = useState(
    sinapsiDaModificare?.data_inizio || new Date().toISOString().split('T')[0]
  );
  const [dataFine, setDataFine] = useState(sinapsiDaModificare?.data_fine || '');
  const [valore, setValore] = useState(sinapsiDaModificare?.valore?.toString() || '');
  const [certezza, setCertezza] = useState<Certezza>(sinapsiDaModificare?.certezza || 'ipotesi');
  const [fonte, setFonte] = useState(sinapsiDaModificare?.fonte || '');
  const [dataVerifica, setDataVerifica] = useState(sinapsiDaModificare?.data_verifica || '');
  const [livello, setLivello] = useState<Livello>(sinapsiDaModificare?.livello || 'aziendale');
  const [note, setNote] = useState(sinapsiDaModificare?.note || '');
  const [famigliaProdottoId, setFamigliaProdottoId] = useState<string | null>(
    sinapsiDaModificare?.famiglia_prodotto_id || null
  );

  // UI state
  const [showEntityPicker, setShowEntityPicker] = useState(false);
  const [tipiSinapsi, setTipiSinapsi] = useState<TipoSinapsiConfig[]>([]);
  const [famiglieProdotto, setFamiglieProdotto] = useState<FamigliaProdotto[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carica tipi sinapsi e famiglie prodotto
  useEffect(() => {
    const loadData = async () => {
      try {
        const [tipiRes, famiglieRes] = await Promise.all([
          api.getTipiSinapsi(),
          api.getFamiglieProdotto()
        ]);
        setTipiSinapsi(tipiRes.data);
        if (tipiRes.data.length > 0 && !tipoConnessione) {
          setTipoConnessione(tipiRes.data[0].nome);
        }
        setFamiglieProdotto(famiglieRes.data);
      } catch (err) {
        console.error('Errore caricamento dati:', err);
      }
    };
    loadData();
  }, []);

  // Handler selezione entità dal picker
  const handleEntitySelect = (entity: { id: string; nome: string; tipo: string }) => {
    setNeuroneCollegato(entity.id);
    setNeuroneCollegatoNome(entity.nome);
    setShowEntityPicker(false);
  };

  // Handler per passare alla modalità mappa
  const handleSwitchToMap = () => {
    setShowEntityPicker(false);
    onRequestMapPick?.();
  };

  // Salvataggio
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!neuroneCollegato) {
      setError('Seleziona un neurone da collegare');
      return;
    }

    setSaving(true);
    try {
      const sinapsiData = {
        neurone_da: direzione === 'uscita' ? neuroneCorrente.id : neuroneCollegato,
        neurone_a: direzione === 'uscita' ? neuroneCollegato : neuroneCorrente.id,
        tipo_connessione: tipoConnessione,
        famiglia_prodotto_id: famigliaProdottoId || null,
        data_inizio: dataInizio,
        data_fine: dataFine || null,
        valore: valore ? parseFloat(valore) : null,
        certezza,
        fonte: fonte || null,
        data_verifica: dataVerifica || null,
        livello,
        note: note || null,
      };

      if (isEditing && sinapsiDaModificare) {
        await api.updateSinapsi(sinapsiDaModificare.id, sinapsiData);
      } else {
        await api.createSinapsi(sinapsiData);
      }

      onSaved();
      onClose();
    } catch (err: unknown) {
      console.error('Errore salvataggio sinapsi:', err);
      const errorMessage = err instanceof Error ? err.message : 'Errore durante il salvataggio';
      setError(errorMessage);
    } finally {
      setSaving(false);
    }
  };

  // Flatten famiglie prodotto per select
  const flattenFamiglie = (items: FamigliaProdotto[], level = 0): { id: string; nome: string; level: number }[] => {
    return items.flatMap(item => [
      { id: item.id, nome: item.nome, level },
      ...(item.children ? flattenFamiglie(item.children, level + 1) : [])
    ]);
  };
  const flatFamiglie = flattenFamiglie(famiglieProdotto);

  return (
    <>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}
        onClick={onClose}
      >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '500px',
          maxHeight: '90vh',
          overflow: 'auto',
          padding: '24px',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: '16px', fontSize: '18px', fontWeight: 600 }}>
          {isEditing ? 'Modifica Connessione' : 'Nuova Connessione'}
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Neurone corrente */}
          <div style={{ marginBottom: '16px', padding: '12px', background: 'var(--bg-secondary)', borderRadius: '8px' }}>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Da/A</div>
            <div style={{ fontWeight: 500 }}>{neuroneCorrente.nome}</div>
          </div>

          {/* Direzione */}
          <div className="form-group">
            <label className="form-label">Direzione</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className={`btn ${direzione === 'uscita' ? 'btn-primary' : ''}`}
                onClick={() => setDirezione('uscita')}
                style={{ flex: 1 }}
              >
                {neuroneCorrente.nome} &rarr; ...
              </button>
              <button
                type="button"
                className={`btn ${direzione === 'entrata' ? 'btn-primary' : ''}`}
                onClick={() => setDirezione('entrata')}
                style={{ flex: 1 }}
              >
                ... &rarr; {neuroneCorrente.nome}
              </button>
            </div>
          </div>

          {/* Selezione entità collegata */}
          <div className="form-group">
            <label className="form-label">Collega a</label>

            {neuroneCollegato ? (
              // Entità selezionata
              <div
                style={{
                  padding: '12px 16px',
                  background: 'var(--bg-primary)',
                  borderRadius: '8px',
                  border: '2px solid var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, color: 'var(--primary)' }}>
                    {neuroneCollegatoNome}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setNeuroneCollegato('');
                    setNeuroneCollegatoNome('');
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-secondary)',
                    cursor: 'pointer',
                    fontSize: '18px',
                  }}
                >
                  ×
                </button>
              </div>
            ) : (
              // Bottoni per selezionare
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setShowEntityPicker(true)}
                  className="btn"
                  style={{ flex: 1, padding: '12px' }}
                >
                  Cerca nella lista
                </button>
                {onRequestMapPick && (
                  <button
                    type="button"
                    onClick={onRequestMapPick}
                    className="btn btn-primary"
                    style={{ flex: 1, padding: '12px' }}
                  >
                    Seleziona su mappa
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Tipo connessione */}
          <div className="form-group">
            <label className="form-label">Tipo Connessione</label>
            <select
              className="form-input"
              value={tipoConnessione}
              onChange={(e) => setTipoConnessione(e.target.value)}
              required
            >
              {tipiSinapsi.map((t) => (
                <option key={t.id} value={t.nome}>
                  {t.nome.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Prodotto coinvolto */}
          {flatFamiglie.length > 0 && (
            <div className="form-group">
              <label className="form-label">Prodotto (opzionale)</label>
              <select
                className="form-input"
                value={famigliaProdottoId || ''}
                onChange={(e) => setFamigliaProdottoId(e.target.value || null)}
              >
                <option value="">-- Nessun prodotto --</option>
                {flatFamiglie.map((f) => (
                  <option key={f.id} value={f.id}>
                    {'  '.repeat(f.level)}{f.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Certezza con icone */}
          <div className="form-group">
            <label className="form-label">Certezza</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              {(['ipotesi', 'probabile', 'certo'] as Certezza[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`btn ${certezza === c ? 'btn-primary' : ''}`}
                  onClick={() => setCertezza(c)}
                  style={{ flex: 1 }}
                >
                  {c === 'ipotesi' && '🔴'} {c === 'probabile' && '🟡'} {c === 'certo' && '🟢'} {c}
                </button>
              ))}
            </div>
          </div>

          {/* Fonte */}
          <div className="form-group">
            <label className="form-label">Fonte informazione</label>
            <input
              type="text"
              className="form-input"
              placeholder="Es: visto sul cantiere, me l'ha detto Mario..."
              value={fonte}
              onChange={(e) => setFonte(e.target.value)}
            />
          </div>

          {/* Date */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Data inizio</label>
              <input
                type="date"
                className="form-input"
                value={dataInizio}
                onChange={(e) => setDataInizio(e.target.value)}
                required
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Data fine</label>
              <input
                type="date"
                className="form-input"
                value={dataFine}
                onChange={(e) => setDataFine(e.target.value)}
              />
            </div>
          </div>

          {/* Data verifica (solo se certezza != certo) */}
          {certezza === 'certo' && (
            <div className="form-group">
              <label className="form-label">Data verifica</label>
              <input
                type="date"
                className="form-input"
                value={dataVerifica}
                onChange={(e) => setDataVerifica(e.target.value)}
              />
            </div>
          )}

          {/* Valore */}
          <div className="form-group">
            <label className="form-label">Valore economico (opzionale)</label>
            <input
              type="number"
              className="form-input"
              placeholder="Es: 5000"
              value={valore}
              onChange={(e) => setValore(e.target.value)}
              step="0.01"
            />
          </div>

          {/* Visibilità */}
          {personalAccess && (
            <div className="form-group">
              <label className="form-label">Visibilità</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className={`btn ${livello === 'aziendale' ? 'btn-primary' : ''}`}
                  onClick={() => setLivello('aziendale')}
                  style={{ flex: 1 }}
                >
                  Aziendale
                </button>
                <button
                  type="button"
                  className={`btn ${livello === 'personale' ? 'btn-primary' : ''}`}
                  onClick={() => setLivello('personale')}
                  style={{ flex: 1 }}
                >
                  🔒 Personale
                </button>
              </div>
            </div>
          )}

          {/* Note */}
          <div className="form-group">
            <label className="form-label">Note</label>
            <textarea
              className="form-input"
              placeholder="Note aggiuntive..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              style={{ resize: 'vertical' }}
            />
          </div>

          {/* Errore */}
          {error && (
            <div style={{ padding: '12px', background: '#fee', color: '#c00', borderRadius: '4px', marginBottom: '16px' }}>
              {error}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={onClose} disabled={saving}>
              Annulla
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving || !neuroneCollegato}>
              {saving ? 'Salvataggio...' : isEditing ? 'Salva modifiche' : 'Crea connessione'}
            </button>
          </div>
        </form>
      </div>
    </div>

      {/* Entity Picker Modal */}
      {showEntityPicker && (
        <EntityPickerModal
          excludeId={neuroneCorrente.id}
          onSelect={handleEntitySelect}
          onClose={() => setShowEntityPicker(false)}
          onSwitchToMap={onRequestMapPick ? handleSwitchToMap : undefined}
        />
      )}
    </>
  );
}
