export interface QueryRequest {
  question: string;
  visualization_type?: string;
}

export interface QueryResponse {
  query_id: string;
  question: string;
  sql_query?: string;
  explanation: string;
  summary?: string; // Add this new field
  data?: any[];
  visualization?: { [key: string]: string };
  timestamp: string;
  response_type: string;
}

export interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
  status: 'sending' | 'sent' | 'error';
  sqlQuery?: string;
  explanation?: string;
  summary?: string; // Add this new field
  data?: any[];
  error?: string;
  queryResponse?: QueryResponse;
  isRetryable?: boolean
  isEditable?: boolean
}

export interface ChatHistory {
  query_id: string;
  question: string;
  sql_query?: string;
  response_type: string;
  timestamp: string;
}


export interface QueryHistory {
  id: string;
  query: string;
  timestamp: Date;
  isBookmarked: boolean;
  sqlQuery?: string;
  data?: any[];
}

export interface ChartConfig {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'heatmap' | 'map' | 'stacked-bar' | 'donut';
  title: string;
  xAxis?: string;
  yAxis?: string;
  data: any[];
}

export interface BookmarkRequest {
  query_id: string;
  question: string;
}

export interface FeedbackRequest {
  query_id: string;
  rating: number;
  feedback?: string;
  helpful: boolean;
}