import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDownIcon, PlusIcon, FolderIcon } from '@heroicons/react/24/outline';
import { useWorkspaceStore } from '../../stores/workspace-store';
import { Button } from '../ui';
import { cn } from '../../utils/cn';

interface WorkspaceSelectorProps {
  onCreateNew?: () => void;
  className?: string;
}

export const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = ({
  onCreateNew,
  className
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0, openUpward: false });
  const selectorRef = useRef<HTMLDivElement>(null);
  const { 
    workspaces, 
    activeWorkspace, 
    setActiveWorkspace, 
    isLoading 
  } = useWorkspaceStore();

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        // Check if click is inside the dropdown portal
        const target = event.target as Element;
        const isClickInsideDropdown = target.closest('[data-dropdown-portal="workspace"]');
        if (!isClickInsideDropdown) {
          setIsOpen(false);
        }
      }
    };

    const updatePosition = () => {
      if (selectorRef.current && isOpen) {
        const rect = selectorRef.current.getBoundingClientRect();
        const dropdownHeight = Math.min(320, Math.max(240, workspaces.length * 80 + 120)); // Estimate height
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - rect.bottom;
        const spaceAbove = rect.top;
        
        // Determine if dropdown should open upward
        const shouldOpenUpward = spaceBelow < dropdownHeight && spaceAbove > spaceBelow && spaceAbove >= 150;
        
        // Calculate position
        let top = shouldOpenUpward 
          ? Math.max(8, rect.top + window.scrollY - dropdownHeight - 4)
          : rect.bottom + window.scrollY + 4;
        
        // Ensure dropdown doesn't go off screen
        if (!shouldOpenUpward && top + dropdownHeight > window.innerHeight + window.scrollY) {
          top = window.innerHeight + window.scrollY - dropdownHeight - 8;
        }
        
        // Make dropdown wider than button for better readability
        const dropdownWidth = Math.max(320, rect.width * 1.25); // At least 320px or 25% wider than button
        
        // Align dropdown to the right edge of the button
        const rightAlignedLeft = rect.right + window.scrollX - dropdownWidth;
        const finalLeft = Math.max(8, Math.min(rightAlignedLeft, window.innerWidth - dropdownWidth - 8));
        
        setDropdownPosition({
          top,
          left: finalLeft,
          width: dropdownWidth,
          openUpward: shouldOpenUpward
        });
      }
    };

    if (isOpen) {
      updatePosition();
      window.addEventListener('resize', updatePosition);
      window.addEventListener('scroll', updatePosition);
    }

    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isOpen, workspaces.length]);

  const handleWorkspaceSelect = async (workspaceId: string) => {
    try {
      await setActiveWorkspace(workspaceId);
      setIsOpen(false);
    } catch (error) {
      // Error is handled by the store
    }
  };

  const formatLastAccessed = (lastAccessed?: string) => {
    if (!lastAccessed) return 'Never accessed';
    const date = new Date(lastAccessed);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const renderDropdown = () => {
    if (!isOpen) return null;

    return createPortal(
      <div 
        data-dropdown-portal="workspace"
        data-testid="workspace-dropdown"
        className={cn(
          'fixed rounded-lg shadow-xl z-[100]',
          'bg-white/95 dark:bg-slate-800/95 backdrop-blur-lg',
          'border border-slate-200/60 dark:border-slate-600/60',
          'ring-1 ring-black ring-opacity-5',
          'max-h-80 overflow-y-auto'
        )}
        style={{
          top: dropdownPosition.top,
          left: dropdownPosition.left,
          width: dropdownPosition.width
        }}
      >
        <div className="p-2">
          {/* Create New Workspace Button */}
          <Button
            variant="ghost"
            onClick={() => {
              onCreateNew?.();
              setIsOpen(false);
            }}
            className="w-full justify-start mb-2"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Create New Workspace
          </Button>

          {/* Workspace List */}
          {workspaces.length === 0 ? (
            <div className="px-3 py-8 text-center text-slate-500 dark:text-slate-400">
              <FolderIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No workspaces found</p>
              <p className="text-xs mt-1">Create your first workspace to get started</p>
            </div>
          ) : (
            <div className="space-y-1">
              {workspaces.map((workspace) => (
                <button
                  key={workspace.id}
                  onClick={() => handleWorkspaceSelect(workspace.id)}
                  className={cn(
                    'w-full text-left px-3 py-3 rounded-lg transition-colors',
                    'hover:bg-slate-100/60 dark:hover:bg-slate-700/60',
                    workspace.is_active && 'bg-primary-50/60 dark:bg-primary-900/20 ring-1 ring-primary-200/50 dark:ring-primary-700/50'
                  )}
                  data-testid="workspace-option"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <FolderIcon className="w-4 h-4 text-slate-400" />
                        <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                          {workspace.name}
                        </span>
                        {workspace.is_active && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200">
                            Active
                          </span>
                        )}
                      </div>
                      {workspace.description && (
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 truncate">
                          {workspace.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
                        <span className="truncate flex-1 mr-2">{workspace.local_path}</span>
                        <span className="flex-shrink-0">{formatLastAccessed(workspace.last_accessed_at)}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>,
      document.body
    );
  };

  return (
    <div ref={selectorRef} className={cn('relative', className)}>
      {/* Workspace Selector Button */}
      <Button
        variant="secondary"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between"
        disabled={isLoading}
        data-testid="workspace-selector"
      >
        <div className="flex items-center space-x-2">
          <FolderIcon className="w-4 h-4" />
          <span className="truncate" data-testid="active-workspace-name">
            {activeWorkspace?.name || 'Select Workspace'}
          </span>
        </div>
        <ChevronDownIcon 
          className={cn(
            'w-4 h-4 transition-transform',
            isOpen && 'rotate-180'
          )} 
        />
      </Button>

      {/* Render dropdown via portal */}
      {renderDropdown()}
    </div>
  );
};