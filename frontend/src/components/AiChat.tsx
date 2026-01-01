// GenAgenTa - AI Chat Component

import { useState, useRef, useEffect } from 'react';
import { api, AiPendingAction, AiChatResponse } from '../utils/api';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

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

interface AiChatProps {
  isOpen: boolean;
  onClose: () => void;
  onAction?: (action: AiFrontendAction) => void;
}

const CHAT_STORAGE_KEY = 'genagenta_ai_chat_history';

export function AiChat({ isOpen, onClose, onAction }: AiChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<'thinking' | 'compacting'>('thinking');
  const [_contextInfo, setContextInfo] = useState({ messagesCount: 0, threshold: 25 });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

  // Nuova sessione - cancella tutto
  const startNewSession = () => {
    setMessages([]);
    localStorage.removeItem(CHAT_STORAGE_KEY);
  };

  // =====================================================
  // FRONTEND EXECUTION: Esegue pending_action dal backend
  // =====================================================
  const executePendingAction = async (
    action: AiPendingAction
  ): Promise<{ success: boolean; data?: unknown; error?: string }> => {
    console.log('Eseguo pending_action:', action);

    try {
      let result: unknown;

      switch (action.action_type) {
        case 'createNeurone':
          result = await api.createNeurone(action.payload as Parameters<typeof api.createNeurone>[0]);
          break;

        case 'updateNeurone':
          if (!action.entity_id) throw new Error('entity_id mancante');
          await api.updateNeurone(action.entity_id, action.payload as Parameters<typeof api.updateNeurone>[1]);
          result = { success: true, id: action.entity_id };
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
          await api.delete(`/v2/vendite/${action.sale_id}`);
          result = { success: true, deleted: action.sale_id };
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
      return { success: true, data: result };
    } catch (error) {
      console.error('Errore esecuzione pending_action:', error);
      const errorMsg = error instanceof Error ? error.message : 'Errore sconosciuto';
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
      const recentMessages = messages.slice(-30);
      const history = recentMessages.map((m) => ({
        role: m.role,
        content: m.content.length > 1500 ? m.content.substring(0, 1500) + '...[troncato]' : m.content,
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
          currentResponse = await api.aiChat(userMessage.content, history);
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

          // Se azione CRUD su neuroni, trigger refresh immediato
          if (actionResult.success &&
              ['createNeurone', 'updateNeurone', 'deleteNeurone'].includes(currentResponse.pending_action.action_type)) {
            onAction?.({ type: 'refresh_neuroni' });
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

        // Aggiungi risposta AI
        const assistantMessage: Message = {
          role: 'assistant',
          content: currentResponse.response || 'Fatto!',
          timestamp: new Date(),
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
        content: 'Mi dispiace, si è verificato un errore. Riprova.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      setLoadingPhase('thinking');
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
        bottom: '20px',
        right: '20px',
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
      {/* Header */}
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: 'var(--bg-primary)',
          borderRadius: '12px 12px 0 0',
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
            AI Assistant
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
            <p style={{ marginBottom: '12px' }}>Ciao! Sono il tuo assistente AI.</p>
            <p style={{ fontSize: '12px', opacity: 0.7 }}>
              Puoi chiedermi informazioni sui tuoi clienti, vendite, connessioni...
            </p>
            <div
              style={{
                marginTop: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <button
                onClick={() => setInput('Chi sono i miei migliori clienti?')}
                style={{
                  padding: '8px 12px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                }}
              >
                Chi sono i miei migliori clienti?
              </button>
              <button
                onClick={() => setInput('Quanto ho venduto questo mese?')}
                style={{
                  padding: '8px 12px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                }}
              >
                Quanto ho venduto questo mese?
              </button>
              <button
                onClick={() => setInput('Mostrami lo schema del database')}
                style={{
                  padding: '8px 12px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                }}
              >
                Mostrami lo schema del database
              </button>
              <button
                onClick={() => setInput('Inquadrami Roma sulla mappa')}
                style={{
                  padding: '8px 12px',
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                }}
              >
                Inquadrami Roma sulla mappa
              </button>
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
