export interface Source {
  id: number;
  title: string;
  url: string;
  excerpt: string;
  date?: string;
  type?: string;
}

export interface SearchResponse {
  status: string;
  query: string;
  result: {
    content: {
      answer: string;
      reasoning: string;
    };
    sources: Source[];
    run_id: string;
  };
}

export interface SearchError {
  status: string;
  error: string;
}

export interface SearchHistory {
  query: string;
  timestamp: number;
}