import React, { useEffect, useState } from 'react';
import { Brain, Search, FileText, Check, Loader2, AlertCircle, File } from 'lucide-react';

interface SearchProcessProps {
  sessionId: string;
  isSearching: boolean;
}

interface ProcessStep {
  step: string;
  details?: string;
  timestamp: string;
}

interface SubQuery {
  text: string;
  visible: boolean;
}

export function SearchProcess({ sessionId, isSearching }: SearchProcessProps) {
  const [steps, setSteps] = useState<ProcessStep[]>([]);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [subQueries, setSubQueries] = useState<SubQuery[]>([]);
  const [documents, setDocuments] = useState<{ count: number; visible: boolean }>({ count: 0, visible: false });

  useEffect(() => {
    if (!isSearching || !sessionId) return;

    const eventSource = new EventSource(`https://vgkmpoc.fly.dev/stream?id=${sessionId}`);
    
    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      if (data.type === 'keepalive') return;
      
      if (data.type === 'log') {
        setSteps(prev => [...prev, {
          step: data.step,
          details: data.details,
          timestamp: data.timestamp
        }]);
        setCurrentStep(data.step);

        // Handle sub-queries
        if (data.step === 'Sub-queries' && data.details) {
          try {
            // The details will be a string representation of an array
            const detailsStr = data.details.replace(/'/g, '"'); // Replace single quotes with double quotes
            const queries = JSON.parse(detailsStr);
            
            if (Array.isArray(queries)) {
              // Convert to SubQuery objects
              const subQueries = queries.map(text => ({
                text: text.replace(/^\d+\.\s*/, ''), // Remove the numbering
                visible: false
              }));
              
              setSubQueries(subQueries);
              
              // Animate sub-queries appearing one by one
              subQueries.forEach((_, index) => {
                setTimeout(() => {
                  setSubQueries(prev => prev.map((q, i) => 
                    i === index ? { ...q, visible: true } : q
                  ));
                }, index * 500);
              });
            }
          } catch (error) {
            console.error('Error processing sub-queries:', error);
          }
        }

        // Handle document results
        if (data.step === 'Search complete' && data.details) {
          const match = data.details.match(/Found (\d+) documents/);
          if (match) {
            const count = parseInt(match[1], 10);
            setDocuments({ count, visible: true });
          }
        }
      }
    };

    eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      setError('Connection lost. Please try again.');
      eventSource.close();
    };

    return () => {
      eventSource.close();
      setSteps([]);
      setCurrentStep('');
      setError(null);
      setSubQueries([]);
      setDocuments({ count: 0, visible: false });
    };
  }, [sessionId, isSearching]);

  if (!isSearching) return null;
  if (error) {
    return (
      <div className="w-full max-w-3xl p-4 bg-red-50 rounded-lg border border-red-200">
        <div className="flex items-center gap-2 text-red-700">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-6">Search Progress</h2>
      
      <div className="space-y-4">
        {/* Query Analysis Step */}
        <ProcessStep
          icon={<Brain className="w-5 h-5" />}
          title="Analyzing Your Question"
          isActive={currentStep.includes('Breaking down query')}
          isComplete={steps.some(s => s.step.includes('Query breakdown complete'))}
        >
          <div className="mt-2 space-y-2">
            {subQueries.map((query, i) => (
              <div
                key={i}
                className={`
                  text-sm text-gray-600 bg-gray-50 p-2 rounded flex items-center gap-2
                  transition-all duration-500 ease-in-out
                  ${query.visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
                `}
              >
                <Search className="w-4 h-4 text-red-600" />
                <span>{query.text}</span>
              </div>
            ))}
          </div>
        </ProcessStep>

        {/* Document Search Step */}
        <ProcessStep
          icon={<FileText className="w-5 h-5" />}
          title="Finding Relevant Information"
          isActive={currentStep.includes('Searching for relevant documents')}
          isComplete={steps.some(s => s.step.includes('Search complete'))}
        >
          {documents.visible && (
            <div className="mt-4 flex flex-wrap gap-2">
              {Array.from({ length: documents.count }).map((_, i) => (
                <div
                  key={i}
                  className={`
                    transition-all duration-300 ease-out
                    animate-pop-in
                  `}
                  style={{
                    animationDelay: `${i * 150}ms`
                  }}
                >
                  <File className="w-5 h-5 text-red-600" />
                </div>
              ))}
            </div>
          )}
          {steps
            .filter(s => s.step.includes('Search complete'))
            .map((s, idx) => (
              <div key={idx} className="mt-2">
                <div className="text-sm text-gray-600">{s.details}</div>
              </div>
            ))}
        </ProcessStep>

        {/* Answer Generation Step */}
        <ProcessStep
          icon={<Check className="w-5 h-5" />}
          title="Generating Answer"
          isActive={currentStep.includes('Generating comprehensive answer')}
          isComplete={steps.some(s => s.step.includes('Answer generation complete'))}
        />
      </div>
    </div>
  );
}

interface ProcessStepProps {
  icon: React.ReactNode;
  title: string;
  isActive: boolean;
  isComplete: boolean;
  children?: React.ReactNode;
}

function ProcessStep({ icon, title, isActive, isComplete, children }: ProcessStepProps) {
  return (
    <div 
      className={`
        relative rounded-lg border p-4 transition-colors duration-300
        ${isActive ? 'border-red-200 bg-red-50' : 'border-gray-200'}
        ${isComplete ? 'border-red-200 bg-red-50' : ''}
      `}
    >
      <div className="flex items-center gap-3">
        <div 
          className={`
            p-2 rounded-full transition-colors duration-300
            ${isActive ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-600'}
            ${isComplete ? 'bg-red-100 text-red-600' : ''}
          `}
        >
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{title}</h3>
          {isActive && (
            <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>In progress...</span>
            </div>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}