import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  DocumentDuplicateIcon,
  MapPinIcon,
  XMarkIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { useRequestTabStore } from '../../stores/request-tab-store';
import { tabManager } from '../../services/tab-manager';
import type { RequestTab } from '../../types/tab';

interface TabContextMenuProps {
  tab: RequestTab;
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
}

export const TabContextMenu: React.FC<TabContextMenuProps> = ({
  tab,
  isOpen,
  position,
  onClose,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const { duplicateTab, toggleTabPin, closeOtherTabs, closeUnpinnedTabs } = useRequestTabStore();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  const handleDuplicate = () => {
    duplicateTab(tab.id);
    onClose();
  };

  const handlePin = () => {
    toggleTabPin(tab.id);
    onClose();
  };

  const handleClose = () => {
    tabManager.closeTabWithConfirmation(tab.id);
    onClose();
  };

  const handleCloseOthers = () => {
    closeOtherTabs(tab.id);
    onClose();
  };

  const handleCloseUnpinned = () => {
    closeUnpinnedTabs();
    onClose();
  };

  const handleOpenInNewWindow = () => {
    // TODO: Implement opening tab in new window (future enhancement)
    console.log('Open in new window - not yet implemented');
    onClose();
  };

  if (!isOpen) return null;

  const menuStyle = {
    position: 'fixed' as const,
    top: position.y,
    left: position.x,
    zIndex: 1000,
  };

  return createPortal(
    <div
      ref={menuRef}
      style={menuStyle}
      className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-md shadow-lg py-1 min-w-[180px]"
      data-testid="tab-context-menu"
    >
      {/* Duplicate Tab */}
      <button
        onClick={handleDuplicate}
        className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
      >
        <DocumentDuplicateIcon className="w-4 h-4" />
        <span>Duplicate</span>
      </button>

      {/* Pin/Unpin Tab */}
      <button
        onClick={handlePin}
        className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
      >
        <MapPinIcon className="w-4 h-4" />
        <span>{tab.isPinned ? 'Unpin Tab' : 'Pin Tab'}</span>
      </button>

      {/* Open in New Window (future enhancement) */}
      <button
        onClick={handleOpenInNewWindow}
        className="w-full text-left px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
        disabled
        title="Coming soon"
      >
        <ArrowTopRightOnSquareIcon className="w-4 h-4" />
        <span>Open in New Window</span>
      </button>

      <hr className="border-gray-200 dark:border-gray-600 my-1" />

      {/* Close Options */}
      <button
        onClick={handleClose}
        className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
      >
        <XMarkIcon className="w-4 h-4" />
        <span>Close</span>
      </button>

      <button
        onClick={handleCloseOthers}
        className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        Close Others
      </button>

      <button
        onClick={handleCloseUnpinned}
        className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        Close Unpinned
      </button>
    </div>,
    document.body
  );
};

export default TabContextMenu;