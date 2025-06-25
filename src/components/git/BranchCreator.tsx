import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  CheckIcon,
  CodeBracketIcon,
  CommandLineIcon,
  SparklesIcon,
} from '@heroicons/react/24/outline';
import { Button, Input, Card, CardHeader, CardBody, Modal } from '../ui';
import { GitBranchApi } from '../../services/git-branch-api';
import { cn } from '../../utils/cn';
import type {
  BranchPattern,
  BranchCreateRequest,
  BranchCreateResult,
  FeatureType,
  SystemInfo,
} from '../../types/git';
import { getFeatureTypeColor, getFeatureTypeIcon, createDefaultBranchPattern } from '../../types/git';

interface BranchCreatorProps {
  isOpen: boolean;
  onClose: () => void;
  workspacePath: string;
  workspaceName: string;
  onBranchCreated?: (result: BranchCreateResult) => void;
}

const FEATURE_TYPES: { value: FeatureType; label: string; description: string }[] = [
  { value: 'feature', label: 'Feature', description: 'New feature implementation' },
  { value: 'bugfix', label: 'Bug Fix', description: 'Fix existing issues' },
  { value: 'hotfix', label: 'Hotfix', description: 'Critical production fixes' },
  { value: 'experiment', label: 'Experiment', description: 'Experimental changes' },
  { value: 'refactor', label: 'Refactor', description: 'Code refactoring' },
  { value: 'docs', label: 'Documentation', description: 'Documentation updates' },
];

export const BranchCreator: React.FC<BranchCreatorProps> = ({
  isOpen,
  onClose,
  workspacePath,
  workspaceName,
  onBranchCreated,
}) => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [pattern, setPattern] = useState<BranchPattern | null>(null);
  const [description, setDescription] = useState('');
  const [selectedFeatureType, setSelectedFeatureType] = useState<FeatureType>('feature');
  const [generatedBranchName, setGeneratedBranchName] = useState('');
  const [autoSwitch, setAutoSwitch] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      initializeData();
    }
  }, [isOpen, workspaceName]);

  useEffect(() => {
    if (pattern) {
      generateBranchName();
    }
  }, [pattern, description, selectedFeatureType]);

  const initializeData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const info = await GitBranchApi.getSystemInfo();
      setSystemInfo(info);
      
      const defaultPattern = createDefaultBranchPattern(workspaceName, info, selectedFeatureType);
      setPattern(defaultPattern);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize branch creator');
    } finally {
      setIsLoading(false);
    }
  };

  const generateBranchName = async () => {
    if (!pattern) return;

    try {
      const updatedPattern = {
        ...pattern,
        feature_type: selectedFeatureType,
        description: description.trim() || undefined,
      };

      const branchName = await GitBranchApi.generateBranchName(updatedPattern);
      setGeneratedBranchName(branchName);

      // Validate pattern
      const validation = GitBranchApi.validatePattern(updatedPattern);
      setValidationErrors(validation.errors);
    } catch (err) {
      setGeneratedBranchName('');
      setValidationErrors([err instanceof Error ? err.message : 'Invalid branch pattern']);
    }
  };

  const handleCreateBranch = async () => {
    if (!pattern || validationErrors.length > 0) return;

    try {
      setIsCreating(true);
      setError(null);

      const request: BranchCreateRequest = {
        pattern: {
          ...pattern,
          feature_type: selectedFeatureType,
          description: description.trim() || undefined,
        },
        base_branch: undefined, // Use current branch
        auto_switch: autoSwitch,
      };

      const result = await GitBranchApi.createBranch(workspacePath, request);
      
      if (result.created) {
        onBranchCreated?.(result);
        onClose();
        resetForm();
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create branch');
    } finally {
      setIsCreating(false);
    }
  };

  const handleQuickCreate = async () => {
    if (!description.trim()) {
      setError('Description is required for quick create');
      return;
    }

    try {
      setIsCreating(true);
      setError(null);

      const result = await GitBranchApi.quickCreateFeatureBranch(
        workspacePath,
        workspaceName,
        description.trim(),
        selectedFeatureType
      );

      if (result.created) {
        onBranchCreated?.(result);
        onClose();
        resetForm();
      } else {
        setError(result.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create branch');
    } finally {
      setIsCreating(false);
    }
  };

  const resetForm = () => {
    setDescription('');
    setSelectedFeatureType('feature');
    setGeneratedBranchName('');
    setAutoSwitch(true);
    setError(null);
    setValidationErrors([]);
  };

  const canCreate = !isLoading && !isCreating && generatedBranchName && validationErrors.length === 0;

  if (isLoading) {
    return (
      <Modal isOpen={isOpen} onClose={onClose} size="lg">
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 dark:border-slate-600/60">
        <div className="flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-900/20">
            <CodeBracketIcon className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              Create Feature Branch
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Generate a new branch using standardized naming conventions
            </p>
          </div>
        </div>
        
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Content */}
      <div className="py-6 space-y-6">
        {/* System Info Display */}
        {systemInfo && (
          <Card>
            <CardHeader>
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
                System Information
              </h3>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-3 gap-4 text-sm">
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
              </div>
            </CardBody>
          </Card>
        )}

        {/* Feature Type Selection */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
            Feature Type *
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {FEATURE_TYPES.map((type) => (
              <button
                key={type.value}
                onClick={() => setSelectedFeatureType(type.value)}
                className={cn(
                  'p-3 rounded-lg border-2 transition-all duration-200 text-left',
                  selectedFeatureType === type.value
                    ? 'border-primary-300 bg-primary-50 dark:border-primary-600 dark:bg-primary-900/20'
                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-500'
                )}
              >
                <div className="flex items-center space-x-2 mb-1">
                  <span className="text-lg">{getFeatureTypeIcon(type.value)}</span>
                  <span className="font-medium text-slate-900 dark:text-slate-100">
                    {type.label}
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {type.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Description Input */}
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
            Description *
          </label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g., add payment endpoints, fix user authentication bug"
            className="w-full"
          />
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Brief description of what you're working on (will be included in branch name)
          </p>
        </div>

        {/* Generated Branch Name Preview */}
        {generatedBranchName && (
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <CommandLineIcon className="w-5 h-5 text-slate-500" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
                  Generated Branch Name
                </h3>
              </div>
            </CardHeader>
            <CardBody>
              <div className="font-mono text-sm p-3 bg-slate-100 dark:bg-slate-800 rounded-lg break-all">
                {generatedBranchName}
              </div>
              <div className="mt-2 flex items-center space-x-2">
                <span className={cn('px-2 py-1 rounded text-xs font-medium', getFeatureTypeColor(selectedFeatureType))}>
                  {getFeatureTypeIcon(selectedFeatureType)} {selectedFeatureType}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  Length: {generatedBranchName.length} characters
                </span>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <Card>
            <CardBody>
              <div className="text-red-600 dark:text-red-400">
                <h4 className="font-medium mb-2">Validation Errors:</h4>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  {validationErrors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Options */}
        <div>
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={autoSwitch}
              onChange={(e) => setAutoSwitch(e.target.checked)}
              className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Switch to new branch after creation
            </span>
          </label>
        </div>

        {/* Error Display */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-200/60 dark:border-slate-600/60">
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            onClick={handleQuickCreate}
            disabled={!description.trim() || isCreating}
            className="flex items-center space-x-2"
          >
            <SparklesIcon className="w-4 h-4" />
            <span>Quick Create</span>
          </Button>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={isCreating}
          >
            Cancel
          </Button>
          
          <Button
            variant="primary"
            onClick={handleCreateBranch}
            disabled={!canCreate}
            className="flex items-center space-x-2"
          >
            {isCreating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                <span>Creating...</span>
              </>
            ) : (
              <>
                <CheckIcon className="w-4 h-4" />
                <span>Create Branch</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};