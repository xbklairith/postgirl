import React, { useState, useEffect } from 'react';
import {
  CodeBracketIcon,
  PlusIcon,
  ClockIcon,
  ArrowPathIcon,
  AdjustmentsHorizontalIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import { Button, Card, CardHeader, CardBody } from '../ui';
import { BranchCreator } from './BranchCreator';
import { GitBranchApi } from '../../services/git-branch-api';
import { cn } from '../../utils/cn';
import type {
  GitBranch,
  BranchCreateResult,
  BranchHistoryEntry,
  SystemInfo,
  FeatureType,
} from '../../types/git';
import { getFeatureTypeColor, getFeatureTypeIcon } from '../../types/git';

interface BranchManagerProps {
  workspacePath: string;
  workspaceName: string;
  onBranchChange?: (branch: GitBranch) => void;
  className?: string;
}

export const BranchManager: React.FC<BranchManagerProps> = ({
  workspacePath,
  workspaceName,
  className,
}) => {
  const [currentBranch, setCurrentBranch] = useState<GitBranch | null>(null);
  const [recentBranches, setRecentBranches] = useState<BranchHistoryEntry[]>([]);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [suggestedBranches, setSuggestedBranches] = useState<Array<{ featureType: FeatureType; branchName: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);

  useEffect(() => {
    loadData();
  }, [workspacePath, workspaceName]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [
        branchesData,
        systemData,
        historyData,
        suggestionsData,
      ] = await Promise.all([
        GitBranchApi.listBranches(workspacePath),
        GitBranchApi.getSystemInfo(),
        GitBranchApi.getRecentBranches(5),
        GitBranchApi.getSuggestedBranches(workspaceName),
      ]);

      setCurrentBranch(branchesData.find(b => b.is_current) || null);
      setSystemInfo(systemData);
      setRecentBranches(historyData);
      setSuggestedBranches(suggestionsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load branch data');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshBranches = async () => {
    try {
      setIsRefreshing(true);
      const branchesData = await GitBranchApi.listBranches(workspacePath);
      setCurrentBranch(branchesData.find(b => b.is_current) || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh branches');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleBranchCreated = (result: BranchCreateResult) => {
    // Refresh branch list after successful creation
    refreshBranches();
    
    // Show success message or notification here if needed
    console.log('Branch created:', result);
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center h-64', className)}>
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('p-4', className)}>
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-700 dark:text-red-300">{error}</p>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={loadData}
            className="mt-2 text-red-600 hover:text-red-700"
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/20">
            <CodeBracketIcon className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Branch Management
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Automatic branch creation and management for {workspaceName}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshBranches}
            disabled={isRefreshing}
            className="flex items-center space-x-2"
          >
            <ArrowPathIcon className={cn('w-4 h-4', isRefreshing && 'animate-spin')} />
            <span>Refresh</span>
          </Button>
          
          <Button
            variant="primary"
            onClick={() => setIsCreatorOpen(true)}
            className="flex items-center space-x-2"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Create Branch</span>
          </Button>
        </div>
      </div>

      {/* Current Branch */}
      {currentBranch && (
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
              Current Branch
            </h3>
          </CardHeader>
          <CardBody>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span className="font-mono text-slate-900 dark:text-slate-100">
                  {currentBranch.name}
                </span>
              </div>
              {currentBranch.last_commit_message && (
                <div className="text-right">
                  <p className="text-sm text-slate-600 dark:text-slate-400 truncate max-w-xs">
                    {currentBranch.last_commit_message}
                  </p>
                  {currentBranch.last_commit_date && (
                    <p className="text-xs text-slate-500 dark:text-slate-500">
                      {formatRelativeTime(currentBranch.last_commit_date)}
                    </p>
                  )}
                </div>
              )}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Quick Actions */}
      {suggestedBranches.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <AdjustmentsHorizontalIcon className="w-5 h-5 text-slate-500" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
                Quick Branch Templates
              </h3>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Pre-configured branch patterns for common workflows
            </p>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {suggestedBranches.slice(0, 4).map(({ featureType, branchName }) => (
                <div
                  key={featureType}
                  className="p-3 border border-slate-200 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer"
                  onClick={() => setIsCreatorOpen(true)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getFeatureTypeIcon(featureType)}</span>
                      <span className="font-medium text-slate-900 dark:text-slate-100 capitalize">
                        {featureType}
                      </span>
                    </div>
                    <span className={cn('px-2 py-1 rounded text-xs font-medium', getFeatureTypeColor(featureType))}>
                      {featureType}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono truncate">
                    {branchName}
                  </p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* Recent Branches */}
      {recentBranches.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <ClockIcon className="w-5 h-5 text-slate-500" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
                Recently Created
              </h3>
            </div>
          </CardHeader>
          <CardBody>
            <div className="space-y-3">
              {recentBranches.map((entry, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
                >
                  <div className="flex items-center space-x-3">
                    <span className={cn('px-2 py-1 rounded text-xs font-medium', getFeatureTypeColor(entry.pattern.feature_type))}>
                      {getFeatureTypeIcon(entry.pattern.feature_type)} {entry.pattern.feature_type}
                    </span>
                    <span className="font-mono text-sm text-slate-900 dark:text-slate-100">
                      {entry.branch_name}
                    </span>
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {formatRelativeTime(entry.created_at)}
                  </span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {/* System Info */}
      {systemInfo && (
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <InformationCircleIcon className="w-5 h-5 text-slate-500" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
                Branch Configuration
              </h3>
            </div>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-slate-500 dark:text-slate-400">User:</span>
                <p className="font-medium text-slate-900 dark:text-slate-100">{systemInfo.username}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Machine:</span>
                <p className="font-medium text-slate-900 dark:text-slate-100">{systemInfo.machine_name}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Workspace:</span>
                <p className="font-medium text-slate-900 dark:text-slate-100">{workspaceName}</p>
              </div>
              <div>
                <span className="text-slate-500 dark:text-slate-400">Pattern:</span>
                <p className="font-mono text-xs text-slate-900 dark:text-slate-100">
                  {workspaceName.toLowerCase()}/{systemInfo.username.toLowerCase()}-{systemInfo.machine_name.toLowerCase()}/type-desc
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Branch Creator Modal */}
      <BranchCreator
        isOpen={isCreatorOpen}
        onClose={() => setIsCreatorOpen(false)}
        workspacePath={workspacePath}
        workspaceName={workspaceName}
        onBranchCreated={handleBranchCreated}
      />
    </div>
  );
};