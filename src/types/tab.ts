import type { HttpRequest, HttpResponse, HttpError } from './http';
import type { Request } from './collection';

export interface RequestTab {
  /** Unique identifier for the tab */
  id: string;
  
  /** ID of the request from collection (if opened from collection) */
  requestId?: string;
  
  /** Collection ID this request belongs to */
  collectionId?: string;
  
  /** Display name for the tab */
  name: string;
  
  /** The HTTP request data */
  request: HttpRequest;
  
  /** Response data if request has been executed */
  response?: HttpResponse;
  
  /** Error data if request failed */
  error?: HttpError;
  
  /** Whether this tab is currently active */
  isActive: boolean;
  
  /** Whether the request has unsaved changes */
  hasUnsavedChanges: boolean;
  
  /** Whether the request is currently being executed */
  isLoading: boolean;
  
  /** When the tab was last saved */
  lastSaved?: Date;
  
  /** Whether the tab is pinned (can't be easily closed) */
  isPinned: boolean;
  
  /** When the tab was created */
  createdAt: Date;
  
  /** When the tab was last accessed */
  lastAccessedAt: Date;
}

export interface TabStore {
  /** Array of all open tabs */
  tabs: RequestTab[];
  
  /** ID of the currently active tab */
  activeTabId: string | null;
  
  /** Maximum number of tabs allowed */
  maxTabs: number;
  
  /** Next tab ID counter for generating unique IDs */
  nextTabId: number;
  
  // Tab Management Actions
  
  /** Open a new tab with a request */
  openTab: (request: Request, makeActive?: boolean) => string;
  
  /** Open a new blank tab */
  openBlankTab: (makeActive?: boolean) => string;
  
  /** Close a specific tab */
  closeTab: (tabId: string) => boolean;
  
  /** Switch to a specific tab */
  switchTab: (tabId: string) => boolean;
  
  /** Update a tab's data */
  updateTab: (tabId: string, updates: Partial<RequestTab>) => boolean;
  
  /** Update the request data for a tab */
  updateTabRequest: (tabId: string, request: Partial<HttpRequest>) => boolean;
  
  /** Set the response for a tab */
  setTabResponse: (tabId: string, response: HttpResponse) => boolean;
  
  /** Set an error for a tab */
  setTabError: (tabId: string, error: HttpError) => boolean;
  
  /** Mark a tab as having unsaved changes */
  markTabUnsaved: (tabId: string) => boolean;
  
  /** Mark a tab as saved */
  markTabSaved: (tabId: string) => boolean;
  
  /** Set loading state for a tab */
  setTabLoading: (tabId: string, isLoading: boolean) => boolean;
  
  /** Duplicate an existing tab */
  duplicateTab: (tabId: string) => string | null;
  
  /** Pin or unpin a tab */
  toggleTabPin: (tabId: string) => boolean;
  
  /** Close all tabs */
  closeAllTabs: () => void;
  
  /** Close all tabs except the specified one */
  closeOtherTabs: (tabId: string) => void;
  
  /** Close all unpinned tabs */
  closeUnpinnedTabs: () => void;
  
  /** Get a tab by ID */
  getTab: (tabId: string) => RequestTab | null;
  
  /** Get the active tab */
  getActiveTab: () => RequestTab | null;
  
  /** Check if a request is already open in a tab */
  findTabByRequestId: (requestId: string) => RequestTab | null;
  
  /** Reorder tabs */
  reorderTabs: (oldIndex: number, newIndex: number) => void;
  
  /** Update last accessed time for a tab */
  updateTabAccess: (tabId: string) => boolean;
  
  // Session Management
  
  /** Save tab state to localStorage */
  saveSession: () => void;
  
  /** Restore tab state from localStorage */
  restoreSession: () => void;
  
  /** Clear session data */
  clearSession: () => void;
}

export interface TabContextMenuAction {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: (tabId: string) => void;
  disabled?: boolean;
  separator?: boolean;
}

export interface TabKeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
}

// Helper types for tab operations
export type TabCreateOptions = {
  makeActive?: boolean;
  pin?: boolean;
  name?: string;
};

export type TabUpdatePayload = Partial<Omit<RequestTab, 'id' | 'createdAt'>>;

// Constants
export const TAB_CONSTANTS = {
  MAX_TABS_DEFAULT: 10,
  MAX_TAB_NAME_LENGTH: 50,
  SESSION_STORAGE_KEY: 'postgirl_tab_session',
  AUTO_SAVE_DEBOUNCE_MS: 1000,
  INACTIVE_TAB_CLEANUP_HOURS: 24,
} as const;

// Utility functions
export function createDefaultHttpRequest(): HttpRequest {
  return {
    id: crypto.randomUUID(),
    name: 'New Request',
    method: 'GET',
    url: '',
    headers: {},
    body: { type: 'none' },
    followRedirects: true,
    timeoutMs: 30000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

export function createTabFromRequest(request: Request): Omit<RequestTab, 'id' | 'createdAt' | 'lastAccessedAt'> {
  const httpRequest: HttpRequest = {
    id: request.id,
    name: request.name,
    method: request.method as any,
    url: request.url,
    headers: JSON.parse(request.headers || '{}'),
    body: request.body ? { type: 'raw', content: request.body, contentType: 'text/plain' } : { type: 'none' },
    followRedirects: request.follow_redirects,
    timeoutMs: request.timeout_ms,
    createdAt: request.created_at,
    updatedAt: request.updated_at,
  };

  return {
    requestId: request.id,
    collectionId: request.collection_id,
    name: request.name,
    request: httpRequest,
    isActive: false,
    hasUnsavedChanges: false,
    isLoading: false,
    isPinned: false,
  };
}

export function createBlankTab(): Omit<RequestTab, 'id' | 'createdAt' | 'lastAccessedAt'> {
  return {
    name: 'New Request',
    request: createDefaultHttpRequest(),
    isActive: false,
    hasUnsavedChanges: true, // New blank tab starts as unsaved
    isLoading: false,
    isPinned: false,
  };
}

export function generateTabId(): string {
  return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function truncateTabName(name: string, maxLength: number = TAB_CONSTANTS.MAX_TAB_NAME_LENGTH): string {
  if (name.length <= maxLength) return name;
  return name.slice(0, maxLength - 3) + '...';
}