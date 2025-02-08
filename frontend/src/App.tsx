import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { SearchInput } from './components/SearchInput';
import { SearchResults } from './components/SearchResults';
import { SearchProcess } from './components/SearchProcess';
import { SearchResponse, SearchError, SearchHistory } from './types';
import { v4 as uuidv4 } from 'uuid';

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchResult, setSearchResult] = useState<SearchResponse | null>(null);
  const [searchHistory, setSearchHistory] = useState<SearchHistory[]>([]);
  const [sessionId, setSessionId] = useState<string>('');

  // Load search history from localStorage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem('searchHistory');
    if (savedHistory) {
      setSearchHistory(JSON.parse(savedHistory));
    }
  }, []);

  const handleSearch = async (query: string) => {
    setIsLoading(true);
    setError(null);
    setSearchResult(null);
    
    // Generate a new session ID for this search
    const newSessionId = uuidv4();
    setSessionId(newSessionId);

    try {
      const response = await fetch('https://vgkmpoc.fly.dev/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          query,
          sessionId: newSessionId
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorData = data as SearchError;
        throw new Error(errorData.error || 'An error occurred while searching');
      }

      setSearchResult(data as SearchResponse);

      // Add to search history
      const newHistory = [
        { query, timestamp: Date.now() },
        ...searchHistory.filter(h => h.query !== query).slice(0, 4)
      ];
      setSearchHistory(newHistory);
      localStorage.setItem('searchHistory', JSON.stringify(newHistory));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while searching');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col items-center gap-8">
          {/* Hero Section */}
          <div className="text-center max-w-2xl">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Knowledge Search
            </h1>
            <p className="text-lg text-gray-600">
              Get instant answers about Vanguard's products, services, and investment strategies
            </p>
          </div>

          {/* Search Section */}
          <SearchInput
            onSearch={handleSearch}
            isLoading={isLoading}
            searchHistory={searchHistory}
          />

          {/* Search Process */}
          <SearchProcess
            sessionId={sessionId}
            isSearching={isLoading}
          />

          {/* Error State */}
          {error && (
            <div className="w-full max-w-3xl p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex gap-2 text-red-700">
                <span className="font-medium">Error:</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Results */}
          {searchResult && !isLoading && !error && (
            <SearchResults result={searchResult.result} />
          )}
        </div>
      </main>
    </div>
  );
}

export default App