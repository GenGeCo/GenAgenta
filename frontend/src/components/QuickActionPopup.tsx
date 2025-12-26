import { useState, useEffect } from 'react';
import { Neurone, TipoNeuroneConfig, Categoria, TipoSinapsiConfig } from '../types';
import { api } from '../utils/api';

// Popup per creazione rapida entità (click su zona vuota)
interface QuickCreateEntityProps {
  position: { lat: number; lng: number };
  onClose: () => void;
  onCreateEntity: (data: {
    nome: string;
    tipo: string;
    categorie: string[];
    lat: number;
    lng: number;
  }) => void;
}

export function QuickCreateEntity({ position, onClose, onCreateEntity }: QuickCreateEntityProps) {
  const [step, setStep] = useState<'tipo' | 'categoria' | 'nome'>('tipo');
  const [tipi, setTipi] = useState<TipoNeuroneConfig[]>([]);
  const [categorie, setCategorie] = useState<Categoria[]>([]);
  const [selectedTipo, setSelectedTipo] = useState<TipoNeuroneConfig | null>(null);
  const [selectedCategorie, setSelectedCategorie] = useState<string[]>([]);
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [tipiRes, catRes] = await Promise.all([
          api.getTipiNeurone(),
          api.getCategorie()
        ]);
        console.log('QuickCreate tipiRes:', tipiRes);
        console.log('QuickCreate catRes:', catRes);
        setTipi(tipiRes.data || []);
        setCategorie(catRes.data || []);
      } catch (err) {
        console.error('Errore caricamento tipi:', err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const categoriePerTipo = selectedTipo
    ? categorie.filter(c => c.tipo_id === selectedTipo.id)
    : [];

  const toggleCategoria = (nome: string) => {
    setSelectedCategorie(prev =>
      prev.includes(nome) ? prev.filter(c => c !== nome) : [...prev, nome]
    );
  };

  const handleSelectTipo = (tipo: TipoNeuroneConfig) => {
    setSelectedTipo(tipo);
    setSelectedCategorie([]);
    setStep('categoria');
  };

  const handleConfirmCategorie = () => {
    if (selectedCategorie.length === 0) return;
    setStep('nome');
  };

  const handleCreate = () => {
    if (!selectedTipo || selectedCategorie.length === 0) return;
    onCreateEntity({
      nome: nome || `${selectedTipo.nome} ${new Date().toLocaleDateString('it-IT')}`,
      tipo: selectedTipo.nome,
      categorie: selectedCategorie,
      lat: position.lat,
      lng: position.lng
    });
  };

  const formaIcon = (forma: string) => {
    switch (forma) {
      case 'quadrato': return '■';
      case 'cerchio': return '●';
      case 'triangolo': return '▲';
      case 'stella': return '★';
      case 'croce': return '✚';
      default: return '●';
    }
  };

  if (loading) {
    return (
      <div style={popupStyle}>
        <div style={{ padding: '20px', textAlign: 'center' }}>Caricamento...</div>
      </div>
    );
  }

  return (
    <div style={popupStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <span style={{ fontWeight: 600 }}>
          {step === 'tipo' && 'Scegli tipo'}
          {step === 'categoria' && `${selectedTipo?.nome} - Categorie`}
          {step === 'nome' && 'Nome (opzionale)'}
        </span>
        <button onClick={onClose} style={closeButtonStyle}>✕</button>
      </div>

      {/* Step 1: Selezione Tipo */}
      {step === 'tipo' && (
        <div style={contentStyle}>
          {tipi.map(tipo => (
            <button
              key={tipo.id}
              onClick={() => handleSelectTipo(tipo)}
              style={optionButtonStyle}
            >
              <span style={{ marginRight: '8px' }}>{formaIcon(tipo.forma)}</span>
              {tipo.nome}
            </button>
          ))}
        </div>
      )}

      {/* Step 2: Selezione Categorie (multi-select) */}
      {step === 'categoria' && (
        <div style={contentStyle}>
          <div style={{ marginBottom: '8px', fontSize: '12px', color: '#6b7280' }}>
            Seleziona una o più categorie
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {categoriePerTipo.map(cat => {
              const isSelected = selectedCategorie.includes(cat.nome);
              return (
                <button
                  key={cat.id}
                  onClick={() => toggleCategoria(cat.nome)}
                  style={{
                    ...chipStyle,
                    background: isSelected ? cat.colore : '#e5e7eb',
                    color: isSelected ? 'white' : '#374151',
                    fontWeight: isSelected ? 600 : 400,
                  }}
                >
                  {isSelected && '✓ '}{cat.nome}
                </button>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
            <button onClick={() => setStep('tipo')} style={backButtonStyle}>
              ← Indietro
            </button>
            <button
              onClick={handleConfirmCategorie}
              disabled={selectedCategorie.length === 0}
              style={{
                ...confirmButtonStyle,
                opacity: selectedCategorie.length === 0 ? 0.5 : 1
              }}
            >
              Avanti →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Nome (opzionale) */}
      {step === 'nome' && (
        <div style={contentStyle}>
          <input
            type="text"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder={`${selectedTipo?.nome} ${new Date().toLocaleDateString('it-IT')}`}
            style={inputStyle}
            autoFocus
          />
          <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '12px' }}>
            Lascia vuoto per nome automatico
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button onClick={() => setStep('categoria')} style={backButtonStyle}>
              ← Indietro
            </button>
            <button onClick={handleCreate} style={confirmButtonStyle}>
              Crea
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Popup per azioni su entità esistente (click su entità)
interface QuickEntityActionsProps {
  neurone: Neurone;
  onClose: () => void;
  onVendi: () => void;
  onCompra: () => void;
  onConnetti: () => void;
}

export function QuickEntityActions({ neurone, onClose, onVendi, onCompra, onConnetti }: QuickEntityActionsProps) {
  return (
    <div style={popupStyle}>
      <div style={headerStyle}>
        <span style={{ fontWeight: 600, fontSize: '14px' }}>{neurone.nome}</span>
        <button onClick={onClose} style={closeButtonStyle}>✕</button>
      </div>
      <div style={contentStyle}>
        <button onClick={onVendi} style={{ ...actionButtonStyle, background: '#10b981' }}>
          🏭 Vendi a...
        </button>
        <button onClick={onCompra} style={{ ...actionButtonStyle, background: '#3b82f6' }}>
          🛒 Compra da...
        </button>
        <button onClick={onConnetti} style={{ ...actionButtonStyle, background: '#8b5cf6' }}>
          🔗 Connetti con...
        </button>
      </div>
    </div>
  );
}

// Popup per selezionare controparte (dopo Vendi/Compra/Connetti)
interface QuickSelectTargetProps {
  sourceNeurone: Neurone;
  action: 'vendi' | 'compra' | 'connetti';
  onClose: () => void;
  onSelectOnMap: () => void;
  onSelectFromList: () => void;
}

export function QuickSelectTarget({ action, onClose, onSelectOnMap, onSelectFromList }: QuickSelectTargetProps) {
  const actionText = {
    vendi: 'A chi vendi?',
    compra: 'Da chi compri?',
    connetti: 'Con chi connetti?'
  };

  return (
    <div style={popupStyle}>
      <div style={headerStyle}>
        <span style={{ fontWeight: 600 }}>{actionText[action]}</span>
        <button onClick={onClose} style={closeButtonStyle}>✕</button>
      </div>
      <div style={contentStyle}>
        <button onClick={onSelectOnMap} style={{ ...actionButtonStyle, background: '#f59e0b' }}>
          📍 Clicca su mappa
        </button>
        <button onClick={onSelectFromList} style={{ ...actionButtonStyle, background: '#6366f1' }}>
          📋 Cerca nella lista
        </button>
      </div>
    </div>
  );
}

// Popup per selezionare tipi connessione
interface QuickConnectionTypeProps {
  onClose: () => void;
  onConfirm: (tipi: string[]) => void;
}

export function QuickConnectionType({ onClose, onConfirm }: QuickConnectionTypeProps) {
  const [tipiSinapsi, setTipiSinapsi] = useState<TipoSinapsiConfig[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getTipiSinapsi();
        setTipiSinapsi(res.data);
      } catch (err) {
        console.error('Errore:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const toggle = (nome: string) => {
    setSelected(prev => prev.includes(nome) ? prev.filter(t => t !== nome) : [...prev, nome]);
  };

  if (loading) {
    return <div style={popupStyle}><div style={{ padding: '20px' }}>Caricamento...</div></div>;
  }

  return (
    <div style={popupStyle}>
      <div style={headerStyle}>
        <span style={{ fontWeight: 600 }}>Tipo connessione</span>
        <button onClick={onClose} style={closeButtonStyle}>✕</button>
      </div>
      <div style={contentStyle}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
          {tipiSinapsi.map(t => {
            const isSelected = selected.includes(t.nome);
            return (
              <button
                key={t.id}
                onClick={() => toggle(t.nome)}
                style={{
                  ...chipStyle,
                  background: isSelected ? t.colore : '#e5e7eb',
                  color: isSelected ? 'white' : '#374151',
                  fontWeight: isSelected ? 600 : 400,
                }}
              >
                {isSelected && '✓ '}{t.nome}
              </button>
            );
          })}
        </div>
        <button
          onClick={() => onConfirm(selected)}
          disabled={selected.length === 0}
          style={{ ...confirmButtonStyle, opacity: selected.length === 0 ? 0.5 : 1 }}
        >
          Conferma
        </button>
      </div>
    </div>
  );
}

// Popup per transazione rapida (dopo selezione target per Vendi/Compra)
interface QuickTransactionFormProps {
  sourceNeurone: Neurone;
  targetNeurone: Neurone;
  action: 'vendi' | 'compra';
  onClose: () => void;
  onConfirm: (data: { famigliaId: string; importo: number; data: string }) => void;
}

export function QuickTransactionForm({ sourceNeurone, targetNeurone, action, onClose, onConfirm }: QuickTransactionFormProps) {
  const [famiglie, setFamiglie] = useState<{ id: string; nome: string; colore: string | null }[]>([]);
  const [famigliaId, setFamigliaId] = useState('');
  const [importo, setImporto] = useState('');
  const [data, setData] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.getFamiglieProdotto();
        setFamiglie(res.data);
        if (res.data.length > 0) {
          setFamigliaId(res.data[0].id);
        }
      } catch (err) {
        console.error('Errore:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleSubmit = () => {
    if (!famigliaId || !importo) return;
    onConfirm({
      famigliaId,
      importo: parseFloat(importo),
      data
    });
  };

  const titolo = action === 'vendi'
    ? `${sourceNeurone.nome} vende a ${targetNeurone.nome}`
    : `${sourceNeurone.nome} compra da ${targetNeurone.nome}`;

  if (loading) {
    return <div style={popupStyle}><div style={{ padding: '20px' }}>Caricamento...</div></div>;
  }

  return (
    <div style={{ ...popupStyle, minWidth: '280px' }}>
      <div style={headerStyle}>
        <span style={{ fontWeight: 600, fontSize: '13px' }}>{titolo}</span>
        <button onClick={onClose} style={closeButtonStyle}>✕</button>
      </div>
      <div style={contentStyle}>
        {famiglie.length === 0 ? (
          <div style={{ padding: '12px', background: '#fef3c7', borderRadius: '8px', fontSize: '13px', color: '#92400e' }}>
            Nessuna famiglia prodotto configurata.
          </div>
        ) : (
          <>
            <div>
              <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', display: 'block' }}>Prodotto</label>
              <select
                value={famigliaId}
                onChange={(e) => setFamigliaId(e.target.value)}
                style={{ ...inputStyle, marginBottom: '8px' }}
              >
                {famiglie.map(f => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', display: 'block' }}>Importo (€)</label>
              <input
                type="number"
                value={importo}
                onChange={(e) => setImporto(e.target.value)}
                placeholder="0.00"
                style={{ ...inputStyle, marginBottom: '8px' }}
                autoFocus
              />
            </div>
            <div>
              <label style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px', display: 'block' }}>Data</label>
              <input
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
                style={{ ...inputStyle, marginBottom: '12px' }}
              />
            </div>
            <button
              onClick={handleSubmit}
              disabled={!famigliaId || !importo}
              style={{
                ...confirmButtonStyle,
                opacity: (!famigliaId || !importo) ? 0.5 : 1,
                background: action === 'vendi' ? '#10b981' : '#3b82f6'
              }}
            >
              {action === 'vendi' ? 'Registra Vendita' : 'Registra Acquisto'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Stili condivisi
const popupStyle: React.CSSProperties = {
  background: 'white',
  borderRadius: '12px',
  boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
  minWidth: '220px',
  maxWidth: '300px',
  overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: '12px 16px',
  borderBottom: '1px solid #e5e7eb',
  background: '#f9fafb',
};

const closeButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  fontSize: '16px',
  cursor: 'pointer',
  color: '#6b7280',
  padding: '4px',
};

const contentStyle: React.CSSProperties = {
  padding: '12px 16px',
  display: 'flex',
  flexDirection: 'column',
  gap: '8px',
};

const optionButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  padding: '10px 12px',
  border: 'none',
  borderRadius: '8px',
  background: '#f3f4f6',
  cursor: 'pointer',
  fontSize: '14px',
  textAlign: 'left',
  transition: 'background 0.15s',
};

const actionButtonStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: '8px',
  width: '100%',
  padding: '12px',
  border: 'none',
  borderRadius: '8px',
  color: 'white',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: 500,
};

const chipStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: '16px',
  border: 'none',
  cursor: 'pointer',
  fontSize: '13px',
  transition: 'all 0.15s',
};

const backButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  background: 'white',
  cursor: 'pointer',
  fontSize: '13px',
};

const confirmButtonStyle: React.CSSProperties = {
  flex: 1,
  padding: '10px',
  border: 'none',
  borderRadius: '8px',
  background: '#3b82f6',
  color: 'white',
  cursor: 'pointer',
  fontSize: '13px',
  fontWeight: 500,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #d1d5db',
  borderRadius: '8px',
  fontSize: '14px',
  marginBottom: '4px',
};
