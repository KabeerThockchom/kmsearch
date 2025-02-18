import React, { useState, useRef } from 'react';
import { ExternalLink, ChevronDown, ChevronUp, Share2, X } from 'lucide-react';
import type { SearchResponse, Source } from '../types';
import { FeedbackForm } from './FeedbackForm';

interface SearchResultsProps {
  result: SearchResponse['result'];
}

interface SourcePreviewProps {
  source: Source;
  position?: { x: number; y: number };
}

function SourcePreview({ source, position }: SourcePreviewProps) {
  const truncateText = (text: string, wordLimit: number) => {
    const words = text.split(' ');
    if (words.length > wordLimit) {
      return words.slice(0, wordLimit).join(' ') + '...';
    }
    return text;
  };

  const style: React.CSSProperties = position
    ? {
        position: 'fixed',
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(10px, -50%)',
      }
    : {};

  return (
    <div 
      className="z-50 w-96 bg-white rounded-lg shadow-xl border border-gray-200 p-4"
      style={style}
    >
      <h4 className="font-medium text-gray-900 mb-2">{source.title}</h4>
      {source.date && (
        <p className="text-sm text-gray-500 mb-2">
          Published: {new Date(source.date).toLocaleDateString()}
        </p>
      )}
      <p className="text-sm text-gray-600 mb-3">
        {truncateText(source.excerpt, 50)}
      </p>
      <a
        href={source.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center text-sm text-red-600 hover:text-red-800"
      >
        View full document
        <ExternalLink className="w-4 h-4 ml-1" />
      </a>
    </div>
  );
}

export function SearchResults({ result }: SearchResultsProps) {
  const [isDetailExpanded, setIsDetailExpanded] = useState(false);
  const [previewSource, setPreviewSource] = useState<{
    source: Source;
    position?: { x: number; y: number };
  } | null>(null);

  const handleMouseEnter = (source: Source, event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setPreviewSource({
      source,
      position: {
        x: rect.right,
        y: rect.top + rect.height / 2,
      },
    });
  };

  const handleMouseLeave = () => {
    setPreviewSource(null);
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: 'Vanguard Knowledge Search Result',
        text: result.content.answer,
        url: window.location.href,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const renderContentWithLinkedCitations = (content: string) => {
    const parts = content.split(/(\[\d+\])/g);
    
    return parts.map((part, index) => {
      const citationMatch = part.match(/\[(\d+)\]/);
      if (citationMatch) {
        const sourceId = parseInt(citationMatch[1], 10);
        const source = result.sources.find(s => s.id === sourceId);
        
        if (source) {
          return (
            <button
              key={index}
              onMouseEnter={(e) => handleMouseEnter(source, e)}
              onMouseLeave={handleMouseLeave}
              className="text-red-600 hover:text-red-800 font-medium cursor-pointer"
            >
              {part}
            </button>
          );
        }
      }
      return <span key={index}>{part}</span>;
    });
  };

  return (
    <div className="w-full max-w-3xl space-y-6">
      {/* Answer Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Answer</h2>
          <button
            onClick={handleShare}
            className="p-2 text-gray-500 hover:text-red-600 rounded-full hover:bg-gray-50"
            aria-label="Share result"
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
        <div className="prose prose-red max-w-none">
          <p className="text-gray-700">
            {renderContentWithLinkedCitations(result.content.answer)}
          </p>
        </div>

        {/* Feedback Form */}
        <FeedbackForm runId={result.run_id} />
      </div>

      {/* Detailed Explanation Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <button
          onClick={() => setIsDetailExpanded(!isDetailExpanded)}
          className="w-full px-6 py-4 flex justify-between items-center text-left"
        >
          <h2 className="text-lg font-semibold text-gray-900">Detailed Explanation</h2>
          {isDetailExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>
        {isDetailExpanded && (
          <div className="px-6 pb-6">
            <div className="prose prose-red max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap">
                {renderContentWithLinkedCitations(result.content.reasoning)}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Sources Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Sources</h2>
        <div className="space-y-4">
          {result.sources.map((source) => (
            <div key={source.id} className="relative border-b border-gray-100 last:border-0 pb-4 last:pb-0">
              <div className="flex items-start justify-between gap-4">
                <button
                  onMouseEnter={(e) => handleMouseEnter(source, e)}
                  onMouseLeave={handleMouseLeave}
                  className="font-medium text-gray-900 text-left hover:text-red-600"
                >
                  [{source.id}] {source.title}
                </button>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-sm text-red-600 hover:text-red-800"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>View</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating Source Preview */}
      {previewSource && (
        <SourcePreview
          source={previewSource.source}
          position={previewSource.position}
        />
      )}
    </div>
  );
}