import React, { useState, useRef } from 'react';
import { Search, X, History } from 'lucide-react';

import { SearchHistory } from '../types';

interface SearchInputProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
  searchHistory: SearchHistory[];
}

export function SearchInput({ onSearch, isLoading, searchHistory }: SearchInputProps) {
  const [query, setQuery] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch(query.trim());
      setShowHistory(false);
    }
  };

  const clearSearch = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      clearSearch();
      setShowHistory(false);
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="w-full max-w-3xl">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowHistory(true)}
            onBlur={() => setTimeout(() => setShowHistory(false), 200)}
            onKeyDown={handleKeyDown}
            placeholder="Search in natural language..."
            aria-label="Search query"
            className="w-full px-4 py-4 pr-24 text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
            disabled={isLoading}
          />
          {query && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-14 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gray-500 hover:text-red-600 disabled:opacity-50 disabled:hover:text-gray-500 transition-colors"
            aria-label="Submit search"
          >
            <div className="relative flex items-center gap-1">
              <Search className="w-6 h-6" />
            </div>
          </button>
        </div>
      </form>

      {searchHistory.length > 0 && showHistory && !query && (
        <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200">
          <div className="p-3 flex items-center gap-2 border-b border-gray-100">
            <History className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-600">Previous Searches</span>
          </div>
          <ul className="py-1">
            {searchHistory.map((item, index) => (
              <li key={index}>
                <button
                  className="w-full px-4 py-2 text-left hover:bg-gray-50 flex justify-between items-center group"
                  onClick={() => {
                    setQuery(item.query);
                    onSearch(item.query);
                  }}
                >
                  <span className="text-gray-700">{item.query}</span>
                  <span className="text-xs text-gray-400 group-hover:text-gray-600">
                    {formatTimestamp(item.timestamp)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}