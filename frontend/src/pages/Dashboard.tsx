// GenAgenTa - Dashboard principale

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../utils/api';
import Sidebar from '../components/Sidebar';
import MapView from '../components/MapView';
import DetailPanel from '../components/DetailPanel';
import TimeSlider from '../components/TimeSlider';
import { PinVerifyModal, PinSetModal } from '../components/PrivacyLock';
import UserMenu from '../components/UserMenu';
import InvitePopup from '../components/InvitePopup';
import NeuroneFormModal from '../components/NeuroneFormModal';
import SinapsiDetailPanel from '../components/SinapsiDetailPanel';
import { QuickCreateEntity, QuickEntityActions, QuickSelectTarget, QuickConnectionType, QuickTransactionForm } from '../components/QuickActionPopup';
import { AiChat, AiFrontendAction } from '../components/AiChat';
import type { Neurone, Sinapsi, FiltriMappa, Categoria, TipoNeuroneConfig } from '../types';

// Tipi per quick actions
type QuickPopupType = 'create' | 'entityActions' | 'selectTarget' | 'connectionType' | 'transactionForm' | null;
type QuickActionType = 'vendi' | 'compra' | 'connetti' | null;

interface PendingInvite {
  id: string;
  azienda_id: string;
  nome_azienda: string;
  invitato_da: string;
}

export default function Dashboard() {
  const { user, personalAccess, verifyPin, exitPersonalMode, logout, updateUser } = useAuth();

  // State
  const [neuroni, setNeuroni] = useState<Neurone[]>([]);
  const [sinapsi, setSinapsi] = useState<Sinapsi[]>([]);
  const [categorie, setCategorie] = useState<Categoria[]>([]);
  const [tipiNeurone, setTipiNeurone] = useState<TipoNeuroneConfig[]>([]);
  const [selectedNeurone, setSelectedNeurone] = useState<Neurone | null>(null);
  const [showNeuroneForm, setShowNeuroneForm] = useState(false);
  const [editingNeurone, setEditingNeurone] = useState<Neurone | null>(null); // Per modifica
  const [loading, setLoading] = useState(true);
  const [pendingInvite, setPendingInvite] = useState<PendingInvite | null>(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showSetPinModal, setShowSetPinModal] = useState(false);
  const [showAiChat, setShowAiChat] = useState(false);

  // Stato per selezione posizione su mappa (creazione neurone)
  const [mapPickingMode, setMapPickingMode] = useState(false);
  const [pickedPosition, setPickedPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [flyToPosition, setFlyToPosition] = useState<{ lat: number; lng: number } | null>(null);

  // Stato per connessione su mappa (selezione entità target)
  const [connectionPickingMode, setConnectionPickingMode] = useState(false);
  const [connectionTargetEntity, setConnectionTargetEntity] = useState<{ id: string; nome: string; tipo: string } | null>(null);
  const [connectionSourceNeurone, setConnectionSourceNeurone] = useState<Neurone | null>(null); // Neurone origine per connessione

  // Stato per Quick Map Mode (nuovo su mappa)
  const [quickMapMode, setQuickMapMode] = useState(false);
  const [quickPopup, setQuickPopup] = useState<QuickPopupType>(null);
  const [quickPopupPosition, setQuickPopupPosition] = useState<{ lat: number; lng: number; x: number; y: number } | null>(null);
  const [quickSourceNeurone, setQuickSourceNeurone] = useState<Neurone | null>(null);
  const [quickAction, setQuickAction] = useState<QuickActionType>(null);
  const [quickTargetNeurone, setQuickTargetNeurone] = useState<Neurone | null>(null);

  // Stato per pannello dettagli sinapsi
  const [selectedSinapsiId, setSelectedSinapsiId] = useState<string | null>(null);

  // ID del neurone "in focus" (cliccato sulla mappa, anche senza aprire dettagli)
  // Usato per il filtro "Solo del selezionato"
  const [focusedNeuroneId, setFocusedNeuroneId] = useState<string | null>(null);

  // Refs per evitare closure stale nei callback
  const connectionPickingModeRef = useRef(false);
  const connectionSourceNeuroneRef = useRef<Neurone | null>(null);
  const quickActionRef = useRef<QuickActionType>(null);

  // Sincronizza refs con state
  useEffect(() => {
    connectionPickingModeRef.current = connectionPickingMode;
  }, [connectionPickingMode]);

  useEffect(() => {
    connectionSourceNeuroneRef.current = connectionSourceNeurone;
  }, [connectionSourceNeurone]);

  useEffect(() => {
    quickActionRef.current = quickAction;
    console.log('DEBUG quickAction aggiornato a:', quickAction);
  }, [quickAction]);

  // Sincronizza scheda modifica con entità selezionata
  useEffect(() => {
    if (showNeuroneForm && selectedNeurone && editingNeurone) {
      // Se il form è aperto in modifica e l'entità selezionata cambia, aggiorna il form
      if (selectedNeurone.id !== editingNeurone.id) {
        setEditingNeurone(selectedNeurone);
      }
    }
  }, [selectedNeurone, showNeuroneForm, editingNeurone]);

  // Sincronizza focusedNeuroneId con selectedNeurone
  // Quando si apre il DetailPanel, il neurone selezionato diventa anche "in focus"
  useEffect(() => {
    if (selectedNeurone) {
      setFocusedNeuroneId(selectedNeurone.id);
    }
  }, [selectedNeurone]);

  // Filtri
  const [filtri, setFiltri] = useState<FiltriMappa>({
    dataInizio: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 anno fa
    dataFine: new Date().toISOString().split('T')[0], // oggi
    tipoNeurone: null,
    categoria: null,
    certezza: null,
    valoreMin: null,
    raggio: null,
    centro: null,
    mostraConnessioni: true,
    soloConnessioniSelezionate: false,
    tipiSelezionati: [], // Tutti i tipi se vuoto
    categorieSelezionate: [], // Tutte le categorie se vuoto
    ricerca: '',
  });

  // Controlla inviti pendenti al caricamento
  useEffect(() => {
    const checkInvites = async () => {
      try {
        const result = await api.getInvitiPendenti();
        if (result.has_invite && result.invito) {
          setPendingInvite(result.invito);
        }
      } catch (error) {
        console.error('Errore controllo inviti:', error);
      }
    };

    checkInvites();
  }, []);

  // Carica tipi e categorie una volta all'avvio (usa API v2)
  useEffect(() => {
    const loadTipiCategorie = async () => {
      try {
        const [tipiRes, tipologieRes] = await Promise.all([
          api.get('/tipi-neurone'),
          api.get('/categorie')
        ]);

        // Mappa tipi v2 al formato TipoNeuroneConfig
        const tipiMapped = tipiRes.data.data.map((t: { id: string; nome: string; forma: string; ordine: number }) => ({
          id: t.id,
          nome: t.nome,
          forma: t.forma,
          ordine: t.ordine
        }));

        // Mappa tipologie v2 al formato Categoria
        const categorieMapped = tipologieRes.data.data.map((tp: { id: string; tipo_id: string; nome: string; colore: string; ordine: number }) => ({
          id: tp.id,
          tipo_id: tp.tipo_id,
          nome: tp.nome,
          colore: tp.colore,
          ordine: tp.ordine
        }));

        setTipiNeurone(tipiMapped);
        setCategorie(categorieMapped);
      } catch (error) {
        console.error('Errore caricamento tipi/categorie:', error);
      }
    };
    loadTipiCategorie();
  }, []);

  // Carica dati
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [neuroniRes, sinapsiRes] = await Promise.all([
          api.getNeuroni({
            tipo: filtri.tipoNeurone || undefined,
            categoria: filtri.categoria || undefined,
            data_inizio: filtri.dataInizio || undefined,
            data_fine: filtri.dataFine || undefined,
            limit: 500,
          }),
          api.getSinapsi({
            data_inizio: filtri.dataInizio || undefined,
            data_fine: filtri.dataFine || undefined,
            certezza: filtri.certezza || undefined,
            valore_min: filtri.valoreMin || undefined,
            limit: 1000,
          }),
        ]);

        console.log('DEBUG loadData:', {
          filtri: { dataInizio: filtri.dataInizio, dataFine: filtri.dataFine },
          neuroniCaricati: neuroniRes.data.length,
          sinapsiCaricate: sinapsiRes.data.length,
          primiNeuroni: neuroniRes.data.slice(0, 2).map((n: { id: string; nome: string; lat: number | null; lng: number | null }) => ({
            id: n.id,
            nome: n.nome,
            lat: n.lat,
            lng: n.lng
          }))
        });
        setNeuroni(neuroniRes.data);
        setSinapsi(sinapsiRes.data);
      } catch (error) {
        console.error('Errore caricamento dati:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [filtri.tipoNeurone, filtri.categoria, filtri.dataInizio, filtri.dataFine, filtri.certezza, filtri.valoreMin]);

  // Handler selezione neurone
  const handleSelectNeurone = async (neurone: Neurone) => {
    try {
      const fullNeurone = await api.getNeurone(neurone.id);
      setSelectedNeurone(fullNeurone);
      // Chiudi pannello sinapsi se aperto (evita sovrapposizione)
      setSelectedSinapsiId(null);
    } catch (error) {
      console.error('Errore caricamento dettaglio:', error);
    }
  };

  // Ricarica sinapsi (per aggiornare la mappa dopo creazione/modifica)
  const reloadSinapsi = async () => {
    try {
      const sinapsiRes = await api.getSinapsi({
        data_inizio: filtri.dataInizio || undefined,
        data_fine: filtri.dataFine || undefined,
        certezza: filtri.certezza || undefined,
        valore_min: filtri.valoreMin || undefined,
        limit: 1000,
      });
      setSinapsi(sinapsiRes.data);
    } catch (error) {
      console.error('Errore ricaricamento sinapsi:', error);
    }
  };

  // Handler verifica PIN
  const handleVerifyPin = async (pin: string) => {
    try {
      await verifyPin(pin);
      // Ricarica dati con accesso personale
      window.location.reload();
    } catch {
      throw new Error('PIN non valido');
    }
  };

  // Handler imposta PIN
  const handleSetPin = async (pin: string) => {
    await api.setPin(pin);
    // Aggiorna stato utente
    if (user) {
      updateUser({ ...user, has_pin: true });
    }
  };

  // Handler azioni AI (comandi dalla chat)
  const handleAiAction = (action: AiFrontendAction) => {
    console.log('AI Action ricevuta:', action);

    switch (action.type) {
      case 'map_fly_to':
        // Sposta la mappa alle coordinate
        if (action.lat !== undefined && action.lng !== undefined) {
          setFlyToPosition({ lat: action.lat, lng: action.lng });
        }
        break;

      case 'map_select_entity':
        // Seleziona un'entita sulla mappa
        if (action.entity_id) {
          const neurone = neuroni.find(n => n.id === action.entity_id);
          if (neurone) {
            setSelectedNeurone(neurone);
            setFocusedNeuroneId(neurone.id);
            // Vola anche alla posizione dell'entita
            if (neurone.lat && neurone.lng) {
              setFlyToPosition({ lat: neurone.lat, lng: neurone.lng });
            }
          }
        }
        break;

      case 'map_show_connections':
        // Seleziona l'entita per mostrare le sue connessioni
        if (action.entity_id) {
          const neurone = neuroni.find(n => n.id === action.entity_id);
          if (neurone) {
            setFocusedNeuroneId(neurone.id);
            setSelectedNeurone(neurone);
          }
        }
        break;

      case 'ui_open_panel':
        // Apri un pannello
        if (action.panel === 'entity_detail' && action.entity_id) {
          const neurone = neuroni.find(n => n.id === action.entity_id);
          if (neurone) {
            setSelectedNeurone(neurone);
          }
        }
        // Altri pannelli possono essere aggiunti qui
        break;

      case 'ui_notification':
        // Mostra notifica (per ora solo console log)
        if (action.notification_message) {
          console.log(`[${action.notification_type || 'info'}] ${action.notification_message}`);
          // TODO: implementare sistema notifiche toast
        }
        break;
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <Sidebar
        neuroni={neuroni}
        selectedId={selectedNeurone?.id || null}
        onSelect={handleSelectNeurone}
        filtri={filtri}
        onFiltriChange={setFiltri}
        loading={loading}
        onAddNeurone={() => setShowNeuroneForm(true)}
        onQuickMapMode={() => setQuickMapMode(true)}
        tipiNeurone={tipiNeurone}
        categorie={categorie}
      />

      {/* Main content */}
      <div className="main-content">
        {/* Header */}
        <header className="header">
          <h1 style={{ fontSize: '18px', fontWeight: 600 }}>GenAgenTa 7</h1>

          <div style={{ flex: 1 }} />

          {/* Bottone Lucchetto Privacy */}
          <button
            onClick={() => {
              if (personalAccess) {
                exitPersonalMode();
              } else if (user?.has_pin) {
                setShowPinModal(true);
              } else {
                setShowSetPinModal(true);
              }
            }}
            title={personalAccess ? 'Chiudi area personale' : user?.has_pin ? 'Sblocca area personale' : 'Imposta PIN'}
            style={{
              background: personalAccess ? 'rgba(34, 197, 94, 0.2)' : 'transparent',
              border: personalAccess ? '2px solid #22c55e' : '1px solid rgba(255,255,255,0.2)',
              borderRadius: '8px',
              padding: '8px 12px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              color: personalAccess ? '#22c55e' : 'rgba(255,255,255,0.7)',
              fontSize: '14px',
              marginRight: '12px',
            }}
          >
            {personalAccess ? '🔓' : '🔒'}
          </button>

          {/* Bottone AI Chat */}
          <button
            onClick={() => setShowAiChat(!showAiChat)}
            title="Assistente AI"
            style={{
              background: showAiChat ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
              border: 'none',
              borderRadius: '50%',
              width: '36px',
              height: '36px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: '12px',
              transition: 'all 0.3s ease',
            }}
          >
            <div
              style={{
                width: showAiChat ? '14px' : '10px',
                height: showAiChat ? '14px' : '10px',
                borderRadius: '50%',
                background: showAiChat
                  ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
                  : 'linear-gradient(135deg, #60a5fa, #a78bfa)',
                boxShadow: showAiChat
                  ? '0 0 16px rgba(59, 130, 246, 0.7), 0 0 32px rgba(139, 92, 246, 0.4)'
                  : '0 0 8px rgba(96, 165, 250, 0.5)',
                transition: 'all 0.3s ease',
                animation: showAiChat ? 'none' : 'pulse 2s ease-in-out infinite',
              }}
            />
          </button>

          {user && <UserMenu user={user} onLogout={logout} onUserUpdate={updateUser} />}
        </header>

        {/* Area contenuto */}
        <div className="content-area" style={connectionPickingMode ? { cursor: 'crosshair' } : undefined}>
          {/* Mappa */}
          <MapView
            neuroni={neuroni}
            sinapsi={sinapsi}
            categorie={categorie}
            tipiNeurone={tipiNeurone}
            selectedId={selectedNeurone?.id || null}
            filterSelectedId={focusedNeuroneId || selectedNeurone?.id || null}
            onSelectNeurone={handleSelectNeurone}
            onFocusNeurone={(id) => setFocusedNeuroneId(id)}
            filtri={filtri}
            pickingMode={mapPickingMode}
            onPickPosition={(lat, lng) => {
              setPickedPosition({ lat, lng });
              setMapPickingMode(false);
            }}
            flyToPosition={flyToPosition}
            pickedPosition={pickedPosition}
            // Props per connection picking
            connectionPickingMode={connectionPickingMode}
            connectionSourceId={connectionSourceNeurone?.id || null}
            onPickConnectionTarget={(neurone) => {
              // Usa il ref per evitare closure stale
              const currentQuickAction = quickActionRef.current;
              console.log('DEBUG onPickConnectionTarget:', neurone.nome, 'quickAction:', currentQuickAction);

              // Se siamo in quick mode con azione vendi/compra, mostra form transazione
              if (currentQuickAction === 'vendi' || currentQuickAction === 'compra') {
                setQuickTargetNeurone(neurone);
                setConnectionPickingMode(false);
                setQuickMapMode(true); // Mantieni quick mode attivo
                setQuickPopup('transactionForm');
                // Posiziona popup al centro dello schermo
                setQuickPopupPosition({
                  lat: neurone.lat || 0,
                  lng: neurone.lng || 0,
                  x: window.innerWidth / 2 - 140,
                  y: window.innerHeight / 2 - 150
                });
                return;
              }

              // Altrimenti comportamento standard per connessioni
              const target = {
                id: neurone.id,
                nome: neurone.nome,
                tipo: neurone.tipo,
              };
              // Aggiorna state
              setConnectionTargetEntity(target);
              setConnectionPickingMode(false);
              // Ripristina il neurone origine come selezionato
              if (connectionSourceNeurone) {
                setSelectedNeurone(connectionSourceNeurone);
              }
            }}
            // Props per Quick Map Mode
            quickMapMode={quickMapMode}
            onQuickMapClick={(lat, lng, screenX, screenY) => {
              setQuickPopupPosition({ lat, lng, x: screenX, y: screenY });
              setQuickPopup('create');
            }}
            onQuickEntityClick={(neurone, screenX, screenY) => {
              setQuickMapMode(true); // Attiva quick mode per il popup
              setQuickSourceNeurone(neurone);
              setQuickPopupPosition({ lat: neurone.lat || 0, lng: neurone.lng || 0, x: screenX, y: screenY });
              setQuickPopup('entityActions');
            }}
            // Props per dettagli sinapsi
            onSelectSinapsi={(sinapsiId) => {
              setSelectedSinapsiId(sinapsiId);
              setSelectedNeurone(null); // Chiudi eventuale pannello entità
            }}
          />

          {/* Indicatore modalità selezione connessione */}
          {connectionPickingMode && (
            <div
              style={{
                position: 'absolute',
                top: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'var(--primary)',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span>Clicca su un'entità per collegarla</span>
              <button
                onClick={() => {
                  // Aggiorna refs immediatamente
                  connectionPickingModeRef.current = false;
                  connectionSourceNeuroneRef.current = null;
                  // Poi aggiorna state
                  setConnectionPickingMode(false);
                  setConnectionTargetEntity(null);
                  // Ripristina il neurone origine
                  if (connectionSourceNeurone) {
                    setSelectedNeurone(connectionSourceNeurone);
                  }
                  setConnectionSourceNeurone(null);
                }}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Annulla
              </button>
            </div>
          )}

          {/* Indicatore Quick Map Mode */}
          {quickMapMode && !quickPopup && (
            <div
              style={{
                position: 'absolute',
                top: '16px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#f59e0b',
                color: 'white',
                padding: '12px 24px',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <span>📍 Clicca sulla mappa o su un'entità</span>
              <button
                onClick={() => {
                  setQuickMapMode(false);
                  setQuickPopup(null);
                  setQuickPopupPosition(null);
                }}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  border: 'none',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Annulla
              </button>
            </div>
          )}

          {/* Quick Action Popups */}
          {quickPopup && quickPopupPosition && (
            <div
              style={{
                position: 'absolute',
                left: Math.min(quickPopupPosition.x, window.innerWidth - 320),
                top: Math.min(quickPopupPosition.y, window.innerHeight - 400),
                zIndex: 1001,
              }}
            >
              {/* Popup creazione nuova entità */}
              {quickPopup === 'create' && (
                <QuickCreateEntity
                  position={{ lat: quickPopupPosition.lat, lng: quickPopupPosition.lng }}
                  tipiNeurone={tipiNeurone}
                  categorieDisponibili={categorie}
                  onClose={() => {
                    setQuickPopup(null);
                    setQuickPopupPosition(null);
                  }}
                  onCreateEntity={async (data) => {
                    try {
                      const result = await api.createNeurone({
                        nome: data.nome,
                        tipo: data.tipo,
                        categorie: data.categorie,
                        visibilita: 'aziendale',
                        lat: data.lat,
                        lng: data.lng,
                      });
                      const newNeurone = await api.getNeurone(result.id);
                      setNeuroni(prev => [newNeurone, ...prev]);
                      setSelectedNeurone(newNeurone);
                      setQuickMapMode(false);
                      setQuickPopup(null);
                      setQuickPopupPosition(null);
                    } catch (error) {
                      console.error('Errore creazione:', error);
                    }
                  }}
                />
              )}

              {/* Popup azioni su entità esistente */}
              {quickPopup === 'entityActions' && quickSourceNeurone && (
                <QuickEntityActions
                  neurone={quickSourceNeurone}
                  onClose={() => {
                    setQuickPopup(null);
                    setQuickPopupPosition(null);
                    setQuickSourceNeurone(null);
                  }}
                  onVendi={() => {
                    setQuickAction('vendi');
                    setQuickPopup('selectTarget');
                  }}
                  onCompra={() => {
                    setQuickAction('compra');
                    setQuickPopup('selectTarget');
                  }}
                  onConnetti={() => {
                    setQuickAction('connetti');
                    setQuickPopup('selectTarget');
                  }}
                />
              )}

              {/* Popup selezione target */}
              {quickPopup === 'selectTarget' && quickSourceNeurone && quickAction && (
                <QuickSelectTarget
                  sourceNeurone={quickSourceNeurone}
                  action={quickAction}
                  onClose={() => {
                    setQuickPopup(null);
                    setQuickAction(null);
                    setQuickSourceNeurone(null);
                    setQuickPopupPosition(null);
                  }}
                  onSelectOnMap={() => {
                    // Entra in modalità selezione target su mappa
                    setQuickPopup(null);
                    setQuickMapMode(false); // IMPORTANTE: disattiva quick mode per evitare conflitti
                    // Usa il sistema esistente di connection picking
                    setConnectionSourceNeurone(quickSourceNeurone);
                    setConnectionPickingMode(true);
                  }}
                  onSelectFromList={() => {
                    // Seleziona il neurone sorgente per aprire il DetailPanel
                    setSelectedNeurone(quickSourceNeurone);
                    setQuickMapMode(false);
                    setQuickPopup(null);
                    setQuickAction(null);
                    setQuickSourceNeurone(null);
                    setQuickPopupPosition(null);
                    // Il DetailPanel permetterà di creare la connessione/transazione
                  }}
                />
              )}

              {/* Popup selezione tipo connessione */}
              {quickPopup === 'connectionType' && (
                <QuickConnectionType
                  onClose={() => {
                    setQuickPopup(null);
                    setQuickTargetNeurone(null);
                    setQuickSourceNeurone(null);
                    setQuickAction(null);
                    setQuickPopupPosition(null);
                  }}
                  onConfirm={async (tipi) => {
                    if (!quickSourceNeurone || !quickTargetNeurone) return;
                    try {
                      await api.createSinapsi({
                        neurone_da: quickSourceNeurone.id,
                        neurone_a: quickTargetNeurone.id,
                        tipo_connessione: tipi,
                        data_inizio: new Date().toISOString().split('T')[0],
                        certezza: 'ipotesi',
                        livello: 'aziendale',
                      });
                      // Ricarica sinapsi con filtri data attivi
                      const sinapsiRes = await api.getSinapsi({
                        data_inizio: filtri.dataInizio || undefined,
                        data_fine: filtri.dataFine || undefined,
                        limit: 1000
                      });
                      setSinapsi(sinapsiRes.data);
                      // Reset
                      setQuickMapMode(false);
                      setQuickPopup(null);
                      setQuickTargetNeurone(null);
                      setQuickSourceNeurone(null);
                      setQuickAction(null);
                      setQuickPopupPosition(null);
                    } catch (error) {
                      console.error('Errore creazione connessione:', error);
                    }
                  }}
                />
              )}

              {/* Form transazione rapida (Vendi/Compra) */}
              {quickPopup === 'transactionForm' && quickSourceNeurone && quickTargetNeurone && quickAction && (quickAction === 'vendi' || quickAction === 'compra') && (
                <QuickTransactionForm
                  sourceNeurone={quickSourceNeurone}
                  targetNeurone={quickTargetNeurone}
                  action={quickAction}
                  onClose={() => {
                    setQuickPopup(null);
                    setQuickTargetNeurone(null);
                    setQuickSourceNeurone(null);
                    setQuickAction(null);
                    setQuickPopupPosition(null);
                    setQuickMapMode(false);
                  }}
                  onConfirm={async (data) => {
                    try {
                      // Determina chi è il venditore e chi l'acquirente
                      // Se vendo: source=venditore, target=acquirente
                      // Se compro: source=acquirente, target=venditore
                      const isVendita = quickAction === 'vendi';
                      const venditorId = isVendita ? quickSourceNeurone.id : quickTargetNeurone.id;
                      const acquistatoreId = isVendita ? quickTargetNeurone.id : quickSourceNeurone.id;

                      // Cerca una sinapsi esistente tra i due neuroni
                      const sinapsiRes = await api.getNeuroneSinapsi(quickSourceNeurone.id);
                      let sinapsiId: string | undefined;

                      // Cerca sinapsi che connette source e target (in entrambe le direzioni)
                      const existingSinapsi = sinapsiRes.data.find(s =>
                        (s.neurone_da === quickSourceNeurone.id && s.neurone_a === quickTargetNeurone.id) ||
                        (s.neurone_da === quickTargetNeurone.id && s.neurone_a === quickSourceNeurone.id)
                      );

                      if (existingSinapsi) {
                        sinapsiId = existingSinapsi.id;
                        console.log('DEBUG: Usando sinapsi esistente:', sinapsiId);
                      } else {
                        // Crea nuova sinapsi commerciale tra i due
                        const newSinapsi = await api.createSinapsi({
                          neurone_da: quickSourceNeurone.id,
                          neurone_a: quickTargetNeurone.id,
                          tipo_connessione: ['commerciale'],
                          certezza: 'certo',
                          data_inizio: new Date().toISOString().split('T')[0], // Oggi
                        });
                        sinapsiId = newSinapsi.id;
                        console.log('DEBUG: Creata nuova sinapsi:', sinapsiId);
                      }

                      // Crea la vendita bilaterale (con controparte e sinapsi)
                      await api.createVendita({
                        neurone_id: venditorId,
                        famiglia_id: data.famigliaId,
                        importo: data.importo,
                        data_vendita: data.data,
                        controparte_id: acquistatoreId,
                        sinapsi_id: sinapsiId,
                        tipo_transazione: 'vendita', // Sempre vendita dal punto di vista del venditore
                      });

                      // Ricarica neuroni per aggiornare venduto_totale
                      const neuroniRes = await api.getNeuroni({ limit: 500 });
                      setNeuroni(neuroniRes.data);

                      // Ricarica sinapsi per aggiornare i dati oggettivi sulla connessione
                      await reloadSinapsi();

                      // Reset
                      setQuickMapMode(false);
                      setQuickPopup(null);
                      setQuickTargetNeurone(null);
                      setQuickSourceNeurone(null);
                      setQuickAction(null);
                      setQuickPopupPosition(null);
                    } catch (error) {
                      console.error('Errore creazione vendita:', error);
                    }
                  }}
                />
              )}
            </div>
          )}

          {/* Pannello dettaglio - nascosto durante selezione connessione su mappa */}
          {selectedNeurone && !connectionPickingMode && (
            <DetailPanel
              neurone={selectedNeurone}
              personalAccess={personalAccess}
              categorie={categorie}
              onClose={() => {
                setSelectedNeurone(null);
                setConnectionPickingMode(false);
                setConnectionTargetEntity(null);
              }}
              onSelectNeurone={async (id) => {
                // Cerca prima tra i neuroni già caricati
                const trovato = neuroni.find(n => n.id === id);
                if (trovato) {
                  handleSelectNeurone(trovato);
                } else {
                  // Altrimenti carica il neurone dall'API
                  try {
                    const fullNeurone = await api.getNeurone(id);
                    setSelectedNeurone(fullNeurone);
                  } catch (error) {
                    console.error('Errore caricamento neurone:', error);
                  }
                }
              }}
              onEdit={() => {
                setEditingNeurone(selectedNeurone);
                setShowNeuroneForm(true);
              }}
              onRequestConnectionMapPick={() => {
                // Salva il neurone origine prima di entrare in modalità picking
                // Aggiorna refs IMMEDIATAMENTE (prima del re-render)
                connectionSourceNeuroneRef.current = selectedNeurone;
                connectionPickingModeRef.current = true;
                // Poi aggiorna lo state
                setConnectionSourceNeurone(selectedNeurone);
                setConnectionPickingMode(true);
              }}
              connectionTargetEntity={connectionTargetEntity}
              onClearConnectionTarget={() => {
                // Aggiorna ref immediatamente
                connectionSourceNeuroneRef.current = null;
                // Poi aggiorna state
                setConnectionTargetEntity(null);
                setConnectionSourceNeurone(null);
              }}
              onSinapsiCreated={reloadSinapsi}
            />
          )}

          {/* Pannello dettaglio sinapsi */}
          {selectedSinapsiId && !connectionPickingMode && (
            <SinapsiDetailPanel
              sinapsiId={selectedSinapsiId}
              onClose={() => setSelectedSinapsiId(null)}
              onSaved={reloadSinapsi}
            />
          )}
        </div>

        {/* Slider temporale */}
        <TimeSlider
          dataInizio={filtri.dataInizio || ''}
          dataFine={filtri.dataFine || ''}
          onChange={(inizio, fine) => setFiltri((f) => ({
            ...f,
            dataInizio: inizio,
            dataFine: fine,
          }))}
        />
      </div>

      {/* Modal PIN */}
      {showPinModal && (
        <PinVerifyModal
          onVerify={handleVerifyPin}
          onClose={() => setShowPinModal(false)}
        />
      )}

      {/* Modal Imposta PIN */}
      {showSetPinModal && (
        <PinSetModal
          onSetPin={handleSetPin}
          onClose={() => setShowSetPinModal(false)}
        />
      )}

      {/* Popup invito ricevuto */}
      {pendingInvite && (
        <InvitePopup
          invito={pendingInvite}
          onAccept={() => {
            setPendingInvite(null);
            window.location.reload(); // Ricarica per aggiornare dati azienda
          }}
          onDecline={() => setPendingInvite(null)}
        />
      )}

      {/* Form nuovo/modifica neurone */}
      {showNeuroneForm && (
        <NeuroneFormModal
          neurone={editingNeurone || undefined}
          categorie={categorie}
          onSave={(neurone) => {
            if (editingNeurone) {
              // Modifica: aggiorna nella lista
              setNeuroni(neuroni.map(n => n.id === neurone.id ? neurone : n));
              setSelectedNeurone(neurone);
            } else {
              // Nuovo: aggiungi alla lista
              setNeuroni([neurone, ...neuroni]);
              setSelectedNeurone(neurone);
            }
            setShowNeuroneForm(false);
            setEditingNeurone(null);
            setPickedPosition(null);
            setMapPickingMode(false);
            setFlyToPosition(null);
          }}
          onClose={() => {
            setShowNeuroneForm(false);
            setEditingNeurone(null);
            setMapPickingMode(false);
            setPickedPosition(null);
            setFlyToPosition(null);
          }}
          onDelete={editingNeurone ? async () => {
            // Elimina il neurone
            try {
              await api.deleteNeurone(editingNeurone.id);
              setNeuroni(neuroni.filter(n => n.id !== editingNeurone.id));
              setSelectedNeurone(null);
              setShowNeuroneForm(false);
              setEditingNeurone(null);
            } catch (error) {
              console.error('Errore eliminazione:', error);
              alert('Errore durante l\'eliminazione');
            }
          } : undefined}
          onRequestMapPick={() => setMapPickingMode(true)}
          pickedPosition={pickedPosition}
          isPickingMap={mapPickingMode}
          onPositionFound={(lat, lng) => setFlyToPosition({ lat, lng })}
        />
      )}

      {/* AI Chat */}
      <AiChat isOpen={showAiChat} onClose={() => setShowAiChat(false)} onAction={handleAiAction} />
    </div>
  );
}
