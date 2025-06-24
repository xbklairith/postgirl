import React, { useState } from 'react';
import { ChevronDownIcon, PlusIcon, FolderIcon } from '@heroicons/react/24/outline';
import { useWorkspaceStore } from '../../stores/workspace-store';
import { Button, Card } from '../ui';
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
  const { 
    workspaces, 
    activeWorkspace, 
    setActiveWorkspace, 
    isLoading 
  } = useWorkspaceStore();

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

  return (
    <div className={cn('relative', className)}>
      {/* Workspace Selector Button */}
      <Button
        variant="secondary"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between"
        disabled={isLoading}
      >
        <div className="flex items-center space-x-2">
          <FolderIcon className="w-4 h-4" />
          <span className="truncate">
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

      {/* Dropdown */}
      {isOpen && (
        <Card className="absolute top-full left-0 right-0 mt-2 z-50 max-h-80 overflow-y-auto">
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
                      'hover:bg-slate-100 dark:hover:bg-slate-800',
                      workspace.is_active && 'bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800'
                    )}
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
                          <span className="truncate">{workspace.local_path}</span>
                          <span>{formatLastAccessed(workspace.last_accessed_at)}</span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
};