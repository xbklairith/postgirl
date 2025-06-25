export interface Collection {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  folder_path?: string;
  git_branch?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Request {
  id: string;
  collection_id: string;
  name: string;
  description?: string;
  method: string;
  url: string;
  headers: string; // JSON string
  body?: string;
  body_type: string;
  auth_type?: string;
  auth_config?: string; // JSON string
  follow_redirects: boolean;
  timeout_ms: number;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface CreateCollectionRequest {
  workspace_id: string;
  name: string;
  description?: string;
  folder_path?: string;
  git_branch?: string;
}

export interface UpdateCollectionRequest {
  id: string;
  name?: string;
  description?: string;
  folder_path?: string;
  git_branch?: string;
  is_active?: boolean;
}

export interface CreateRequestRequest {
  collection_id: string;
  name: string;
  description?: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: string;
  body_type?: string;
  auth_type?: string;
  auth_config?: Record<string, any>;
  follow_redirects?: boolean;
  timeout_ms?: number;
  order_index?: number;
}

export interface UpdateRequestRequest {
  id: string;
  collection_id?: string;
  name?: string;
  description?: string;
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: string;
  body_type?: string;
  auth_type?: string;
  auth_config?: Record<string, any>;
  follow_redirects?: boolean;
  timeout_ms?: number;
  order_index?: number;
}

export interface CollectionSummary {
  id: string;
  workspace_id: string;
  name: string;
  description?: string;
  folder_path?: string;
  git_branch?: string;
  is_active: boolean;
  request_count: number;
  created_at: string;
  updated_at: string;
}

// Helper types for frontend use
export interface RequestWithHeaders extends Omit<Request, 'headers' | 'auth_config'> {
  headers: Record<string, string>;
  auth_config?: Record<string, any>;
}

export type RequestBodyType = 'json' | 'form' | 'raw' | 'none';
export type AuthType = 'none' | 'bearer' | 'basic' | 'api_key';

export const REQUEST_BODY_TYPES: Record<RequestBodyType, string> = {
  json: 'JSON',
  form: 'Form Data',
  raw: 'Raw Text',
  none: 'No Body'
};

export const AUTH_TYPES: Record<AuthType, string> = {
  none: 'No Auth',
  bearer: 'Bearer Token',
  basic: 'Basic Auth',
  api_key: 'API Key'
};

// Utility functions
export function parseRequestHeaders(headers: string): Record<string, string> {
  try {
    return JSON.parse(headers || '{}');
  } catch {
    return {};
  }
}

export function parseAuthConfig(auth_config: string | undefined): Record<string, any> {
  if (!auth_config) return {};
  try {
    return JSON.parse(auth_config);
  } catch {
    return {};
  }
}

export function createDefaultCollection(workspace_id: string): CreateCollectionRequest {
  return {
    workspace_id,
    name: 'New Collection',
    description: '',
  };
}

export function createDefaultRequest(collection_id: string): CreateRequestRequest {
  return {
    collection_id,
    name: 'New Request',
    method: 'GET',
    url: '',
    headers: {},
    body_type: 'json',
    follow_redirects: true,
    timeout_ms: 30000,
    order_index: 0,
  };
}