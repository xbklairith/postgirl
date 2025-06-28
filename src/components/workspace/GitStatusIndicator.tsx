import React, { useEffect, useState } from 'react';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  ArrowPathIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { WorkspaceGitService } from '../../services/workspace-git-integration';
import type { GitStatus } from '../../types/git';

interface GitStatusIndicatorProps {
  workspacePath: string | null;
  className?: string;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const GitStatusIndicator: React.FC<GitStatusIndicatorProps> = ({
  workspacePath,
  className = '',
  showLabel = false,
  size = 'sm',
}) => {
  const [gitStatus, setGitStatus] = useState<(GitStatus & { isRepository: boolean }) | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!workspacePath) {
      setGitStatus(null);
      return;
    }

    const fetchGitStatus = async () => {
      setIsLoading(true);
      try {
        const status = await WorkspaceGitService.getWorkspaceGitStatus(workspacePath);
        setGitStatus(status);
      } catch (error) {
        console.warn('Failed to fetch Git status:', error);
        setGitStatus(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGitStatus();
  }, [workspacePath]);

  if (!workspacePath || isLoading) {
    return (
      <div className={`flex items-center ${className}`}>
        <ArrowPathIcon className={`animate-spin ${getIconSize(size)} text-slate-400`} />
        {showLabel && <span className="ml-1 text-xs text-slate-400">Checking...</span>}
      </div>
    );
  }

  if (!gitStatus?.isRepository) {
    return (
      <div className={`flex items-center ${className}`}>
        <div className={`rounded-full ${getDotSize(size)} bg-slate-300`} />
        {showLabel && <span className="ml-1 text-xs text-slate-500">No Git</span>}
      </div>
    );
  }

  const getStatusInfo = () => {
    if (!gitStatus.isRepository) {
      return {
        icon: XCircleIcon,
        color: 'text-slate-400',
        bgColor: 'bg-slate-100',
        label: 'No Git',
        tooltip: 'This workspace is not a Git repository',
      };
    }

    if (gitStatus.is_clean) {
      return {
        icon: CheckCircleIcon,
        color: 'text-green-500',
        bgColor: 'bg-green-100',
        label: 'Clean',
        tooltip: `Git repository is clean (${gitStatus.current_branch})`,
      };
    }

    const totalChanges = gitStatus.staged_files.length + 
                        gitStatus.modified_files.length + 
                        gitStatus.untracked_files.length;

    return {
      icon: ExclamationTriangleIcon,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-100',
      label: `${totalChanges} changes`,
      tooltip: `${totalChanges} changes (${gitStatus.staged_files.length} staged, ${gitStatus.modified_files.length} modified, ${gitStatus.untracked_files.length} untracked)`,
    };
  };

  const statusInfo = getStatusInfo();
  const Icon = statusInfo.icon;

  return (
    <div 
      className={`flex items-center ${className}`}
      title={statusInfo.tooltip}
    >
      <Icon className={`${getIconSize(size)} ${statusInfo.color}`} />
      {showLabel && (
        <span className={`ml-1 text-xs ${statusInfo.color}`}>
          {statusInfo.label}
        </span>
      )}
    </div>
  );
};

// Utility functions
function getIconSize(size: 'sm' | 'md' | 'lg'): string {
  switch (size) {
    case 'sm': return 'w-3 h-3';
    case 'md': return 'w-4 h-4';
    case 'lg': return 'w-5 h-5';
    default: return 'w-3 h-3';
  }
}

function getDotSize(size: 'sm' | 'md' | 'lg'): string {
  switch (size) {
    case 'sm': return 'w-3 h-3';
    case 'md': return 'w-4 h-4';
    case 'lg': return 'w-5 h-5';
    default: return 'w-3 h-3';
  }
}

// Extended Git status component with detailed information
export const GitStatusDetails: React.FC<{ workspacePath: string | null }> = ({ workspacePath }) => {
  const [gitStatus, setGitStatus] = useState<(GitStatus & { isRepository: boolean }) | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!workspacePath) return;

    const fetchGitStatus = async () => {
      setIsLoading(true);
      try {
        const status = await WorkspaceGitService.getWorkspaceGitStatus(workspacePath);
        setGitStatus(status);
      } catch (error) {
        console.warn('Failed to fetch Git status:', error);
        setGitStatus(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchGitStatus();
  }, [workspacePath]);

  if (!workspacePath || isLoading) {
    return (
      <div className="text-xs text-slate-400">
        <ArrowPathIcon className="w-3 h-3 animate-spin inline mr-1" />
        Checking Git status...
      </div>
    );
  }

  if (!gitStatus?.isRepository) {
    return (
      <div className="text-xs text-slate-500">
        Not a Git repository
      </div>
    );
  }

  return (
    <div className="space-y-1 text-xs">
      <div className="flex items-center space-x-2">
        <span className="text-slate-500">Branch:</span>
        <span className="font-medium text-slate-700 dark:text-slate-300">
          {gitStatus.current_branch || 'unknown'}
        </span>
      </div>
      
      {!gitStatus.is_clean && (
        <div className="space-y-1">
          {gitStatus.staged_files.length > 0 && (
            <div className="text-green-600">
              {gitStatus.staged_files.length} staged
            </div>
          )}
          {gitStatus.modified_files.length > 0 && (
            <div className="text-yellow-600">
              {gitStatus.modified_files.length} modified
            </div>
          )}
          {gitStatus.untracked_files.length > 0 && (
            <div className="text-blue-600">
              {gitStatus.untracked_files.length} untracked
            </div>
          )}
        </div>
      )}
      
      {gitStatus.is_clean && (
        <div className="text-green-600">
          Working tree clean
        </div>
      )}
    </div>
  );
};