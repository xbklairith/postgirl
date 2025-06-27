import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { 
  RequestTab, 
  TabStore
} from '../types/tab';
import { TAB_CONSTANTS } from '../types/tab';
import type { Request } from '../types/collection';
import type { HttpRequest, HttpResponse, HttpError } from '../types/http';
import { 
  createTabFromRequest, 
  createBlankTab, 
  generateTabId
} from '../types/tab';

interface RequestTabState extends TabStore {
  // Additional state for UI interactions
  draggedTabId: string | null;
  
  // UI Actions
  setDraggedTab: (tabId: string | null) => void;
}

export const useRequestTabStore = create<RequestTabState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    tabs: [],
    activeTabId: null,
    maxTabs: TAB_CONSTANTS.MAX_TABS_DEFAULT,
    nextTabId: 1,
    draggedTabId: null,

    // Tab Management Actions
    openTab: (request: Request, makeActive = true): string => {
      const state = get();
      
      // Check if request is already open
      const existingTab = state.findTabByRequestId(request.id);
      if (existingTab) {
        if (makeActive) {
          state.switchTab(existingTab.id);
        }
        return existingTab.id;
      }
      
      // Check tab limit
      if (state.tabs.length >= state.maxTabs) {
        // Close oldest unpinned tab to make room
        const unpinnedTabs = state.tabs.filter(tab => !tab.isPinned);
        if (unpinnedTabs.length > 0) {
          const oldestTab = unpinnedTabs.reduce((oldest, current) => 
            current.lastAccessedAt < oldest.lastAccessedAt ? current : oldest
          );
          state.closeTab(oldestTab.id);
        } else {
          // All tabs are pinned, can't open new tab
          console.warn('Cannot open new tab: maximum limit reached and all tabs are pinned');
          return '';
        }
      }
      
      const tabId = generateTabId();
      const now = new Date();
      
      const newTab: RequestTab = {
        id: tabId,
        ...createTabFromRequest(request),
        isActive: makeActive,
        createdAt: now,
        lastAccessedAt: now,
      };
      
      set(state => ({
        tabs: makeActive 
          ? [...state.tabs.map(t => ({ ...t, isActive: false })), newTab]
          : [...state.tabs, newTab],
        activeTabId: makeActive ? tabId : state.activeTabId,
        nextTabId: state.nextTabId + 1,
      }));
      
      // Auto-save session
      get().saveSession();
      
      return tabId;
    },

    openBlankTab: (makeActive = true): string => {
      const state = get();
      
      // Check tab limit
      if (state.tabs.length >= state.maxTabs) {
        const unpinnedTabs = state.tabs.filter(tab => !tab.isPinned);
        if (unpinnedTabs.length > 0) {
          const oldestTab = unpinnedTabs.reduce((oldest, current) => 
            current.lastAccessedAt < oldest.lastAccessedAt ? current : oldest
          );
          state.closeTab(oldestTab.id);
        } else {
          console.warn('Cannot open new tab: maximum limit reached and all tabs are pinned');
          return '';
        }
      }
      
      const tabId = generateTabId();
      const now = new Date();
      
      const newTab: RequestTab = {
        id: tabId,
        ...createBlankTab(),
        isActive: makeActive,
        createdAt: now,
        lastAccessedAt: now,
      };
      
      set(state => ({
        tabs: makeActive 
          ? [...state.tabs.map(t => ({ ...t, isActive: false })), newTab]
          : [...state.tabs, newTab],
        activeTabId: makeActive ? tabId : state.activeTabId,
        nextTabId: state.nextTabId + 1,
      }));
      
      get().saveSession();
      
      return tabId;
    },

    closeTab: (tabId: string): boolean => {
      const state = get();
      const tab = state.getTab(tabId);
      
      if (!tab) return false;
      
      // Check if tab has unsaved changes (you might want to show a warning dialog here)
      if (tab.hasUnsavedChanges) {
        // For now, we'll just close it. In a real implementation, 
        // you'd show a confirmation dialog
        console.warn(`Closing tab "${tab.name}" with unsaved changes`);
      }
      
      const newTabs = state.tabs.filter(t => t.id !== tabId);
      let newActiveTabId = state.activeTabId;
      
      // If we're closing the active tab, switch to another tab
      if (state.activeTabId === tabId) {
        if (newTabs.length > 0) {
          // Try to switch to the next tab, or the previous one if this was the last
          const currentIndex = state.tabs.findIndex(t => t.id === tabId);
          const nextIndex = currentIndex < newTabs.length ? currentIndex : currentIndex - 1;
          newActiveTabId = nextIndex >= 0 ? newTabs[nextIndex].id : null;
        } else {
          newActiveTabId = null;
        }
      }
      
      set({
        tabs: newTabs,
        activeTabId: newActiveTabId,
      });
      
      get().saveSession();
      
      return true;
    },

    switchTab: (tabId: string): boolean => {
      const state = get();
      const tab = state.getTab(tabId);
      
      if (!tab) return false;
      
      // Update the active tab and last accessed time
      set(state => ({
        activeTabId: tabId,
        tabs: state.tabs.map(t => 
          t.id === tabId 
            ? { ...t, isActive: true, lastAccessedAt: new Date() }
            : { ...t, isActive: false }
        ),
      }));
      
      return true;
    },

    updateTab: (tabId: string, updates: Partial<RequestTab>): boolean => {
      const state = get();
      const tabIndex = state.tabs.findIndex(t => t.id === tabId);
      
      if (tabIndex === -1) return false;
      
      set(state => ({
        tabs: state.tabs.map((tab, index) => 
          index === tabIndex 
            ? { ...tab, ...updates }
            : tab
        ),
      }));
      
      get().saveSession();
      
      return true;
    },

    updateTabRequest: (tabId: string, request: Partial<HttpRequest>): boolean => {
      const state = get();
      const tabIndex = state.tabs.findIndex(t => t.id === tabId);
      
      if (tabIndex === -1) return false;
      
      set(state => ({
        tabs: state.tabs.map((tab, index) => 
          index === tabIndex 
            ? { 
                ...tab, 
                request: { ...tab.request, ...request },
                hasUnsavedChanges: true,
                lastAccessedAt: new Date(),
              }
            : tab
        ),
      }));
      
      return true;
    },

    setTabResponse: (tabId: string, response: HttpResponse): boolean => {
      return get().updateTab(tabId, { 
        response, 
        error: undefined, 
        isLoading: false 
      });
    },

    setTabError: (tabId: string, error: HttpError): boolean => {
      return get().updateTab(tabId, { 
        error, 
        response: undefined, 
        isLoading: false 
      });
    },

    markTabUnsaved: (tabId: string): boolean => {
      return get().updateTab(tabId, { hasUnsavedChanges: true });
    },

    markTabSaved: (tabId: string): boolean => {
      return get().updateTab(tabId, { 
        hasUnsavedChanges: false, 
        lastSaved: new Date() 
      });
    },

    setTabLoading: (tabId: string, isLoading: boolean): boolean => {
      return get().updateTab(tabId, { isLoading });
    },

    duplicateTab: (tabId: string): string | null => {
      const state = get();
      const originalTab = state.getTab(tabId);
      
      if (!originalTab) return null;
      
      // Check tab limit
      if (state.tabs.length >= state.maxTabs) {
        console.warn('Cannot duplicate tab: maximum limit reached');
        return null;
      }
      
      const newTabId = generateTabId();
      const now = new Date();
      
      const duplicatedTab: RequestTab = {
        ...originalTab,
        id: newTabId,
        name: `${originalTab.name} (Copy)`,
        isActive: false,
        hasUnsavedChanges: true, // Duplicated tab starts as unsaved
        createdAt: now,
        lastAccessedAt: now,
        // Clear response/error from original
        response: undefined,
        error: undefined,
        isLoading: false,
      };
      
      set(state => ({
        tabs: [...state.tabs, duplicatedTab],
        nextTabId: state.nextTabId + 1,
      }));
      
      get().saveSession();
      
      return newTabId;
    },

    toggleTabPin: (tabId: string): boolean => {
      const state = get();
      const tab = state.getTab(tabId);
      
      if (!tab) return false;
      
      return state.updateTab(tabId, { isPinned: !tab.isPinned });
    },

    closeAllTabs: (): void => {
      set({
        tabs: [],
        activeTabId: null,
      });
      
      get().saveSession();
    },

    closeOtherTabs: (tabId: string): void => {
      const state = get();
      const keepTab = state.getTab(tabId);
      
      if (!keepTab) return;
      
      set({
        tabs: [keepTab],
        activeTabId: tabId,
      });
      
      get().saveSession();
    },

    closeUnpinnedTabs: (): void => {
      const state = get();
      const pinnedTabs = state.tabs.filter(tab => tab.isPinned);
      
      let newActiveTabId = state.activeTabId;
      
      // If active tab is being closed, switch to first pinned tab
      if (state.activeTabId && !pinnedTabs.find(t => t.id === state.activeTabId)) {
        newActiveTabId = pinnedTabs.length > 0 ? pinnedTabs[0].id : null;
      }
      
      set({
        tabs: pinnedTabs,
        activeTabId: newActiveTabId,
      });
      
      get().saveSession();
    },

    getTab: (tabId: string): RequestTab | null => {
      const state = get();
      return state.tabs.find(tab => tab.id === tabId) || null;
    },

    getActiveTab: (): RequestTab | null => {
      const state = get();
      if (!state.activeTabId) return null;
      return state.getTab(state.activeTabId);
    },

    findTabByRequestId: (requestId: string): RequestTab | null => {
      const state = get();
      return state.tabs.find(tab => tab.requestId === requestId) || null;
    },

    reorderTabs: (oldIndex: number, newIndex: number): void => {
      const state = get();
      
      if (oldIndex < 0 || oldIndex >= state.tabs.length || 
          newIndex < 0 || newIndex >= state.tabs.length) {
        return;
      }
      
      const newTabs = [...state.tabs];
      const [removed] = newTabs.splice(oldIndex, 1);
      newTabs.splice(newIndex, 0, removed);
      
      set({ tabs: newTabs });
      
      get().saveSession();
    },

    updateTabAccess: (tabId: string): boolean => {
      return get().updateTab(tabId, { lastAccessedAt: new Date() });
    },

    // Session Management
    saveSession: (): void => {
      const state = get();
      try {
        const sessionData = {
          tabs: state.tabs,
          activeTabId: state.activeTabId,
          timestamp: new Date().toISOString(),
        };
        localStorage.setItem(TAB_CONSTANTS.SESSION_STORAGE_KEY, JSON.stringify(sessionData));
      } catch (error) {
        console.error('Failed to save tab session:', error);
      }
    },

    restoreSession: (): void => {
      try {
        const savedData = localStorage.getItem(TAB_CONSTANTS.SESSION_STORAGE_KEY);
        if (!savedData) return;
        
        const sessionData = JSON.parse(savedData);
        if (!sessionData.tabs || !Array.isArray(sessionData.tabs)) return;
        
        // Validate and restore tabs
        const validTabs = sessionData.tabs.filter((tab: any) => 
          tab.id && tab.name && tab.request
        ).map((tab: any) => ({
          ...tab,
          createdAt: new Date(tab.createdAt),
          lastAccessedAt: new Date(tab.lastAccessedAt),
          lastSaved: tab.lastSaved ? new Date(tab.lastSaved) : undefined,
          isLoading: false, // Reset loading state on restore
        }));
        
        set({
          tabs: validTabs,
          activeTabId: sessionData.activeTabId,
        });
        
        console.log(`Restored ${validTabs.length} tabs from session`);
      } catch (error) {
        console.error('Failed to restore tab session:', error);
      }
    },

    clearSession: (): void => {
      localStorage.removeItem(TAB_CONSTANTS.SESSION_STORAGE_KEY);
    },

    // UI State Management
    setDraggedTab: (tabId: string | null): void => {
      set({ draggedTabId: tabId });
    },
  }))
);

// Export for external use
export default useRequestTabStore;