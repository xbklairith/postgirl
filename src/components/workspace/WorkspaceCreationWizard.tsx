import React, { useState } from 'react';
import { FolderIcon, LinkIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { useWorkspaceStore } from '../../stores/workspace-store';
import { Button, Input, Modal } from '../ui';
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
    
    if (!formData.name.trim()) {
      newErrors.name = 'Workspace name is required';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Workspace name must be at least 2 characters';
    }
    
    if (!formData.local_path.trim()) {
      newErrors.local_path = 'Local path is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors: Record<string, string> = {};
    
    if (formData.git_repository_url && !isValidUrl(formData.git_repository_url)) {
      newErrors.git_repository_url = 'Please enter a valid Git repository URL';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return url.startsWith('http') || url.startsWith('git@');
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
    onClose();
  };

  const generateLocalPath = (name: string) => {
    const sanitized = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    return `~/Documents/Postgirl/${sanitized}`;
  };

  // Auto-generate local path when name changes
  React.useEffect(() => {
    if (formData.name && !formData.local_path) {
      setFormData(prev => ({
        ...prev,
        local_path: generateLocalPath(prev.name)
      }));
    }
  }, [formData.name, formData.local_path]);

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
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Step 1: Basic Information */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <FolderIcon className="w-12 h-12 mx-auto text-primary-500 mb-2" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
                Basic Information
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Set up your workspace name and location
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

            <Input
              label="Local Path"
              placeholder="/path/to/workspace"
              value={formData.local_path}
              onChange={(e) => handleInputChange('local_path', e.target.value)}
              error={errors.local_path}
              leftIcon={<FolderIcon className="w-4 h-4" />}
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button variant="ghost" onClick={handleClose}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleNext}>
                Next
              </Button>
            </div>
          </div>
        )}

        {/* Step 2: Git Configuration */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <LinkIcon className="w-12 h-12 mx-auto text-primary-500 mb-2" />
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
                Git Configuration
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Connect your workspace to a Git repository (optional)
              </p>
            </div>

            <Input
              label="Git Repository URL (optional)"
              placeholder="https://github.com/username/repo.git"
              value={formData.git_repository_url}
              onChange={(e) => handleInputChange('git_repository_url', e.target.value)}
              error={errors.git_repository_url}
              leftIcon={<LinkIcon className="w-4 h-4" />}
            />

            <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4">
              <h4 className="font-medium text-slate-900 dark:text-slate-100 mb-2">
                Summary
              </h4>
              <div className="space-y-2 text-sm">
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
                  loading={isLoading}
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