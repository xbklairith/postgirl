import { useEffect } from 'react';
import { useRequestTabStore } from '../stores/request-tab-store';
import { tabManager } from '../services/tab-manager';

/**
 * Hook for handling keyboard shortcuts for tab operations
 * Provides familiar browser-like shortcuts for tab management
 */
export const useTabShortcuts = () => {
  const {
    tabs,
    activeTabId,
    openBlankTab,
    closeTab,
    switchTab,
    getActiveTab,
  } = useRequestTabStore();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when not in input fields
      const isInputFocused = document.activeElement?.tagName === 'INPUT' ||
                            document.activeElement?.tagName === 'TEXTAREA' ||
                            (document.activeElement as any)?.isContentEditable;

      // For some shortcuts, we want to work even in input fields
      const isGlobalShortcut = (event.ctrlKey || event.metaKey) && 
                              (event.key === 't' || event.key === 'w' || event.key === 'Tab');

      if (isInputFocused && !isGlobalShortcut) {
        return;
      }

      const isCtrlOrCmd = event.ctrlKey || event.metaKey;

      // Ctrl/Cmd + T: New tab
      if (isCtrlOrCmd && event.key === 't') {
        event.preventDefault();
        openBlankTab(true);
        return;
      }

      // Ctrl/Cmd + W: Close current tab
      if (isCtrlOrCmd && event.key === 'w') {
        event.preventDefault();
        const activeTab = getActiveTab();
        if (activeTab) {
          tabManager.closeTabWithConfirmation(activeTab.id);
        }
        return;
      }

      // Ctrl/Cmd + Tab: Next tab
      if (isCtrlOrCmd && event.key === 'Tab' && !event.shiftKey) {
        event.preventDefault();
        const currentIndex = tabs.findIndex(tab => tab.id === activeTabId);
        if (currentIndex !== -1 && tabs.length > 1) {
          const nextIndex = (currentIndex + 1) % tabs.length;
          switchTab(tabs[nextIndex].id);
        }
        return;
      }

      // Ctrl/Cmd + Shift + Tab: Previous tab
      if (isCtrlOrCmd && event.key === 'Tab' && event.shiftKey) {
        event.preventDefault();
        const currentIndex = tabs.findIndex(tab => tab.id === activeTabId);
        if (currentIndex !== -1 && tabs.length > 1) {
          const prevIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1;
          switchTab(tabs[prevIndex].id);
        }
        return;
      }

      // Ctrl/Cmd + [1-9]: Switch to tab by number
      if (isCtrlOrCmd && event.key >= '1' && event.key <= '9') {
        event.preventDefault();
        const tabIndex = parseInt(event.key) - 1;
        if (tabs[tabIndex]) {
          switchTab(tabs[tabIndex].id);
        }
        return;
      }

      // Ctrl/Cmd + 0: Switch to last tab
      if (isCtrlOrCmd && event.key === '0') {
        event.preventDefault();
        if (tabs.length > 0) {
          switchTab(tabs[tabs.length - 1].id);
        }
        return;
      }

      // Ctrl/Cmd + Shift + T: Reopen last closed tab (placeholder for future implementation)
      if (isCtrlOrCmd && event.shiftKey && event.key === 't') {
        event.preventDefault();
        // TODO: Implement reopen last closed tab functionality
        console.log('Reopen last closed tab - not yet implemented');
        return;
      }

      // Escape: Close context menu if open (handled by context menu component)
      if (event.key === 'Escape') {
        // Context menu handles its own escape key
        return;
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [tabs, activeTabId, openBlankTab, closeTab, switchTab, getActiveTab]);

  // Return available shortcuts for documentation/help
  return {
    shortcuts: [
      { key: 'Ctrl/Cmd + T', description: 'Open new tab' },
      { key: 'Ctrl/Cmd + W', description: 'Close current tab' },
      { key: 'Ctrl/Cmd + Tab', description: 'Next tab' },
      { key: 'Ctrl/Cmd + Shift + Tab', description: 'Previous tab' },
      { key: 'Ctrl/Cmd + 1-9', description: 'Switch to tab by number' },
      { key: 'Ctrl/Cmd + 0', description: 'Switch to last tab' },
      { key: 'Escape', description: 'Close context menu' },
    ],
  };
};

export default useTabShortcuts;