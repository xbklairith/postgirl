import { useRequestTabStore } from '../stores/request-tab-store';
import type { RequestTab } from '../types/tab';
import { TAB_CONSTANTS } from '../types/tab';
import type { HttpRequest, HttpResponse, HttpError } from '../types/http';
import type { Request } from '../types/collection';

/**
 * TabManager - Service for handling tab business logic and integration
 * Provides high-level operations for tab management, auto-save, and integration with other services
 */
export class TabManager {
  private static instance: TabManager;
  private autoSaveTimers: Map<string, number> = new Map();
  private isInitialized = false;

  private constructor() {}

  static getInstance(): TabManager {
    if (!TabManager.instance) {
      TabManager.instance = new TabManager();
    }
    return TabManager.instance;
  }

  /**
   * Initialize the tab manager
   * Sets up auto-save timers and session restoration
   */
  initialize(): void {
    if (this.isInitialized) return;

    // Restore previous session
    useRequestTabStore.getState().restoreSession();
    
    // Set up auto-save for existing tabs
    const { tabs } = useRequestTabStore.getState();
    tabs.forEach(tab => {
      if (tab.hasUnsavedChanges) {
        this.scheduleAutoSave(tab.id);
      }
    });

    // Subscribe to tab changes for auto-save
    useRequestTabStore.subscribe(
      (state) => state.tabs,
      (tabs, previousTabs) => {
        // Check for new unsaved changes
        tabs.forEach(tab => {
          const previousTab = previousTabs?.find(p => p.id === tab.id);
          
          if (tab.hasUnsavedChanges && (!previousTab || !previousTab.hasUnsavedChanges)) {
            this.scheduleAutoSave(tab.id);
          } else if (!tab.hasUnsavedChanges && previousTab?.hasUnsavedChanges) {
            this.cancelAutoSave(tab.id);
          }
        });

        // Clean up auto-save timers for closed tabs
        const currentTabIds = new Set(tabs.map(t => t.id));
        for (const [tabId] of this.autoSaveTimers) {
          if (!currentTabIds.has(tabId)) {
            this.cancelAutoSave(tabId);
          }
        }
      }
    );

    this.isInitialized = true;
  }

  /**
   * Open a request from collection in a new tab
   */
  openRequestInTab(request: Request, makeActive = true): string {
    const store = useRequestTabStore.getState();
    return store.openTab(request, makeActive);
  }

  /**
   * Open a blank tab for creating new requests
   */
  openBlankTab(makeActive = true): string {
    const store = useRequestTabStore.getState();
    return store.openBlankTab(makeActive);
  }

  /**
   * Execute HTTP request for a specific tab
   */
  async executeTabRequest(tabId: string): Promise<void> {
    const store = useRequestTabStore.getState();
    const tab = store.getTab(tabId);
    
    if (!tab) {
      throw new Error(`Tab ${tabId} not found`);
    }

    // Set loading state
    store.setTabLoading(tabId, true);

    try {
      // Here you would integrate with your HTTP client service
      // For now, we'll simulate the request execution
      const response = await this.simulateHttpRequest(tab.request);
      
      // Set response
      store.setTabResponse(tabId, response);
      
      // Update last accessed time
      store.updateTabAccess(tabId);
      
    } catch (error) {
      // Set error
      const httpError: HttpError = {
        errorType: 'networkError',
        message: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
      
      store.setTabError(tabId, httpError);
    }
  }

  /**
   * Save tab request to collection (if it belongs to one)
   */
  async saveTabToCollection(tabId: string): Promise<void> {
    const store = useRequestTabStore.getState();
    const tab = store.getTab(tabId);
    
    if (!tab) {
      throw new Error(`Tab ${tabId} not found`);
    }

    try {
      // Here you would integrate with your collection/request saving service
      // For now, we'll simulate the save operation
      await this.simulateRequestSave(tab);
      
      // Mark as saved
      store.markTabSaved(tabId);
      
      // Cancel auto-save timer
      this.cancelAutoSave(tabId);
      
    } catch (error) {
      throw new Error(`Failed to save tab: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Duplicate a tab with optional modifications
   */
  duplicateTab(tabId: string, modifications?: Partial<HttpRequest>): string | null {
    const store = useRequestTabStore.getState();
    const newTabId = store.duplicateTab(tabId);
    
    if (newTabId && modifications) {
      store.updateTabRequest(newTabId, modifications);
    }
    
    return newTabId;
  }

  /**
   * Close tab with unsaved changes confirmation
   */
  async closeTabWithConfirmation(tabId: string): Promise<boolean> {
    const store = useRequestTabStore.getState();
    const tab = store.getTab(tabId);
    
    if (!tab) return false;

    // If tab has unsaved changes, show confirmation
    if (tab.hasUnsavedChanges) {
      const shouldSave = await this.showUnsavedChangesDialog(tab);
      
      if (shouldSave === 'cancel') {
        return false;
      }
      
      if (shouldSave === 'save') {
        try {
          await this.saveTabToCollection(tabId);
        } catch (error) {
          console.error('Failed to save tab before closing:', error);
          // Continue with close even if save fails
        }
      }
    }

    // Cancel auto-save timer
    this.cancelAutoSave(tabId);
    
    // Close the tab
    return store.closeTab(tabId);
  }

  /**
   * Get tab statistics for UI display
   */
  getTabStatistics(): {
    totalTabs: number;
    unsavedTabs: number;
    pinnedTabs: number;
    loadingTabs: number;
    activeTab: RequestTab | null;
  } {
    const store = useRequestTabStore.getState();
    const { tabs } = store;
    
    return {
      totalTabs: tabs.length,
      unsavedTabs: tabs.filter(t => t.hasUnsavedChanges).length,
      pinnedTabs: tabs.filter(t => t.isPinned).length,
      loadingTabs: tabs.filter(t => t.isLoading).length,
      activeTab: store.getActiveTab(),
    };
  }

  /**
   * Clean up old inactive tabs
   */
  cleanupInactiveTabs(): void {
    const store = useRequestTabStore.getState();
    const { tabs } = store;
    const cutoffTime = new Date();
    cutoffTime.setHours(cutoffTime.getHours() - TAB_CONSTANTS.INACTIVE_TAB_CLEANUP_HOURS);

    // Find tabs that are old, unpinned, saved, and not active
    const tabsToClose = tabs.filter(tab => 
      !tab.isPinned && 
      !tab.isActive && 
      !tab.hasUnsavedChanges && 
      tab.lastAccessedAt < cutoffTime
    );

    // Close old tabs
    tabsToClose.forEach(tab => {
      this.cancelAutoSave(tab.id);
      store.closeTab(tab.id);
    });

    if (tabsToClose.length > 0) {
      console.log(`Cleaned up ${tabsToClose.length} inactive tabs`);
    }
  }

  /**
   * Export tab session for backup
   */
  exportSession(): string {
    const store = useRequestTabStore.getState();
    const sessionData = {
      tabs: store.tabs,
      activeTabId: store.activeTabId,
      exportedAt: new Date().toISOString(),
      version: '1.0',
    };
    
    return JSON.stringify(sessionData, null, 2);
  }

  /**
   * Import tab session from backup
   */
  importSession(sessionJson: string): void {
    try {
      const sessionData = JSON.parse(sessionJson);
      
      if (!sessionData.tabs || !Array.isArray(sessionData.tabs)) {
        throw new Error('Invalid session format');
      }

      const store = useRequestTabStore.getState();
      
      // Clear current session
      store.closeAllTabs();
      
      // Import tabs
      sessionData.tabs.forEach((tabData: any) => {
        if (tabData.request) {
          const tabId = store.openTab(tabData.request, false);
          
          // Restore additional tab properties
          store.updateTab(tabId, {
            name: tabData.name,
            isPinned: tabData.isPinned || false,
            hasUnsavedChanges: tabData.hasUnsavedChanges || false,
            response: tabData.response,
            error: tabData.error,
          });
        }
      });
      
      // Restore active tab
      if (sessionData.activeTabId) {
        store.switchTab(sessionData.activeTabId);
      }
      
      console.log(`Imported ${sessionData.tabs.length} tabs from session`);
      
    } catch (error) {
      throw new Error(`Failed to import session: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Private helper methods

  private scheduleAutoSave(tabId: string): void {
    // Cancel existing timer
    this.cancelAutoSave(tabId);

    // Set new timer
    const timer = setTimeout(() => {
      this.performAutoSave(tabId);
    }, TAB_CONSTANTS.AUTO_SAVE_DEBOUNCE_MS);

    this.autoSaveTimers.set(tabId, timer);
  }

  private cancelAutoSave(tabId: string): void {
    const timer = this.autoSaveTimers.get(tabId);
    if (timer) {
      clearTimeout(timer);
      this.autoSaveTimers.delete(tabId);
    }
  }

  private async performAutoSave(tabId: string): Promise<void> {
    const store = useRequestTabStore.getState();
    const tab = store.getTab(tabId);
    
    if (!tab || !tab.hasUnsavedChanges) return;

    try {
      // Only auto-save if tab belongs to a collection
      if (tab.requestId && tab.collectionId) {
        await this.saveTabToCollection(tabId);
        console.log(`Auto-saved tab: ${tab.name}`);
      }
    } catch (error) {
      console.error('Auto-save failed:', error);
      // Reschedule auto-save on failure
      this.scheduleAutoSave(tabId);
    }
  }

  private async showUnsavedChangesDialog(tab: RequestTab): Promise<'save' | 'discard' | 'cancel'> {
    // In a real implementation, this would show a modal dialog
    // For now, we'll return a default behavior
    return new Promise((resolve) => {
      const result = confirm(
        `Tab "${tab.name}" has unsaved changes. Save before closing?`
      );
      resolve(result ? 'save' : 'discard');
    });
  }

  private async simulateHttpRequest(request: HttpRequest): Promise<HttpResponse> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Simulate response
    return {
      status: 200,
      statusText: 'OK',
      headers: {
        'content-type': 'application/json',
        'content-length': '123',
      },
      body: {
        type: 'json',
        data: { message: 'Hello, World!', timestamp: new Date().toISOString() },
      },
      timing: {
        totalTimeMs: 1500,
        dnsLookupMs: 50,
        tcpConnectMs: 100,
        firstByteMs: 800,
        downloadMs: 550,
      },
      requestId: request.id,
      timestamp: new Date().toISOString(),
    };
  }

  private async simulateRequestSave(tab: RequestTab): Promise<void> {
    // Simulate save delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    console.log(`Saved request: ${tab.name}`);
  }
}

// Export singleton instance
export const tabManager = TabManager.getInstance();