// GenAgenTa - Agea Chat Component (AI Assistant)

import { useState, useRef, useEffect, useMemo } from 'react';
import { api, AiPendingAction, AiChatResponse, ToolKeyInfo } from '../utils/api';
import type { UserAction } from '../types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  tool_summary?: ToolKeyInfo[];  // Info chiave per continuità contesto
}

// Saluti variabili per Agea (non sembrare un chatbot anni '80)
const AGEA_GREETINGS = [
  (name: string) => `Ciao ${name}! 👋`,
  (name: string) => `Ben rivisto, ${name}!`,
  (name: string) => `Eccomi ${name}!`,
  (name: string) => `Ehi ${name}!`,
  (name: string) => `Buongiorno ${name}!`,
  (name: string) => `Ciao ${name}, sono qui!`,
];

// Quick actions per il welcome screen
const QUICK_ACTIONS = [
  { label: '📊 Analizza i dati', prompt: 'Fammi un\'analisi generale sui miei dati: clienti, vendite, trend...' },
  { label: '🔍 Cerca qualcosa', prompt: '' }, // Placeholder per input libero
  { label: '🗺️ Esplora la mappa', prompt: 'Mostrami una panoramica della mappa con le entità principali' },
  { label: '💡 Dammi un consiglio', prompt: 'Guardando i miei dati, c\'è qualcosa che dovrei sapere? Clienti dormienti, opportunità, problemi?' },
];

// Tipi per le azioni frontend
export interface AiFrontendAction {
  type: 'map_fly_to' | 'map_select_entity' | 'map_show_connections' | 'map_set_style' | 'ui_open_panel' | 'ui_notification' | 'refresh_neuroni';
  lat?: number;
  lng?: number;
  zoom?: number;
  pitch?: number;
  bearing?: number;
  style?: string;
  entity_id?: string;
  entity_name?: string;
  panel?: string;
  notification_message?: string;
  notification_type?: 'success' | 'error' | 'warning' | 'info';
}

// Tipo minimo per l'entità selezionata (evita dipendenza circolare)
interface SelectedEntity {
  id: string;
  nome: string;
  tipo?: string | null;
  indirizzo?: string | null;
}

// Info filtri attivi per feedback AI
interface ActiveFilters {
  tipoNeurone: string | null;
  categoria: string | null;
}

// Info visibilità per feedback AI
interface VisibilityContext {
  visibleNeuroniIds: string[];  // Lista ID neuroni attualmente visibili
  activeFilters: ActiveFilters;
}

interface AiChatProps {
  isOpen: boolean;
  onClose: () => void;
  onAction?: (action: AiFrontendAction) => void;
  selectedEntity?: SelectedEntity | null;
  visibilityContext?: VisibilityContext;  // Per feedback visibilità
  userActions?: UserAction[];  // Ultime azioni utente per contesto
  userName?: string;  // Nome utente per saluto personalizzato
  initialMessage?: string | null;  // Messaggio iniziale da inviare (es. da floating suggestions)
  onInitialMessageSent?: () => void;  // Callback quando il messaggio iniziale è stato processato
}

const CHAT_STORAGE_KEY = 'genagenta_ai_chat_history';

export function AiChat({ isOpen, onClose, onAction, selectedEntity, visibilityContext, userActions, userName = 'utente', initialMessage, onInitialMessageSent }: AiChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<'thinking' | 'compacting'>('thinking');
  const [_contextInfo, setContextInfo] = useState({ messagesCount: 0, threshold: 25 });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Drag & drop per spostare la finestra
  const [position, setPosition] = useState({ x: 20, y: 20 }); // bottom-right offset
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef({ x: 0, y: 0, posX: 0, posY: 0 });

  const handleDragStart = (e: React.MouseEvent) => {
    // Solo se clicchi sull'header (non sui bottoni)
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y
    };
    e.preventDefault();
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = dragStartRef.current.x - e.clientX;
      const deltaY = dragStartRef.current.y - e.clientY;
      setPosition({
        x: Math.max(0, dragStartRef.current.posX + deltaX),
        y: Math.max(0, dragStartRef.current.posY + deltaY)
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  // Saluto dinamico (cambia ad ogni apertura della chat)
  const greeting = useMemo(() => {
    const randomGreeting = AGEA_GREETINGS[Math.floor(Math.random() * AGEA_GREETINGS.length)];
    return randomGreeting(userName.split(' ')[0]); // Usa solo il nome, non cognome
  }, [userName]);

  // Carica conversazione da localStorage al mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Riconverti le date da string a Date
        const restored = parsed.map((m: { role: string; content: string; timestamp: string }) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
        setMessages(restored);
      }
    } catch (e) {
      console.error('Errore caricamento chat salvata:', e);
    }
  }, []);

  // Salva conversazione in localStorage quando cambia
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Gestisci messaggio iniziale (es. da floating suggestions)
  useEffect(() => {
    if (isOpen && initialMessage && !isLoading) {
      // Imposta il messaggio nell'input e invia
      setInput(initialMessage);
      // Notifica che il messaggio iniziale è stato processato
      onInitialMessageSent?.();
      // Invia dopo un breve delay per permettere al componente di renderizzare
      setTimeout(() => {
        const submitBtn = document.querySelector('[data-ai-submit]') as HTMLButtonElement;
        submitBtn?.click();
      }, 100);
    }
  }, [isOpen, initialMessage]);

  // Nuova sessione - cancella tutto
  const startNewSession = () => {
    setMessages([]);
    localStorage.removeItem(CHAT_STORAGE_KEY);
  };

  // =====================================================
  // FRONTEND EXECUTION: Esegue pending_action dal backend
  // =====================================================

  // Verifica se un'entità sarà visibile con i filtri attuali
  const checkVisibility = (entityType?: string, entityCategoria?: string): {
    visible: boolean;
    filteredOutBy?: string;
  } => {
    if (!visibilityContext) {
      return { visible: true }; // Senza contesto, assumiamo visibile
    }

    const { activeFilters } = visibilityContext;

    // Check filtro tipo
    if (activeFilters.tipoNeurone && entityType) {
      if (activeFilters.tipoNeurone.toLowerCase() !== entityType.toLowerCase()) {
        return {
          visible: false,
          filteredOutBy: `filtro tipo attivo: "${activeFilters.tipoNeurone}"`
        };
      }
    }

    // Check filtro categoria
    if (activeFilters.categoria && entityCategoria) {
      if (activeFilters.categoria !== entityCategoria) {
        return {
          visible: false,
          filteredOutBy: `filtro categoria attivo: "${activeFilters.categoria}"`
        };
      }
    }

    return { visible: true };
  };

  const executePendingAction = async (
    action: AiPendingAction
  ): Promise<{ success: boolean; data?: unknown; error?: string; visibility?: { visible: boolean; filteredOutBy?: string } }> => {
    console.log('Eseguo pending_action:', action);

    try {
      let result: unknown;
      let entityType: string | undefined;
      let entityCategoria: string | undefined;

      switch (action.action_type) {
        case 'createNeurone':
          result = await api.createNeurone(action.payload as Parameters<typeof api.createNeurone>[0]);
          // Estrai tipo per check visibilità
          entityType = (action.payload as { tipo?: string })?.tipo;
          entityCategoria = (action.payload as { categorie?: string[] })?.categorie?.[0];
          break;

        case 'updateNeurone':
          if (!action.entity_id) throw new Error('entity_id mancante');
          await api.updateNeurone(action.entity_id, action.payload as Parameters<typeof api.updateNeurone>[1]);
          result = { success: true, id: action.entity_id };
          entityType = (action.payload as { tipo?: string })?.tipo;
          break;

        case 'deleteNeurone':
          if (!action.entity_id) throw new Error('entity_id mancante');
          await api.deleteNeurone(action.entity_id);
          result = { success: true, deleted: action.entity_id };
          break;

        case 'createSinapsi':
          result = await api.createSinapsi(action.payload as Parameters<typeof api.createSinapsi>[0]);
          break;

        case 'deleteSinapsi':
          if (!action.sinapsi_id) throw new Error('sinapsi_id mancante');
          await api.deleteSinapsi(action.sinapsi_id);
          result = { success: true, deleted: action.sinapsi_id };
          break;

        case 'createVendita':
          result = await api.createVendita(action.payload as Parameters<typeof api.createVendita>[0]);
          break;

        case 'deleteSale':
          if (!action.sale_id) throw new Error('sale_id mancante');
          result = await api.deleteVendita(action.sale_id);
          break;

        case 'createNota':
          // eslint-disable-next-line no-case-declarations
          const notaPayload = action.payload as { neurone_id: string; testo: string };
          result = await api.createNota(notaPayload.neurone_id, notaPayload.testo);
          break;

        case 'callApi':
          // Chiamata API generica
          if (action.method === 'POST') {
            const res = await api.post(action.endpoint, action.payload);
            result = res.data;
            // Per call_api su neuroni, estrai tipo dal payload
            if (action.endpoint?.includes('neuroni')) {
              entityType = (action.payload as { tipo?: string })?.tipo;
              entityCategoria = (action.payload as { categorie?: string[] })?.categorie?.[0];
            }
          } else if (action.method === 'PUT') {
            const res = await api.put(action.endpoint, action.payload);
            result = res.data;
          } else if (action.method === 'DELETE') {
            const res = await api.delete(action.endpoint);
            result = res.data;
          }
          break;

        default:
          throw new Error(`Tipo azione non supportato: ${action.action_type}`);
      }

      console.log('Pending action completata:', result);

      // Check visibilità per azioni su neuroni
      const isNeuroneAction = ['createNeurone', 'updateNeurone'].includes(action.action_type) ||
        (action.action_type === 'callApi' && action.endpoint?.includes('neuroni') && action.method === 'POST');

      if (isNeuroneAction) {
        const visibility = checkVisibility(entityType, entityCategoria);
        console.log('Visibility check:', { entityType, entityCategoria, visibility });
        return { success: true, data: result, visibility };
      }

      return { success: true, data: result };
    } catch (error) {
      console.error('Errore esecuzione pending_action:', error);
      let errorMsg = 'Errore sconosciuto';
      // Estrai messaggio di errore dall'API (Axios mette la risposta in error.response.data)
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { error?: string; message?: string } } };
        if (axiosError.response?.data) {
          errorMsg = axiosError.response.data.error || axiosError.response.data.message || 'Errore API';
        }
      } else if (error instanceof Error) {
        errorMsg = error.message;
      }
      return { success: false, error: errorMsg };
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Determina se faremo compaction (threshold: 30 messaggi)
    const willCompact = messages.length >= 25;
    setLoadingPhase(willCompact ? 'compacting' : 'thinking');

    try {
      // Prepara history per API - LIMITA A ULTIMI 30 MESSAGGI e TRONCA CONTENUTO
      // Include tool_summary per memoria contesto (ID creati, ricerche, etc.)
      const recentMessages = messages.slice(-30);
      const history = recentMessages.map((m) => ({
        role: m.role,
        content: m.content.length > 1500 ? m.content.substring(0, 1500) + '...[troncato]' : m.content,
        tool_summary: m.tool_summary,  // Info chiave per continuità contesto
      }));

      // Se stiamo per fare compaction, mostra fase "compacting" per un po'
      if (willCompact) {
        setLoadingPhase('compacting');
        await new Promise(r => setTimeout(r, 500));
      }
      setLoadingPhase('thinking');

      // =====================================================
      // FRONTEND EXECUTION: Loop per gestire pending_action
      // =====================================================
      let continueLoop = true;
      let currentResponse: AiChatResponse | null = null;
      let resumeContext: Record<string, unknown> | null = null;
      let loopCount = 0;
      const maxLoops = 10; // Protezione anti-loop

      while (continueLoop && loopCount < maxLoops) {
        loopCount++;

        // Prima chiamata o resume?
        if (!resumeContext) {
          // Passa contesto (selezione + azioni utente)
          const context: { selectedEntity?: typeof selectedEntity; userActions?: UserAction[] } = {};
          if (selectedEntity) context.selectedEntity = selectedEntity;
          if (userActions && userActions.length > 0) context.userActions = userActions;

          // DEBUG: log del contesto passato all'AI
          console.log('=== AI CHAT CONTEXT DEBUG ===');
          console.log('selectedEntity:', selectedEntity);
          console.log('userActions count:', userActions?.length || 0);
          console.log('userActions:', userActions);
          console.log('context being sent:', context);
          console.log('=============================');

          currentResponse = await api.aiChat(userMessage.content, history, Object.keys(context).length > 0 ? context : undefined);
        } else {
          // Resume con il risultato dell'azione
          const actionResult = resumeContext._actionResult as { success: boolean; data?: unknown; error?: string };
          delete resumeContext._actionResult;
          currentResponse = await api.aiChatContinue(resumeContext, actionResult);
        }

        // Check se c'è una pending_action
        if (currentResponse.status === 'pending_action' && currentResponse.pending_action) {
          console.log('Pending action ricevuta:', currentResponse.pending_action);

          // Mostra messaggio parziale se presente
          if (currentResponse.partial_response) {
            const partialMessage: Message = {
              role: 'assistant',
              content: currentResponse.partial_response + ' ⏳',
              timestamp: new Date(),
            };
            setMessages((prev) => {
              // Rimuovi eventuale messaggio parziale precedente
              const filtered = prev.filter(m => !m.content.endsWith(' ⏳'));
              return [...filtered, partialMessage];
            });
          }

          // Esegui l'azione
          const actionResult = await executePendingAction(currentResponse.pending_action);

          // Prepara per resume
          resumeContext = {
            ...(currentResponse.resume_context || {}),
            _actionResult: actionResult
          };

          // Se azione CRUD su neuroni/sinapsi, trigger refresh immediato
          if (actionResult.success) {
            const actionType = currentResponse.pending_action.action_type;
            const endpoint = currentResponse.pending_action.endpoint || '';
            const method = currentResponse.pending_action.method || '';
            const isNeuroniAction = ['createNeurone', 'updateNeurone', 'deleteNeurone'].includes(actionType);
            const isSinapsiAction = ['createSinapsi', 'deleteSinapsi'].includes(actionType);
            const isCallApiOnNeuroni = actionType === 'callApi' &&
              (endpoint.includes('neuroni') || endpoint.includes('sinapsi'));

            console.log('DEBUG refresh check:', {
              actionType,
              endpoint,
              method,
              isNeuroniAction,
              isSinapsiAction,
              isCallApiOnNeuroni,
              willRefresh: isNeuroniAction || isSinapsiAction || isCallApiOnNeuroni
            });

            if (isNeuroniAction || isSinapsiAction || isCallApiOnNeuroni) {
              console.log('TRIGGERING refresh_neuroni!');
              onAction?.({ type: 'refresh_neuroni' });
            }
          }

          // Continua il loop
          continue;
        }

        // Risposta finale - esci dal loop
        continueLoop = false;

        // Rimuovi eventuali messaggi parziali
        setMessages((prev) => prev.filter(m => !m.content.endsWith(' ⏳')));

        // Aggiorna info contesto dalla risposta
        if (currentResponse.context) {
          setContextInfo({
            messagesCount: currentResponse.context.messages_count || 0,
            threshold: currentResponse.context.compaction_threshold || 25
          });

          // Se il backend ha fatto compaction, sostituisci la history locale con il riassunto
          if (currentResponse.context.did_compaction && currentResponse.context.compaction_summary) {
            console.log('Compaction ricevuta, reset history con riassunto');
            const summaryMessage: Message = {
              role: 'assistant',
              content: `[Riassunto: ${currentResponse.context.compaction_summary}]`,
              timestamp: new Date(),
            };
            const assistantMessage: Message = {
              role: 'assistant',
              content: currentResponse.response || 'Fatto!',
              timestamp: new Date(),
            };
            const newMessages: Message[] = [summaryMessage, userMessage, assistantMessage];
            setMessages(newMessages);
            localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(newMessages));

            // Esegui azioni frontend
            if (currentResponse.actions && Array.isArray(currentResponse.actions) && onAction) {
              for (const action of currentResponse.actions) {
                console.log('Eseguo azione AI (post-compaction):', action);
                onAction(action as AiFrontendAction);
              }
            }
            return;
          }
        }

        // Aggiungi risposta AI con tool_summary per memoria contesto
        const assistantMessage: Message = {
          role: 'assistant',
          content: currentResponse.response || 'Fatto!',
          timestamp: new Date(),
          tool_summary: currentResponse.tool_summary,  // Info chiave (ID, nomi, etc.)
        };
        setMessages((prev) => [...prev, assistantMessage]);

        // Esegui azioni frontend se presenti
        if (currentResponse.actions && Array.isArray(currentResponse.actions) && onAction) {
          for (const action of currentResponse.actions) {
            console.log('Eseguo azione AI:', action);
            onAction(action as AiFrontendAction);
          }
        }
      }

      // Protezione anti-loop raggiunta
      if (loopCount >= maxLoops) {
        console.warn('Frontend execution: raggiunto limite loop');
        const warningMessage: Message = {
          role: 'assistant',
          content: 'Ho completato diverse operazioni. C\'è altro che posso fare?',
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, warningMessage]);
      }

    } catch (error) {
      console.error('Errore AI:', error);
      const errorMessage: Message = {
        role: 'assistant',
        content: 'Ahia! 😅 Mi sa che ho fatto un pasticcio... Forse dovremmo dare un\'occhiata lato software, da qui non riesco proprio! Prova a riformulare in modo diverso oppure chiedi al supporto tecnico.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setLoadingPhase('thinking');
      // Rimetti focus sull'input dopo risposta AI
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        bottom: `${position.y}px`,
        right: `${position.x}px`,
        width: '400px',
        height: '500px',
        backgroundColor: 'var(--bg-secondary)',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
        border: '1px solid var(--border)',
      }}
    >
      {/* Header - trascinabile */}
      <div
        onMouseDown={handleDragStart}
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '12px 12px 0 0',
          cursor: isDragging ? 'grabbing' : 'grab',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              boxShadow: '0 0 12px rgba(59, 130, 246, 0.6), 0 0 24px rgba(139, 92, 246, 0.3)',
            }}
          />
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            Agea
          </span>
          {/* Contatore messaggi */}
          {messages.length > 0 && (
            <span style={{
              marginLeft: '8px',
              padding: '2px 8px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '10px',
              fontSize: '11px',
              color: 'var(--text-secondary)',
            }}>
              {messages.length}
            </span>
          )}
          {/* Indicatore entità selezionata */}
          {selectedEntity && (
            <span
              title={`Contesto: ${selectedEntity.nome}`}
              style={{
                marginLeft: '4px',
                padding: '2px 6px',
                backgroundColor: 'rgba(34, 197, 94, 0.15)',
                borderRadius: '10px',
                fontSize: '10px',
                color: '#22c55e',
                maxWidth: '100px',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {selectedEntity.nome}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Bottone Nuova Sessione */}
          {messages.length > 0 && (
            <button
              onClick={startNewSession}
              title="Nuova sessione"
              style={{
                background: 'none',
                border: '1px solid var(--border-color)',
                borderRadius: '6px',
                fontSize: '11px',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                padding: '4px 8px',
              }}
            >
              Nuova
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '4px',
            }}
          >
            ×
          </button>
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              color: 'var(--text-secondary)',
              padding: '20px',
              fontSize: '14px',
            }}
          >
            {/* Avatar Agea */}
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              margin: '0 auto 16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(59, 130, 246, 0.4)',
            }}>
              <span style={{ fontSize: '24px' }}>🤖</span>
            </div>

            {/* Saluto dinamico */}
            <p style={{
              marginBottom: '8px',
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--text-primary)'
            }}>
              {greeting}
            </p>
            <p style={{ fontSize: '13px', opacity: 0.8, marginBottom: '20px' }}>
              Hai già qualche idea, o partiamo da un'analisi?
            </p>

            {/* Quick Actions */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
              }}
            >
              {QUICK_ACTIONS.map((action, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    if (action.prompt) {
                      setInput(action.prompt);
                      // Auto-invia se ha un prompt predefinito
                      setTimeout(() => {
                        const event = new KeyboardEvent('keydown', { key: 'Enter' });
                        inputRef.current?.dispatchEvent(event);
                      }, 100);
                    } else {
                      // Focus sull'input per "Cerca qualcosa"
                      inputRef.current?.focus();
                    }
                  }}
                  style={{
                    padding: '12px 10px',
                    background: 'var(--bg-primary)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    color: 'var(--text-primary)',
                    fontSize: '12px',
                    fontWeight: 500,
                    transition: 'all 0.2s ease',
                    textAlign: 'center',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'var(--bg-hover)';
                    e.currentTarget.style.borderColor = 'var(--primary)';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'var(--bg-primary)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: '85%',
                padding: '10px 14px',
                borderRadius: '12px',
                backgroundColor:
                  msg.role === 'user' ? '#3b82f6' : 'var(--bg-primary)',
                color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                fontSize: '14px',
                lineHeight: '1.5',
                whiteSpace: 'pre-wrap',
              }}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {isLoading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div
              style={{
                padding: '10px 14px',
                borderRadius: '12px',
                backgroundColor: 'var(--bg-primary)',
                color: 'var(--text-secondary)',
                fontSize: '14px',
              }}
            >
              {loadingPhase === 'compacting' ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '12px' }}>📝</span>
                  Sto riassumendo la conversazione
                  <span className="dots-animation">...</span>
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="thinking-dot" />
                  Sto pensando
                  <span className="dots-animation">...</span>
                </span>
              )}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: '12px',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          gap: '8px',
        }}
      >
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Scrivi un messaggio..."
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            fontSize: '14px',
            resize: 'none',
            minHeight: '44px',
            maxHeight: '100px',
          }}
          rows={1}
        />
        <button
          data-ai-submit
          onClick={sendMessage}
          disabled={!input.trim() || isLoading}
          style={{
            padding: '10px 16px',
            borderRadius: '8px',
            border: 'none',
            backgroundColor: input.trim() && !isLoading ? '#3b82f6' : '#6b7280',
            color: 'white',
            cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
            fontSize: '14px',
            fontWeight: 500,
          }}
        >
          Invia
        </button>
      </div>
    </div>
  );
}
