import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  XMarkIcon, 
  PlusIcon, 
  MapPinIcon,
  ChevronLeftIcon,
  ChevronRightIcon 
} from '@heroicons/react/24/outline';
import { useRequestTabStore } from '../../stores/request-tab-store';
import { truncateTabName } from '../../types/tab';
import { TabContextMenu } from './TabContextMenu';
import type { RequestTab } from '../../types/tab';

interface TabBarProps {
  className?: string;
}

export const TabBar: React.FC<TabBarProps> = ({ className = '' }) => {
  const {
    tabs,
    activeTabId,
    openBlankTab,
    closeTab,
    switchTab,
  } = useRequestTabStore();

  const tabBarRef = useRef<HTMLDivElement>(null);
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    tab: RequestTab;
    position: { x: number; y: number };
  } | null>(null);

  // Calculate scroll capabilities and ensure active tab is visible
  const calculateScrollState = useCallback(() => {
    if (!tabBarRef.current || tabs.length === 0) {
      if (isInitialized) {
        setCanScrollLeft(false);
        setCanScrollRight(false);
        setScrollOffset(0);
      }
      return;
    }

    const containerWidth = tabBarRef.current.offsetWidth;
    const newTabButtonWidth = 50;
    const scrollButtonWidth = 32;
    const padding = 20;
    const minTabWidth = 120;
    const totalTabsWidth = tabs.length * minTabWidth;
    
    // Available width for tabs
    const availableWidth = containerWidth - newTabButtonWidth - padding;
    const needsScrolling = totalTabsWidth > availableWidth;
    
    if (!needsScrolling) {
      setScrollOffset(0);
      setCanScrollLeft(false);
      setCanScrollRight(false);
      setIsInitialized(true);
      return;
    }
    
    // Adjust available width for scroll buttons
    const availableWidthWithScroll = availableWidth - (scrollButtonWidth * 2);
    const maxScrollOffset = Math.max(0, totalTabsWidth - availableWidthWithScroll);
    
    let newScrollOffset = scrollOffset;
    
    // Only auto-scroll to active tab if it's not manually scrolled
    const activeTabIndex = tabs.findIndex(tab => tab.id === activeTabId);
    if (activeTabIndex !== -1 && isInitialized) {
      const activeTabStart = activeTabIndex * minTabWidth;
      const activeTabEnd = activeTabStart + minTabWidth;
      
      // Only adjust if active tab is completely out of view
      if (activeTabEnd <= scrollOffset || activeTabStart >= scrollOffset + availableWidthWithScroll) {
        if (activeTabStart < scrollOffset) {
          newScrollOffset = activeTabStart;
        } else if (activeTabEnd > scrollOffset + availableWidthWithScroll) {
          newScrollOffset = Math.max(0, activeTabEnd - availableWidthWithScroll);
        }
      }
    }
    
    // Clamp scroll offset
    newScrollOffset = Math.max(0, Math.min(newScrollOffset, maxScrollOffset));
    
    // Only update state if values actually changed
    if (newScrollOffset !== scrollOffset) {
      setScrollOffset(newScrollOffset);
    }
    
    const newCanScrollLeft = newScrollOffset > 0;
    const newCanScrollRight = newScrollOffset < maxScrollOffset;
    
    if (newCanScrollLeft !== canScrollLeft) {
      setCanScrollLeft(newCanScrollLeft);
    }
    if (newCanScrollRight !== canScrollRight) {
      setCanScrollRight(newCanScrollRight);
    }
    
    setIsInitialized(true);
  }, [tabs, activeTabId, scrollOffset, canScrollLeft, canScrollRight, isInitialized]);

  // Recalculate when tabs or activeTabId changes (with debouncing)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      calculateScrollState();
    }, 10); // Small delay to batch rapid changes

    return () => clearTimeout(timeoutId);
  }, [tabs.length, activeTabId]); // Only depend on essential values

  // Recalculate on window resize (debounced)
  useEffect(() => {
    let resizeTimeout: number;
    
    const handleResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        calculateScrollState();
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, [calculateScrollState]);

  const handleTabClick = (tabId: string) => {
    switchTab(tabId);
  };

  const handleTabClose = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation();
    closeTab(tabId);
  };

  const handleNewTab = () => {
    openBlankTab(true);
  };

  const handleScrollLeft = useCallback(() => {
    if (!canScrollLeft) return;
    
    const minTabWidth = 120;
    const newOffset = Math.max(0, scrollOffset - minTabWidth);
    setScrollOffset(newOffset);
    
    // Update scroll buttons immediately for better UX
    setTimeout(() => {
      if (tabBarRef.current) {
        const containerWidth = tabBarRef.current.offsetWidth;
        const totalTabsWidth = tabs.length * minTabWidth;
        const availableWidth = containerWidth - 50 - 20 - 64; // new tab + padding + scroll buttons
        const maxScrollOffset = Math.max(0, totalTabsWidth - availableWidth);
        
        setCanScrollLeft(newOffset > 0);
        setCanScrollRight(newOffset < maxScrollOffset);
      }
    }, 0);
  }, [canScrollLeft, scrollOffset, tabs.length]);

  const handleScrollRight = useCallback(() => {
    if (!canScrollRight) return;
    
    const minTabWidth = 120;
    const newOffset = scrollOffset + minTabWidth;
    setScrollOffset(newOffset);
    
    // Update scroll buttons immediately for better UX
    setTimeout(() => {
      if (tabBarRef.current) {
        const containerWidth = tabBarRef.current.offsetWidth;
        const totalTabsWidth = tabs.length * minTabWidth;
        const availableWidth = containerWidth - 50 - 20 - 64; // new tab + padding + scroll buttons
        const maxScrollOffset = Math.max(0, totalTabsWidth - availableWidth);
        
        setCanScrollLeft(newOffset > 0);
        setCanScrollRight(newOffset < maxScrollOffset);
      }
    }, 0);
  }, [canScrollRight, scrollOffset, tabs.length]);

  const handleContextMenu = (e: React.MouseEvent, tab: RequestTab) => {
    e.preventDefault();
    setContextMenu({
      tab,
      position: { x: e.clientX, y: e.clientY },
    });
  };

  const closeContextMenu = () => {
    setContextMenu(null);
  };

  const getTabClassName = (tab: RequestTab, isDragging: boolean) => {
    const baseClasses = "relative flex items-center gap-2 px-3 py-2 text-sm font-medium border-r border-gray-200 dark:border-gray-700 cursor-pointer select-none transition-colors duration-150";
    const activeClasses = tab.isActive 
      ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-b-2 border-blue-500" 
      : "bg-gray-50 dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800";
    const draggingClasses = isDragging ? "opacity-50" : "";
    const unsavedClasses = tab.hasUnsavedChanges ? "italic" : "";
    
    return `${baseClasses} ${activeClasses} ${draggingClasses} ${unsavedClasses}`;
  };

  const renderTab = useCallback((tab: RequestTab) => {
    return (
      <div
        className={getTabClassName(tab, false)}
        onClick={() => handleTabClick(tab.id)}
        onContextMenu={(e) => handleContextMenu(e, tab)}
        style={{ width: '120px' }}
        data-testid="request-tab"
      >
        {/* Pin indicator */}
        {tab.isPinned && (
          <MapPinIcon className="w-3 h-3 text-gray-400 dark:text-gray-500 flex-shrink-0" />
        )}
        
        {/* Loading indicator */}
        {tab.isLoading && (
          <div className="w-3 h-3 border border-gray-300 border-t-blue-500 rounded-full animate-spin flex-shrink-0" />
        )}
        
        {/* Tab name */}
        <span className="truncate flex-1 min-w-0">
          {truncateTabName(tab.name, 25)}
        </span>
        
        {/* Unsaved changes indicator */}
        {tab.hasUnsavedChanges && !tab.isLoading && (
          <div className="w-2 h-2 bg-orange-400 rounded-full flex-shrink-0" />
        )}
        
        {/* Close button */}
        <button
          className="flex-shrink-0 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => handleTabClose(e, tab.id)}
          title="Close tab"
          data-testid="close-tab-button"
        >
          <XMarkIcon className="w-3 h-3" />
        </button>
      </div>
    );
  }, []);

  if (tabs.length === 0) {
    return (
      <div className={`flex items-center border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 ${className}`}>
        <button
          onClick={handleNewTab}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="New tab (Ctrl+T)"
          data-testid="new-request-button"
        >
          <PlusIcon className="w-4 h-4" />
          <span>New Tab</span>
        </button>
      </div>
    );
  }

  return (
    <div 
      ref={tabBarRef}
      className={`flex items-center border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 overflow-hidden ${className}`}
    >
      {/* Left scroll button */}
      {canScrollLeft && (
        <button
          onClick={handleScrollLeft}
          className="flex-shrink-0 flex items-center justify-center w-8 h-8 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border-r border-gray-200 dark:border-gray-700"
          title="Scroll left"
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </button>
      )}
      
      {/* Tabs container */}
      <div className="flex-1 min-w-0 overflow-hidden">
        <div
          ref={tabsContainerRef}
          className="flex transition-transform duration-200 ease-out"
          style={{ 
            transform: `translateX(-${scrollOffset}px)`,
            width: `${tabs.length * 120}px`, // minTabWidth * tab count
            willChange: 'transform' // Optimize for transforms
          }}
        >
          {tabs.map(tab => (
            <div key={tab.id} className="group flex-shrink-0" style={{ width: '120px' }}>
              {renderTab(tab)}
            </div>
          ))}
        </div>
      </div>
      
      {/* Right scroll button */}
      {canScrollRight && (
        <button
          onClick={handleScrollRight}
          className="flex-shrink-0 flex items-center justify-center w-8 h-8 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border-r border-gray-200 dark:border-gray-700"
          title="Scroll right"
        >
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      )}
      
      {/* New tab button */}
      <button
        onClick={handleNewTab}
        className="flex-shrink-0 flex items-center gap-1 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors border-l border-gray-200 dark:border-gray-700"
        title="New tab (Ctrl+T)"
        data-testid="new-request-button"
      >
        <PlusIcon className="w-4 h-4" />
      </button>
      
      {/* Context Menu */}
      {contextMenu && (
        <TabContextMenu
          tab={contextMenu.tab}
          isOpen={true}
          position={contextMenu.position}
          onClose={closeContextMenu}
        />
      )}
    </div>
  );
};

export default TabBar;