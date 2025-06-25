import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  DocumentDuplicateIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { Button, Input, Card, CardHeader, CardBody, Modal } from '../ui';
import { EnvironmentVariableEditor } from './EnvironmentVariableEditor';
import type { 
  Environment, 
  EnvironmentFormData 
} from '../../types/environment';
import { createDefaultEnvironment } from '../../types/environment';

interface EnvironmentEditorProps {
  environment?: Environment;
  isOpen: boolean;
  onClose: () => void;
  onSave: (environment: Environment) => void;
  onDelete?: (environmentId: string) => void;
  onDuplicate?: (environment: Environment) => void;
  readOnly?: boolean;
  title?: string;
}

export const EnvironmentEditor: React.FC<EnvironmentEditorProps> = ({
  environment,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onDuplicate,
  readOnly = false,
  title
}) => {
  const [formData, setFormData] = useState<EnvironmentFormData>({
    name: '',
    variables: []
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Initialize form data when environment changes
  useEffect(() => {
    if (environment) {
      setFormData({
        name: environment.name,
        variables: Object.values(environment.variables)
      });
    } else {
      const defaultEnv = createDefaultEnvironment();
      setFormData({
        name: defaultEnv.name,
        variables: []
      });
    }
  }, [environment]);

  const handleVariablesChange = (variables: Record<string, any>) => {
    setFormData(prev => ({
      ...prev,
      variables: Object.values(variables)
    }));
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    setIsSaving(true);
    try {
      const environmentToSave: Environment = {
        id: environment?.id || crypto.randomUUID(),
        name: formData.name.trim(),
        variables: formData.variables.reduce((acc, variable) => {
          if (variable.key.trim()) { // Only include variables with valid keys
            acc[variable.key] = variable;
          }
          return acc;
        }, {} as Record<string, any>),
        isActive: environment?.isActive || false,
        createdAt: environment?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      console.log('Saving environment with variables:', environmentToSave);
      await onSave(environmentToSave);
      onClose();
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!environment || !onDelete) return;
    
    try {
      await onDelete(environment.id);
      setShowDeleteConfirm(false);
      onClose();
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleDuplicate = () => {
    if (!environment || !onDuplicate) return;
    
    // Generate clean duplicate name
    const cleanName = environment.name.replace(/\s*\(Copy\)(\s*\(Copy\))*/g, '');
    
    const duplicatedEnv: Environment = {
      ...environment,
      id: crypto.randomUUID(),
      name: `${cleanName} (Copy)`,
      isActive: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    onDuplicate(duplicatedEnv);
  };

  const canSave = formData.name.trim();

  const variables = formData.variables.reduce((acc, variable) => {
    acc[variable.key] = variable;
    return acc;
  }, {} as Record<string, any>);

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 dark:border-slate-600/60">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              {title || (environment ? 'Edit Environment' : 'Create Environment')}
            </h2>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="py-6 space-y-6">
            {/* Basic Information */}
            <Card>
              <CardHeader>
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
                  Basic Information
                </h3>
              </CardHeader>
              <CardBody className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Environment Name *
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Development, Staging, Production"
                    disabled={readOnly}
                  />
                </div>


                {environment && (
                  <div className="grid grid-cols-2 gap-4 text-sm text-slate-500 dark:text-slate-400">
                    <div>
                      <span className="font-medium">Created:</span> {new Date(environment.createdAt).toLocaleDateString()}
                    </div>
                    <div>
                      <span className="font-medium">Modified:</span> {new Date(environment.updatedAt).toLocaleDateString()}
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Variables */}
            <EnvironmentVariableEditor
              variables={variables}
              onChange={handleVariablesChange}
              readOnly={readOnly}
            />

        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-200/60 dark:border-slate-600/60 bg-slate-50/50 dark:bg-slate-800/50">
            <div className="flex items-center space-x-2">
              {environment && onDuplicate && (
                <Button
                  variant="ghost"
                  onClick={handleDuplicate}
                  disabled={readOnly}
                  className="flex items-center space-x-2"
                >
                  <DocumentDuplicateIcon className="w-4 h-4" />
                  <span>Duplicate</span>
                </Button>
              )}

              {environment && onDelete && (
                <Button
                  variant="ghost"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={readOnly}
                  className="flex items-center space-x-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <TrashIcon className="w-4 h-4" />
                  <span>Delete</span>
                </Button>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <Button
                variant="secondary"
                onClick={onClose}
              >
                Cancel
              </Button>
              
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={!canSave || isSaving || readOnly}
                className="flex items-center space-x-2"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckIcon className="w-4 h-4" />
                    <span>{environment ? 'Update' : 'Create'}</span>
                  </>
                )}
              </Button>
            </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        size="md"
      >
        <div className="p-6">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                Delete Environment
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Are you sure you want to delete the environment "{environment?.name}"? This action cannot be undone.
              </p>
              <div className="flex items-center space-x-3">
                <Button
                  variant="secondary"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleDelete}
                  className="bg-red-600 hover:bg-red-700 border-red-600 hover:border-red-700"
                >
                  Delete Environment
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};