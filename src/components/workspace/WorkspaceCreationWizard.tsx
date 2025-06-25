import React, { useState, useCallback } from 'react';
import { FolderIcon, LinkIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { useWorkspaceStore } from '../../stores/workspace-store';
import { Button, Input, Modal } from '../ui';
import { checkDirectoryExists } from '../../services/workspace-api';
import type { CreateWorkspaceRequest } from '../../types/workspace';

interface WorkspaceCreationWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (workspaceId: string) => void;
}

export const WorkspaceCreationWizard: React.FC<WorkspaceCreationWizardProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<CreateWorkspaceRequest>({
    name: '',
    description: '',
    git_repository_url: '',
    local_path: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [directoryExists, setDirectoryExists] = useState(false);
  const [checkingDirectory, setCheckingDirectory] = useState(false);
  
  const { createWorkspace, isLoading, error } = useWorkspaceStore();

  const handleInputChange = (field: keyof CreateWorkspaceRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateStep1 = () => {
    const newErrors: Record<string, string> = {};
    
    // Step 1 now validates Git URL if provided
    if (formData.git_repository_url && !isValidUrl(formData.git_repository_url)) {
      newErrors.git_repository_url = 'Please enter a valid Git repository URL';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Function to check if directory exists
  const checkDirectoryExistence = useCallback(async (path: string) => {
    if (!path.trim()) {
      setDirectoryExists(false);
      return;
    }

    setCheckingDirectory(true);
    try {
      const exists = await checkDirectoryExists(path);
      setDirectoryExists(exists);
      
      if (exists) {
        setErrors(prev => ({
          ...prev,
          local_path: 'Directory already exists. Please choose a different location.'
        }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.local_path;
          return newErrors;
        });
      }
    } catch (error) {
      console.error('Error checking directory:', error);
      setDirectoryExists(false);
    } finally {
      setCheckingDirectory(false);
    }
  }, []);

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    
    // Step 2 now validates workspace details
    if (!formData.name.trim()) {
      newErrors.name = 'Workspace name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Workspace name must be at least 2 characters';
    }
    
    if (!formData.local_path.trim()) {
      newErrors.local_path = 'Local path is required';
    } else if (directoryExists) {
      newErrors.local_path = 'Directory already exists. Please choose a different location.';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0 && !directoryExists;
  };

  const isValidUrl = (url: string) => {
    if (!url.trim()) return false;
    
    // Check for SSH format: git@hostname:username/repo.git
    const sshPattern = /^git@[a-zA-Z0-9.-]+:[a-zA-Z0-9._/-]+\.git$/;
    if (sshPattern.test(url)) {
      return true;
    }
    
    // Check for HTTPS/HTTP format
    try {
      const urlObj = new URL(url);
      return (urlObj.protocol === 'https:' || urlObj.protocol === 'http:') && 
             urlObj.pathname.endsWith('.git');
    } catch {
      return false;
    }
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) {
      setStep(2);
    }
  };

  const handleBack = () => {
    setStep(1);
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;
    
    try {
      const workspace = await createWorkspace({
        ...formData,
        description: formData.description || undefined,
        git_repository_url: formData.git_repository_url || undefined
      });
      
      onSuccess?.(workspace.id);
      handleClose();
    } catch (error) {
      // Error is handled by the store
    }
  };

  const handleClose = () => {
    setStep(1);
    setFormData({
      name: '',
      description: '',
      git_repository_url: '',
      local_path: ''
    });
    setErrors({});
    setDirectoryExists(false);
    setCheckingDirectory(false);
    onClose();
  };

  const extractRepoNameFromGitUrl = (gitUrl: string): string => {
    if (!gitUrl) return '';
    
    try {
      // Handle SSH format: git@github.com:user/repo.git
      if (gitUrl.startsWith('git@')) {
        const sshMatch = gitUrl.match(/git@[^:]+:(.+)\.git$/);
        if (sshMatch) {
          const fullPath = sshMatch[1];
          const parts = fullPath.split('/');
          return parts[parts.length - 1]; // Get the last part (repo name)
        }
      }
      
      // Handle HTTPS format: https://github.com/user/repo.git
      if (gitUrl.startsWith('http')) {
        const url = new URL(gitUrl);
        const pathParts = url.pathname.split('/').filter(part => part);
        if (pathParts.length > 0) {
          const lastPart = pathParts[pathParts.length - 1];
          // Remove .git extension if present
          return lastPart.replace(/\.git$/, '');
        }
      }
    } catch (error) {
      // If parsing fails, return empty string
      console.warn('Could not extract repo name from Git URL:', gitUrl);
    }
    
    return '';
  };

  const generateWorkspaceNameFromGit = (gitUrl: string): string => {
    const repoName = extractRepoNameFromGitUrl(gitUrl);
    if (!repoName) return '';
    
    // Convert to human-readable format
    return repoName
      .replace(/[-_]/g, ' ') // Replace dashes and underscores with spaces
      .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize first letter of each word
  };

  const generateLocalPath = (name: string) => {
    const sanitized = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    return `~/Documents/Postgirl/${sanitized}`;
  };

  // Auto-generate workspace name from Git URL
  React.useEffect(() => {
    if (formData.git_repository_url && !formData.name) {
      const suggestedName = generateWorkspaceNameFromGit(formData.git_repository_url);
      if (suggestedName) {
        setFormData(prev => ({
          ...prev,
          name: suggestedName
        }));
      }
    }
  }, [formData.git_repository_url, formData.name]);

  // Auto-generate local path when name changes
  React.useEffect(() => {
    if (formData.name) {
      setFormData(prev => ({
        ...prev,
        local_path: generateLocalPath(formData.name)
      }));
    }
  }, [formData.name]);

  // Check directory existence when local path changes
  React.useEffect(() => {
    if (formData.local_path.trim() && step === 2) {
      const timeoutId = setTimeout(() => {
        checkDirectoryExistence(formData.local_path);
      }, 500); // Debounce for 500ms

      return () => clearTimeout(timeoutId);
    }
  }, [formData.local_path, step, checkDirectoryExistence]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Create New Workspace"
      size="lg"
    >
      <div className="space-y-6">
        {/* Progress Indicator */}
        <div className="flex items-center justify-center space-x-4">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
            step >= 1 
              ? 'bg-primary-500 text-white' 
              : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
          }`}>
            1
          </div>
          <div className={`h-1 w-12 rounded ${
            step >= 2 ? 'bg-primary-500' : 'bg-slate-200 dark:bg-slate-700'
          }`} />
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
            step >= 2 
              ? 'bg-primary-500 text-white' 
              : 'bg-slate-200 dark:bg-slate-700 text-slate-500'
          }`}>
            2
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <h4 className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                  Workspace Creation Failed
                </h4>
                <div className="text-sm text-red-700 dark:text-red-300 whitespace-pre-line">
                  {error}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 1: Git Repository (Git-First Approach) */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <LinkIcon className="w-12 h-12 mx-auto text-primary-500 mb-2" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
                Connect Git Repository
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Link your workspace to a Git repository for team collaboration
              </p>
            </div>

            <Input
              label="Git Repository URL"
              placeholder="https://github.com/username/repo.git"
              value={formData.git_repository_url}
              onChange={(e) => handleInputChange('git_repository_url', e.target.value)}
              error={errors.git_repository_url}
              leftIcon={<LinkIcon className="w-4 h-4" />}
            />

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start space-x-2">
                <LinkIcon className="w-5 h-5 text-blue-500 mt-0.5" />
                <div>
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    Git-First Workflow
                  </h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Connecting a Git repository enables version control, team collaboration, and branch-based development workflows.
                  </p>
                  {formData.git_repository_url && (
                    <p className="text-sm text-blue-600 dark:text-blue-400 mt-2 font-medium">
                      💡 Workspace name will be auto-generated from repository: "{generateWorkspaceNameFromGit(formData.git_repository_url)}"
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-between space-x-3 pt-4">
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <div className="flex space-x-3">
                <Button variant="ghost" onClick={handleNext}>
                  Skip Git (Local Only)
                </Button>
                <Button variant="primary" onClick={handleNext}>
                  Continue with Git
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Workspace Details */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <FolderIcon className="w-12 h-12 mx-auto text-primary-500 mb-2" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
                Workspace Details
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Configure your workspace name and location
              </p>
            </div>

            <Input
              label="Workspace Name"
              placeholder="My API Project"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              error={errors.name}
              leftIcon={<FolderIcon className="w-4 h-4" />}
            />

            <Input
              label="Description (optional)"
              placeholder="A brief description of your workspace..."
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              error={errors.description}
              leftIcon={<DocumentTextIcon className="w-4 h-4" />}
            />

            <div className="relative">
              <Input
                label="Local Path"
                placeholder="/path/to/workspace"
                value={formData.local_path}
                onChange={(e) => handleInputChange('local_path', e.target.value)}
                error={errors.local_path}
                leftIcon={<FolderIcon className="w-4 h-4" />}
              />
              {checkingDirectory && (
                <div className="absolute right-3 top-9 flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-primary-500"></div>
                </div>
              )}
              {formData.local_path && !checkingDirectory && (
                <div className="absolute right-3 top-9 flex items-center">
                  {directoryExists ? (
                    <div className="w-4 h-4 rounded-full bg-red-100 flex items-center justify-center">
                      <svg className="w-3 h-3 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center">
                      <svg className="w-3 h-3 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
              <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                Summary
              </h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Type:</span>
                  <span className={`font-medium ${formData.git_repository_url ? 'text-green-600 dark:text-green-400' : 'text-slate-600 dark:text-slate-400'}`}>
                    {formData.git_repository_url ? 'Git-Connected Workspace' : 'Local-Only Workspace'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Name:</span>
                  <span className="text-slate-900 dark:text-slate-100">{formData.name}</span>
                </div>
                {formData.description && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Description:</span>
                    <span className="text-slate-900 dark:text-slate-100 truncate ml-2">
                      {formData.description}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500 dark:text-slate-400">Path:</span>
                  <span className="text-slate-900 dark:text-slate-100 truncate ml-2">
                    {formData.local_path}
                  </span>
                </div>
                {formData.git_repository_url && (
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Git URL:</span>
                    <span className="text-slate-900 dark:text-slate-100 truncate ml-2">
                      {formData.git_repository_url}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-between space-x-3 pt-4">
              <Button variant="ghost" onClick={handleBack}>
                Back
              </Button>
              <div className="flex space-x-3">
                <Button variant="ghost" onClick={handleClose}>
                  Cancel
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleSubmit}
                  loading={isLoading || checkingDirectory}
                  disabled={directoryExists || checkingDirectory}
                >
                  Create Workspace
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};