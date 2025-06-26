export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';

export interface HttpRequest {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body?: RequestBody;
  timeoutMs?: number;
  followRedirects: boolean;
  createdAt: string;
  updatedAt: string;
}

export type RequestBody = 
  | { type: 'none' }
  | { type: 'raw'; content: string; contentType: string }
  | { type: 'json'; data: any; content: string }
  | { type: 'formData'; fields: Record<string, string> }
  | { type: 'formUrlEncoded'; fields: Record<string, string> }
  | { type: 'binary'; data: number[]; contentType: string };

export interface HttpResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: ResponseBody;
  timing: ResponseTiming;
  requestId: string;
  timestamp: string;
}

export type ResponseBody = 
  | { type: 'text'; content: string }
  | { type: 'json'; data: any }
  | { type: 'binary'; data: number[]; size: number }
  | { type: 'empty' };

export interface ResponseTiming {
  totalTimeMs: number;
  dnsLookupMs?: number;
  tcpConnectMs?: number;
  tlsHandshakeMs?: number;
  firstByteMs?: number;
  downloadMs?: number;
}

export interface HttpError {
  errorType: HttpErrorType;
  message: string;
  details?: string;
  timestamp: string;
}

export type HttpErrorType = 
  | 'networkError'
  | 'timeoutError' 
  | 'sslError'
  | 'invalidUrl'
  | 'invalidRequest'
  | 'invalidResponse'
  | 'unknownError';

export interface ExecuteRequestRequest {
  request: HttpRequest;
  environmentVariables?: Record<string, string>;
}

export interface ExecuteRequestResponse {
  response?: HttpResponse;
  error?: HttpError;
  requestId: string;
}

// Helper types for UI
export interface RequestTab {
  id: string;
  name: string;
  request: HttpRequest;
  response?: HttpResponse;
  error?: HttpError;
  isLoading: boolean;
  isSaved: boolean;
}

export interface HttpCollection {
  id: string;
  name: string;
  description?: string;
  requests: HttpRequest[];
  folders: HttpFolder[];
  createdAt: string;
  updatedAt: string;
}

export interface HttpFolder {
  id: string;
  name: string;
  description?: string;
  requests: HttpRequest[];
  folders: HttpFolder[];
  parentId?: string;
}

// Constants
export const HTTP_METHODS: HttpMethod[] = [
  'GET',
  'POST', 
  'PUT',
  'DELETE',
  'PATCH',
  'HEAD',
  'OPTIONS'
];

export const CONTENT_TYPES = [
  'application/json',
  'application/xml',
  'text/plain',
  'text/html',
  'application/x-www-form-urlencoded',
  'multipart/form-data',
  'application/octet-stream',
  'application/javascript',
  'text/css',
  'text/csv',
  'image/jpeg',
  'image/png',
  'image/gif'
] as const;

export const BODY_TYPE_CONTENT_TYPE_MAP: Record<string, string> = {
  'json': 'application/json',
  'formData': 'multipart/form-data',
  'formUrlEncoded': 'application/x-www-form-urlencoded',
  'raw': 'text/plain'
};

export const HTTP_STATUS_CATEGORIES = {
  INFORMATIONAL: { min: 100, max: 199, color: 'blue' },
  SUCCESS: { min: 200, max: 299, color: 'green' },
  REDIRECTION: { min: 300, max: 399, color: 'yellow' },
  CLIENT_ERROR: { min: 400, max: 499, color: 'orange' },
  SERVER_ERROR: { min: 500, max: 599, color: 'red' }
} as const;

// Helper functions
export function getStatusCategory(status: number) {
  for (const [category, { min, max }] of Object.entries(HTTP_STATUS_CATEGORIES)) {
    if (status >= min && status <= max) {
      return category;
    }
  }
  return 'UNKNOWN';
}

export function getStatusColor(status: number): string {
  const category = getStatusCategory(status);
  return HTTP_STATUS_CATEGORIES[category as keyof typeof HTTP_STATUS_CATEGORIES]?.color || 'gray';
}

export function getMethodColor(method: HttpMethod): string {
  const colors: Record<HttpMethod, string> = {
    GET: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    POST: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    PUT: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
    DELETE: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    PATCH: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
    HEAD: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300',
    OPTIONS: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  };
  return colors[method] || 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
}

export function createDefaultRequest(): HttpRequest {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: 'New Request',
    method: 'GET',
    url: 'https://httpbin.org/get',
    headers: {},
    followRedirects: true,
    timeoutMs: 30000,
    createdAt: now,
    updatedAt: now
  };
}

export function formatResponseTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  } else {
    const minutes = Math.floor(ms / 60000);
    const seconds = ((ms % 60000) / 1000).toFixed(0);
    return `${minutes}m ${seconds}s`;
  }
}

export function formatResponseSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  } else {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  }
}

// URL enhancement utilities
export function enhanceUrl(url: string): string {
  if (!url.trim()) return url;
  
  // Already has protocol
  if (url.match(/^https?:\/\//)) return url;
  
  // Local development (use HTTP)
  if (url.match(/^(localhost|127\.0\.0\.1|192\.168\.|10\.|172\.)/)) {
    return `http://${url}`;
  }
  
  // Everything else gets HTTPS
  return `https://${url}`;
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(enhanceUrl(url));
    return true;
  } catch {
    return false;
  }
}

// Body validation utilities
export function validateJsonBody(content: string): { isValid: boolean; error?: string } {
  if (!content.trim()) {
    return { isValid: true };
  }
  
  try {
    JSON.parse(content);
    return { isValid: true };
  } catch (error) {
    return { 
      isValid: false, 
      error: error instanceof Error ? error.message : 'Invalid JSON format'
    };
  }
}

export function getContentTypeForBody(body: RequestBody): string {
  switch (body.type) {
    case 'json':
      return 'application/json';
    case 'formData':
      return 'multipart/form-data';
    case 'formUrlEncoded':
      return 'application/x-www-form-urlencoded';
    case 'raw':
      return body.contentType || 'text/plain';
    case 'binary':
      return body.contentType || 'application/octet-stream';
    default:
      return 'text/plain';
  }
}

export function bodyToString(body: RequestBody): string {
  switch (body.type) {
    case 'none':
      return '';
    case 'raw':
      return body.content;
    case 'json':
      // Use the raw content if available, otherwise stringify the data
      return body.content || JSON.stringify(body.data);
    case 'formData':
    case 'formUrlEncoded':
      return Object.entries(body.fields)
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
        .join('&');
    case 'binary':
      return '[Binary Data]';
    default:
      return '';
  }
}