// GenAgenTa - Address Search Component

import { useState, useRef, useEffect } from 'react';
import { api } from '../utils/api';

interface GeoResult {
  formatted: string;
  lat: number;
  lng: number;
  type: string;
  relevance?: number;
}

interface AddressSearchProps {
  onSelect: (result: GeoResult) => void;
  placeholder?: string;
  style?: React.CSSProperties;
}

export function AddressSearch({
  onSelect,
  placeholder = 'Cerca indirizzo...',
  style,
}: AddressSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GeoResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced search
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (query.length < 3) {
      setResults([]);
      setShowResults(false);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const response = await api.geocodeSearch(query, 5);
        setResults(response.results || []);
        setShowResults(true);
        setSelectedIndex(-1);
      } catch (error) {
        console.error('Errore geocoding:', error);
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowResults(false);
        break;
    }
  };

  const handleSelect = (result: GeoResult) => {
    setQuery(result.formatted.split(',')[0]); // Solo la prima parte
    setShowResults(false);
    onSelect(result);
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        ...style,
      }}
    >
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length >= 3 && results.length > 0 && setShowResults(true)}
          placeholder={placeholder}
          style={{
            width: '100%',
            padding: '10px 36px 10px 12px',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            backgroundColor: 'var(--bg-primary)',
            color: 'var(--text-primary)',
            fontSize: '14px',
            outline: 'none',
          }}
        />
        {/* Search icon or loading */}
        <div
          style={{
            position: 'absolute',
            right: '10px',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'var(--text-secondary)',
            fontSize: '16px',
          }}
        >
          {isLoading ? (
            <span style={{ animation: 'spin 1s linear infinite' }}>...</span>
          ) : (
            <span>🔍</span>
          )}
        </div>
      </div>

      {/* Results dropdown */}
      {showResults && results.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            marginTop: '4px',
            maxHeight: '300px',
            overflowY: 'auto',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}
        >
          {results.map((result, index) => (
            <div
              key={index}
              onClick={() => handleSelect(result)}
              onMouseEnter={() => setSelectedIndex(index)}
              style={{
                padding: '10px 12px',
                cursor: 'pointer',
                backgroundColor:
                  index === selectedIndex
                    ? 'var(--bg-hover)'
                    : 'transparent',
                borderBottom:
                  index < results.length - 1
                    ? '1px solid var(--border)'
                    : 'none',
              }}
            >
              <div
                style={{
                  fontSize: '14px',
                  color: 'var(--text-primary)',
                  marginBottom: '2px',
                }}
              >
                {result.formatted.split(',')[0]}
              </div>
              <div
                style={{
                  fontSize: '12px',
                  color: 'var(--text-secondary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {result.formatted.split(',').slice(1).join(',')}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No results message */}
      {showResults && results.length === 0 && query.length >= 3 && !isLoading && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            marginTop: '4px',
            padding: '12px',
            textAlign: 'center',
            color: 'var(--text-secondary)',
            fontSize: '14px',
            zIndex: 1000,
          }}
        >
          Nessun risultato trovato
        </div>
      )}
    </div>
  );
}
