import React, { useEffect, useState } from 'react';
import { 
  PlusIcon, 
  FolderIcon, 
  ClockIcon, 
  CodeBracketIcon, 
  GlobeAltIcon,
  TrashIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { useWorkspaceStore } from '../../stores/workspace-store';
import { Button, Card, CardHeader, CardBody } from '../ui';
import { WorkspaceCreationWizard } from './WorkspaceCreationWizard';
import { GitStatusIndicator } from './GitStatusIndicator';
import { cn } from '../../utils/cn';

interface WorkspaceDashboardProps {
  onWorkspaceSelect?: (workspaceId: string) => void;
}

export const WorkspaceDashboard: React.FC<WorkspaceDashboardProps> = ({
  onWorkspaceSelect
}) => {
  const [showCreateWizard, setShowCreateWizard] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  
  const { 
    workspaceSummaries, 
    loadWorkspaceSummaries,
    setActiveWorkspace,
    deleteWorkspace,
    isLoading,
    error 
  } = useWorkspaceStore();

  useEffect(() => {
    loadWorkspaceSummaries();
  }, [loadWorkspaceSummaries]);

  const handleWorkspaceSelect = async (workspaceId: string) => {
    try {
      await setActiveWorkspace(workspaceId);
      onWorkspaceSelect?.(workspaceId);
    } catch (error) {
      // Error is handled by the store
    }
  };

  const handleDeleteWorkspace = async (workspaceId: string) => {
    try {
      await deleteWorkspace(workspaceId);
      setDeleteConfirm(null);
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

  const formatPath = (path: string) => {
    if (path.startsWith('~/')) {
      return path;
    }
    const parts = path.split('/');
    if (parts.length > 3) {
      return `.../${parts.slice(-2).join('/')}`;
    }
    return path;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Workspaces
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage your API testing environments
          </p>
        </div>
        <Button 
          variant="primary" 
          onClick={() => setShowCreateWizard(true)}
          className="flex items-center space-x-2"
        >
          <PlusIcon className="w-4 h-4" />
          <span>New Workspace</span>
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <CardBody>
            <p className="text-red-600 dark:text-red-400">{error}</p>
          </CardBody>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && workspaceSummaries.length === 0 && (
        <Card>
          <CardBody>
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-300 border-t-primary-500"></div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && workspaceSummaries.length === 0 && (
        <Card>
          <CardBody>
            <div className="text-center py-12">
              <FolderIcon className="w-16 h-16 mx-auto text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                No workspaces yet
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">
                Create your first workspace to start organizing your API collections
              </p>
              <Button 
                variant="primary" 
                onClick={() => setShowCreateWizard(true)}
                className="flex items-center space-x-2"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Create Your First Workspace</span>
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Workspace Grid */}
      {workspaceSummaries.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workspaceSummaries.map((workspace) => (
            <Card 
              key={workspace.id}
              className={cn(
                'cursor-pointer transition-all duration-200 hover:shadow-lg',
                workspace.is_active && 'ring-2 ring-primary-500 bg-primary-50 dark:bg-primary-900/20'
              )}
              onClick={() => handleWorkspaceSelect(workspace.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <FolderIcon className={cn(
                      'w-5 h-5 flex-shrink-0',
                      workspace.is_active ? 'text-primary-500' : 'text-slate-400'
                    )} />
                    <div className="min-w-0 flex-1">
                      <h3 className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {workspace.name}
                      </h3>
                      {workspace.is_active && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200 mt-1">
                          Active
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-1 ml-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // TODO: Open workspace settings
                      }}
                      className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <Cog6ToothIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm(workspace.id);
                      }}
                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </CardHeader>
              
              <CardBody>
                {workspace.description && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-3 line-clamp-2">
                    {workspace.description}
                  </p>
                )}
                
                <div className="space-y-2 text-xs text-slate-500 dark:text-slate-400">
                  <div className="flex items-center space-x-2">
                    <FolderIcon className="w-3 h-3" />
                    <span className="truncate">{formatPath(workspace.local_path)}</span>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <ClockIcon className="w-3 h-3" />
                    <span>{formatLastAccessed(workspace.last_accessed_at)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-1">
                        <CodeBracketIcon className="w-3 h-3" />
                        <span>{workspace.collection_count} collections</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <GlobeAltIcon className="w-3 h-3" />
                        <span>{workspace.request_count} requests</span>
                      </div>
                    </div>
                    <GitStatusIndicator 
                      workspacePath={workspace.local_path}
                      size="sm"
                    />
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-2xl max-w-md w-full border border-slate-200 dark:border-slate-700">
            <div className="p-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                  <TrashIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                    Delete Workspace
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    This action cannot be undone
                  </p>
                </div>
              </div>
              
              <div className="mb-6">
                <p className="text-slate-800 dark:text-slate-200 leading-relaxed">
                  Are you sure you want to delete this workspace? This action cannot be undone.
                </p>
                <p className="text-slate-700 dark:text-slate-300 mt-2 text-sm">
                  This will permanently remove all workspace data and cannot be recovered.
                </p>
              </div>
              
              <div className="flex justify-end space-x-3">
                <Button 
                  variant="ghost" 
                  onClick={() => setDeleteConfirm(null)}
                  className="text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => handleDeleteWorkspace(deleteConfirm)}
                  className="bg-red-600 hover:bg-red-700 text-white font-medium px-4 py-2 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                >
                  Delete Workspace
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Creation Wizard */}
      <WorkspaceCreationWizard
        isOpen={showCreateWizard}
        onClose={() => setShowCreateWizard(false)}
        onSuccess={(workspaceId) => {
          setShowCreateWizard(false);
          handleWorkspaceSelect(workspaceId);
        }}
      />
    </div>
  );
};