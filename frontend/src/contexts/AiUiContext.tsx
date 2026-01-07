/**
 * AiUiContext - Sistema centrale per permettere all'AI di vedere e interagire con l'UI
 *
 * Implementa il pattern ibrido:
 * 1. Accessibility Tree: l'AI "vede" la struttura UI automaticamente
 * 2. Actions Registry: l'AI sa quali azioni può compiere
 *
 * Ispirato a CopilotKit ma senza dipendenza da GraphQL runtime.
 */

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

// ============= TYPES =============

export interface AiReadableItem {
  id: string;
  category: string;  // es: 'panel', 'tab', 'form', 'data'
  name: string;
  value: unknown;
  description?: string;
}

export interface AiActionItem {
  id: string;
  name: string;
  description: string;
  parameters: {
    name: string;
    type: 'string' | 'number' | 'boolean' | 'select';
    description: string;
    required: boolean;
    options?: string[];  // per type: 'select'
  }[];
  handler: (params: Record<string, unknown>) => Promise<{ success: boolean; message: string }>;
}

export interface AccessibilityNode {
  role: string;
  name: string;
  value?: string;
  checked?: boolean;
  selected?: boolean;
  expanded?: boolean;
  disabled?: boolean;
  children?: AccessibilityNode[];
}

export interface AiUiState {
  // Dati leggibili dall'AI
  readables: Map<string, AiReadableItem>;
  // Azioni disponibili per l'AI
  actions: Map<string, AiActionItem>;
  // Snapshot dell'accessibility tree
  accessibilitySnapshot: AccessibilityNode[];
  // Timestamp ultimo aggiornamento
  lastUpdate: number;
}

export interface AiUiContextValue {
  state: AiUiState;
  // Registra un dato leggibile
  registerReadable: (item: AiReadableItem) => void;
  unregisterReadable: (id: string) => void;
  // Registra un'azione
  registerAction: (action: AiActionItem) => void;
  unregisterAction: (id: string) => void;
  // Esegui un'azione
  executeAction: (actionId: string, params: Record<string, unknown>) => Promise<{ success: boolean; message: string }>;
  // Aggiorna snapshot accessibilità
  refreshAccessibilitySnapshot: () => void;
  // Esporta stato per l'AI (formato testuale)
  exportForAi: () => string;
  // Esporta stato per l'AI (formato JSON)
  exportForAiJson: () => { readables: AiReadableItem[]; actions: Omit<AiActionItem, 'handler'>[]; ui: AccessibilityNode[] };
}

// ============= CONTEXT =============

const AiUiContext = createContext<AiUiContextValue | null>(null);

// ============= ACCESSIBILITY TREE PARSER =============

function parseAccessibilityTree(root: Element, maxDepth: number = 4): AccessibilityNode[] {
  const nodes: AccessibilityNode[] = [];

  // Selettori per elementi interattivi e semantici
  const interactiveSelectors = [
    '[role]',
    'button', 'a[href]', 'input', 'select', 'textarea',
    '[tabindex]:not([tabindex="-1"])',
    '[aria-label]', '[aria-labelledby]',
    'h1', 'h2', 'h3', 'h4',
    '[data-ai-readable]'  // Custom attribute per elementi che vogliamo esporre
  ].join(',');

  function parseNode(element: Element, depth: number): AccessibilityNode | null {
    if (depth > maxDepth) return null;

    const role = element.getAttribute('role') || element.tagName.toLowerCase();
    const ariaLabel = element.getAttribute('aria-label');
    const ariaLabelledBy = element.getAttribute('aria-labelledby');
    const title = element.getAttribute('title');
    const placeholder = element.getAttribute('placeholder');
    const dataAiName = element.getAttribute('data-ai-name');

    // Determina il nome dell'elemento
    let name = dataAiName || ariaLabel || '';
    if (!name && ariaLabelledBy) {
      const labelEl = document.getElementById(ariaLabelledBy);
      name = labelEl?.textContent?.trim() || '';
    }
    if (!name) {
      name = title || placeholder || element.textContent?.trim().substring(0, 50) || '';
    }

    // Salta elementi senza nome significativo (tranne contenitori)
    const isContainer = ['main', 'nav', 'section', 'article', 'aside', 'dialog', 'tabpanel'].includes(role);
    if (!name && !isContainer) return null;

    const node: AccessibilityNode = {
      role: mapRole(role),
      name: name.substring(0, 100)  // Limita lunghezza
    };

    // Aggiungi stato per elementi interattivi
    if (element instanceof HTMLInputElement) {
      if (element.type === 'checkbox' || element.type === 'radio') {
        node.checked = element.checked;
      } else {
        node.value = element.value;
      }
      node.disabled = element.disabled;
    }

    if (element instanceof HTMLSelectElement) {
      node.value = element.value;
      node.disabled = element.disabled;
    }

    if (element.getAttribute('aria-selected') === 'true') {
      node.selected = true;
    }

    if (element.getAttribute('aria-expanded')) {
      node.expanded = element.getAttribute('aria-expanded') === 'true';
    }

    if (element.getAttribute('aria-disabled') === 'true') {
      node.disabled = true;
    }

    // Parse figli
    const childElements = element.querySelectorAll(':scope > ' + interactiveSelectors);
    if (childElements.length > 0 && depth < maxDepth) {
      const children: AccessibilityNode[] = [];
      childElements.forEach(child => {
        const childNode = parseNode(child, depth + 1);
        if (childNode) children.push(childNode);
      });
      if (children.length > 0) {
        node.children = children;
      }
    }

    return node;
  }

  // Mappa ruoli HTML a ruoli più leggibili
  function mapRole(role: string): string {
    const roleMap: Record<string, string> = {
      'button': 'bottone',
      'link': 'link',
      'textbox': 'campo_testo',
      'checkbox': 'checkbox',
      'radio': 'radio',
      'tab': 'tab',
      'tablist': 'lista_tab',
      'tabpanel': 'pannello_tab',
      'dialog': 'dialogo',
      'menu': 'menu',
      'menuitem': 'voce_menu',
      'listbox': 'lista_selezione',
      'option': 'opzione',
      'combobox': 'dropdown',
      'slider': 'slider',
      'spinbutton': 'numero',
      'switch': 'interruttore',
      'heading': 'titolo',
      'h1': 'titolo_h1',
      'h2': 'titolo_h2',
      'h3': 'titolo_h3',
      'h4': 'titolo_h4',
      'input': 'input',
      'select': 'selezione',
      'textarea': 'area_testo',
      'a': 'link',
      'nav': 'navigazione',
      'main': 'contenuto_principale',
      'section': 'sezione',
      'article': 'articolo',
      'aside': 'sidebar',
      'form': 'form',
      'img': 'immagine',
      'div': 'contenitore',
      'span': 'testo'
    };
    return roleMap[role] || role;
  }

  // Trova elementi interattivi di primo livello
  const topLevelElements = root.querySelectorAll(interactiveSelectors);
  const processed = new Set<Element>();

  topLevelElements.forEach(el => {
    // Salta se è figlio di un elemento già processato
    let parent = el.parentElement;
    while (parent && parent !== root) {
      if (processed.has(parent)) return;
      parent = parent.parentElement;
    }

    const node = parseNode(el, 0);
    if (node) {
      nodes.push(node);
      processed.add(el);
    }
  });

  return nodes;
}

// ============= PROVIDER =============

export function AiUiProvider({ children }: { children: React.ReactNode }) {
  const [readables, setReadables] = useState<Map<string, AiReadableItem>>(new Map());
  const [actions, setActions] = useState<Map<string, AiActionItem>>(new Map());
  const [accessibilitySnapshot, setAccessibilitySnapshot] = useState<AccessibilityNode[]>([]);
  const [lastUpdate, setLastUpdate] = useState(Date.now());

  // Ref per evitare re-render inutili
  const actionsRef = useRef(actions);
  actionsRef.current = actions;

  // Registra readable
  const registerReadable = useCallback((item: AiReadableItem) => {
    setReadables(prev => {
      const next = new Map(prev);
      next.set(item.id, item);
      return next;
    });
    setLastUpdate(Date.now());
  }, []);

  const unregisterReadable = useCallback((id: string) => {
    setReadables(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    setLastUpdate(Date.now());
  }, []);

  // Registra action
  const registerAction = useCallback((action: AiActionItem) => {
    setActions(prev => {
      const next = new Map(prev);
      next.set(action.id, action);
      return next;
    });
    setLastUpdate(Date.now());
  }, []);

  const unregisterAction = useCallback((id: string) => {
    setActions(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
    setLastUpdate(Date.now());
  }, []);

  // Esegui action
  const executeAction = useCallback(async (actionId: string, params: Record<string, unknown>) => {
    const action = actionsRef.current.get(actionId);
    if (!action) {
      return { success: false, message: `Azione "${actionId}" non trovata` };
    }

    try {
      const result = await action.handler(params);
      setLastUpdate(Date.now());
      return result;
    } catch (error) {
      return { success: false, message: `Errore esecuzione: ${error}` };
    }
  }, []);

  // Refresh accessibility snapshot
  const refreshAccessibilitySnapshot = useCallback(() => {
    // Cerca il pannello principale e la mappa
    const mainContent = document.querySelector('[data-ai-container="main"]') || document.body;
    const snapshot = parseAccessibilityTree(mainContent);
    setAccessibilitySnapshot(snapshot);
    setLastUpdate(Date.now());
  }, []);

  // Auto-refresh periodico (ogni 2 secondi quando ci sono cambiamenti)
  useEffect(() => {
    const interval = setInterval(() => {
      refreshAccessibilitySnapshot();
    }, 2000);
    return () => clearInterval(interval);
  }, [refreshAccessibilitySnapshot]);

  // Esporta per AI (formato testuale)
  const exportForAi = useCallback((): string => {
    const lines: string[] = ['=== INTERFACCIA UTENTE ATTUALE ===', ''];

    // Readables raggruppati per categoria
    const byCategory = new Map<string, AiReadableItem[]>();
    readables.forEach(r => {
      const cat = r.category;
      if (!byCategory.has(cat)) byCategory.set(cat, []);
      byCategory.get(cat)!.push(r);
    });

    if (byCategory.size > 0) {
      lines.push('STATO COMPONENTI:');
      byCategory.forEach((items, category) => {
        lines.push(`  [${category.toUpperCase()}]`);
        items.forEach(item => {
          const valueStr = typeof item.value === 'object'
            ? JSON.stringify(item.value)
            : String(item.value);
          lines.push(`    ${item.name}: ${valueStr}`);
          if (item.description) lines.push(`      (${item.description})`);
        });
      });
      lines.push('');
    }

    // Actions disponibili
    if (actions.size > 0) {
      lines.push('AZIONI DISPONIBILI:');
      actions.forEach(action => {
        const paramsStr = action.parameters
          .map(p => `${p.name}${p.required ? '' : '?'}: ${p.type}${p.options ? ` [${p.options.join('|')}]` : ''}`)
          .join(', ');
        lines.push(`  - ${action.id}(${paramsStr})`);
        lines.push(`    ${action.description}`);
      });
      lines.push('');
    }

    // Accessibility snapshot (semplificato)
    if (accessibilitySnapshot.length > 0) {
      lines.push('ELEMENTI UI VISIBILI:');
      const formatNode = (node: AccessibilityNode, indent: string = '  '): void => {
        let line = `${indent}[${node.role}] "${node.name}"`;
        if (node.value !== undefined) line += ` = "${node.value}"`;
        if (node.checked !== undefined) line += node.checked ? ' ✓' : ' ○';
        if (node.selected) line += ' (selezionato)';
        if (node.expanded !== undefined) line += node.expanded ? ' (aperto)' : ' (chiuso)';
        if (node.disabled) line += ' (disabilitato)';
        lines.push(line);

        if (node.children) {
          node.children.forEach(child => formatNode(child, indent + '  '));
        }
      };
      accessibilitySnapshot.forEach(node => formatNode(node));
      lines.push('');
    }

    lines.push('=== FINE UI ===');
    return lines.join('\n');
  }, [readables, actions, accessibilitySnapshot]);

  // Esporta per AI (formato JSON)
  const exportForAiJson = useCallback(() => {
    return {
      readables: Array.from(readables.values()),
      actions: Array.from(actions.values()).map(({ handler, ...rest }) => rest),
      ui: accessibilitySnapshot
    };
  }, [readables, actions, accessibilitySnapshot]);

  const value: AiUiContextValue = {
    state: { readables, actions, accessibilitySnapshot, lastUpdate },
    registerReadable,
    unregisterReadable,
    registerAction,
    unregisterAction,
    executeAction,
    refreshAccessibilitySnapshot,
    exportForAi,
    exportForAiJson
  };

  return (
    <AiUiContext.Provider value={value}>
      {children}
    </AiUiContext.Provider>
  );
}

// ============= HOOKS =============

export function useAiUi() {
  const context = useContext(AiUiContext);
  if (!context) {
    throw new Error('useAiUi must be used within AiUiProvider');
  }
  return context;
}

/**
 * Hook per esporre un dato all'AI
 *
 * @example
 * useAiReadable('detail-panel-tab', 'panel', 'Tab attiva', activeTab, 'La tab correntemente selezionata nel pannello dettagli');
 */
export function useAiReadable(
  id: string,
  category: string,
  name: string,
  value: unknown,
  description?: string
) {
  const { registerReadable, unregisterReadable } = useAiUi();

  useEffect(() => {
    registerReadable({ id, category, name, value, description });
    return () => unregisterReadable(id);
  }, [id, category, name, value, description, registerReadable, unregisterReadable]);
}

/**
 * Hook per registrare un'azione che l'AI può eseguire
 *
 * @example
 * useAiAction({
 *   id: 'switch-tab',
 *   name: 'Cambia Tab',
 *   description: 'Cambia la tab attiva nel pannello dettagli',
 *   parameters: [{ name: 'tab', type: 'select', options: ['info', 'transazioni', 'connessioni', 'note'], required: true }],
 *   handler: async ({ tab }) => { setActiveTab(tab); return { success: true, message: `Tab cambiata in ${tab}` }; }
 * });
 */
export function useAiAction(action: AiActionItem) {
  const { registerAction, unregisterAction } = useAiUi();

  // Usa ref per evitare di ri-registrare quando cambia solo l'handler
  const actionRef = useRef(action);
  actionRef.current = action;

  useEffect(() => {
    // Registra con handler wrapper che usa sempre la versione più recente
    const wrappedAction: AiActionItem = {
      ...action,
      handler: (params) => actionRef.current.handler(params)
    };
    registerAction(wrappedAction);
    return () => unregisterAction(action.id);
  }, [action.id, action.name, action.description, JSON.stringify(action.parameters), registerAction, unregisterAction]);
}

export default AiUiContext;
