import React, { useState, useRef } from 'react';
import { Search, X } from 'lucide-react';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { SearchHistory } from '../types';

interface SearchInputProps {
  onSearch: (query: string) => void;
  isLoading: boolean;
  searchHistory: SearchHistory[];
}

export function SearchInput({ onSearch, isLoading, searchHistory }: SearchInputProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isLoading) {
      onSearch(query.trim());
    }
  };

  const clearSearch = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      clearSearch();
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const now = new Date();
    const date = new Date(timestamp);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 24) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
    }
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="w-full max-w-3xl space-y-3">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about Vanguard's products, services, or investment strategies..."
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
              <Search className="w-5 h-5" />
              <AutoAwesomeIcon 
                className="w-4 h-4 animate-simple-sparkle text-red-600"
                style={{ fontSize: '1rem' }}
              />
            </div>
          </button>
        </div>
      </form>

      {searchHistory.length > 0 && !query && (
        <div className="flex flex-wrap gap-2 px-1">
          {searchHistory.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                setQuery(item.query);
                onSearch(item.query);
              }}
              className="group flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-full hover:border-red-200 hover:bg-red-50 transition-colors"
            >
              <span className="text-sm text-gray-600 group-hover:text-red-600 truncate max-w-[200px]">
                {item.query}
              </span>
              <span className="text-xs text-gray-400 group-hover:text-red-500">
                {formatTimestamp(item.timestamp)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}