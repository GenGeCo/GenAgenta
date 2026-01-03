// GenAgenTa - Floating Suggestions Component
// Suggerimenti contestuali smart senza API - puramente frontend

import { useState, useEffect, useMemo } from 'react';
import type { Neurone, Sinapsi } from '../types';

interface Suggestion {
  id: string;
  text: string;
  icon: string;
  action: string; // Messaggio da inviare alla chat AI
  priority: number;
}

interface FloatingSuggestionsProps {
  // Contesto corrente
  selectedEntity?: Neurone | null;
  focusedEntity?: Neurone | null;
  activeFilters?: {
    tipiAttivi: string[];
    categorieAttive: string[];
    ricerca: string;
  };
  sinapsi?: Sinapsi[];
  neuroni?: Neurone[];

  // Callback per inviare suggerimento alla chat
  onSuggestionClick: (message: string) => void;

  // Se la chat AI è aperta
  isChatOpen?: boolean;
}

export default function FloatingSuggestions({
  selectedEntity,
  focusedEntity,
  activeFilters,
  sinapsi = [],
  neuroni = [],
  onSuggestionClick,
  isChatOpen = false,
}: FloatingSuggestionsProps) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  // Resetta dismissed quando cambia il contesto
  useEffect(() => {
    setDismissed([]);
    setIsVisible(true);
  }, [selectedEntity?.id, focusedEntity?.id]);

  // Genera suggerimenti basati sul contesto
  const suggestions = useMemo(() => {
    const result: Suggestion[] = [];
    const entity = selectedEntity || focusedEntity;

    // === Suggerimenti per entità selezionata ===
    if (entity) {
      // Conta connessioni
      const connessioni = sinapsi.filter(
        s => s.neurone_da === entity.id || s.neurone_a === entity.id
      );

      if (connessioni.length > 0) {
        result.push({
          id: 'analizza-connessioni',
          text: `Analizza ${connessioni.length} connessioni`,
          icon: '🔗',
          action: `Analizza le connessioni di ${entity.nome}`,
          priority: 10,
        });
      } else {
        result.push({
          id: 'suggerisci-connessioni',
          text: 'Suggerisci connessioni',
          icon: '💡',
          action: `Quali connessioni potrei creare per ${entity.nome}?`,
          priority: 8,
        });
      }

      // Per clienti/fornitori
      if (entity.tipo?.toLowerCase().includes('cliente') || entity.tipo?.toLowerCase().includes('impresa')) {
        result.push({
          id: 'storico-vendite',
          text: 'Vedi storico vendite',
          icon: '📊',
          action: `Mostrami lo storico vendite di ${entity.nome}`,
          priority: 9,
        });
      }

      // Per cantieri
      if (entity.tipo?.toLowerCase().includes('cantiere') || entity.tipo?.toLowerCase().includes('luogo')) {
        result.push({
          id: 'attivita-cantiere',
          text: 'Analizza attività',
          icon: '🏗️',
          action: `Quali attività ci sono state su ${entity.nome}?`,
          priority: 9,
        });
      }

      // Suggerimento generico
      result.push({
        id: 'info-entita',
        text: 'Maggiori info',
        icon: 'ℹ️',
        action: `Dimmi tutto quello che sai su ${entity.nome}`,
        priority: 5,
      });
    }

    // === Suggerimenti per filtri attivi ===
    if (activeFilters) {
      const filtriAttivi = [
        ...activeFilters.tipiAttivi,
        ...activeFilters.categorieAttive,
      ].filter(Boolean);

      if (filtriAttivi.length > 0 && neuroni.length > 0) {
        result.push({
          id: 'analizza-filtro',
          text: `Analizza ${neuroni.length} risultati`,
          icon: '📈',
          action: `Analizza le ${neuroni.length} entità filtrate: ${filtriAttivi.join(', ')}`,
          priority: 7,
        });
      }

      if (activeFilters.ricerca && activeFilters.ricerca.length > 2) {
        result.push({
          id: 'espandi-ricerca',
          text: 'Espandi ricerca',
          icon: '🔍',
          action: `Cerca entità simili a "${activeFilters.ricerca}"`,
          priority: 6,
        });
      }
    }

    // === Suggerimenti generali (quando nessun contesto specifico) ===
    if (!entity && (!activeFilters || activeFilters.tipiAttivi.length === 0)) {
      if (neuroni.length > 10) {
        result.push({
          id: 'overview-generale',
          text: 'Panoramica generale',
          icon: '🗺️',
          action: 'Dammi una panoramica generale della mia rete',
          priority: 4,
        });
      }

      result.push({
        id: 'trend-vendite',
        text: 'Trend vendite',
        icon: '📊',
        action: 'Come stanno andando le vendite questo mese?',
        priority: 3,
      });
    }

    // Filtra dismissed e ordina per priorità
    return result
      .filter(s => !dismissed.includes(s.id))
      .sort((a, b) => b.priority - a.priority)
      .slice(0, 3); // Max 3 suggerimenti

  }, [selectedEntity, focusedEntity, activeFilters, sinapsi, neuroni, dismissed]);

  // Non mostrare se:
  // - Chat è aperta (non serve, si può scrivere direttamente)
  // - Nessun suggerimento
  // - Utente ha chiuso
  if (isChatOpen || !isVisible || suggestions.length === 0) {
    return null;
  }

  const handleSuggestionClick = (suggestion: Suggestion) => {
    onSuggestionClick(suggestion.action);
    // Rimuovi questo suggerimento
    setDismissed(prev => [...prev, suggestion.id]);
  };

  const handleDismissAll = () => {
    setIsVisible(false);
  };

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '100px',
        right: '24px',
        zIndex: 1500,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        maxWidth: '280px',
      }}
    >
      {/* Header con dismiss */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '4px',
        }}
      >
        <span style={{
          fontSize: '11px',
          color: 'var(--text-secondary)',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          💡 Suggerimenti
        </span>
        <button
          onClick={handleDismissAll}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: '14px',
            padding: '2px 6px',
            borderRadius: '4px',
          }}
          title="Chiudi suggerimenti"
        >
          ×
        </button>
      </div>

      {/* Suggerimenti */}
      {suggestions.map((suggestion, index) => (
        <button
          key={suggestion.id}
          onClick={() => handleSuggestionClick(suggestion)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            padding: '10px 14px',
            background: 'var(--bg-secondary)',
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            cursor: 'pointer',
            textAlign: 'left',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            transition: 'all 0.2s ease',
            animation: `slideIn 0.3s ease ${index * 0.1}s both`,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-primary)';
            e.currentTarget.style.borderColor = 'var(--primary)';
            e.currentTarget.style.transform = 'translateX(-4px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'var(--bg-secondary)';
            e.currentTarget.style.borderColor = 'var(--border-color)';
            e.currentTarget.style.transform = 'translateX(0)';
          }}
        >
          <span style={{ fontSize: '18px' }}>{suggestion.icon}</span>
          <span style={{
            fontSize: '13px',
            color: 'var(--text-primary)',
            fontWeight: 500,
          }}>
            {suggestion.text}
          </span>
        </button>
      ))}

      {/* CSS Animation */}
      <style>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateX(20px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>
    </div>
  );
}
