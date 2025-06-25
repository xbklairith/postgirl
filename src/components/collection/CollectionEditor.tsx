import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  FolderIcon,
} from '@heroicons/react/24/outline';
import { Button, Input, Card, CardHeader, CardBody, Modal } from '../ui';
import type { Collection } from '../../types/collection';

interface CollectionEditorProps {
  collection?: Collection;
  isOpen: boolean;
  onClose: () => void;
  onSave: (collection: Collection) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  workspaceId?: string;
}

interface CollectionFormData {
  name: string;
  description: string;
  folder_path: string;
  git_branch: string;
}

export const CollectionEditor: React.FC<CollectionEditorProps> = ({
  collection,
  isOpen,
  onClose,
  onSave,
  onDelete,
  onDuplicate,
  workspaceId
}) => {
  const [formData, setFormData] = useState<CollectionFormData>({
    name: '',
    description: '',
    folder_path: '',
    git_branch: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Initialize form data when collection changes
  useEffect(() => {
    if (collection) {
      setFormData({
        name: collection.name,
        description: collection.description || '',
        folder_path: collection.folder_path || '',
        git_branch: collection.git_branch || '',
      });
    } else {
      setFormData({
        name: '',
        description: '',
        folder_path: '',
        git_branch: '',
      });
    }
  }, [collection]);

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    setIsSaving(true);
    try {
      const collectionToSave: Collection = {
        id: collection?.id || crypto.randomUUID(),
        workspace_id: collection?.workspace_id || workspaceId || '',
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        folder_path: formData.folder_path.trim() || undefined,
        git_branch: formData.git_branch.trim() || undefined,
        is_active: collection?.is_active || false,
        created_at: collection?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await onSave(collectionToSave);
      onClose();
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!collection || !onDelete) return;
    
    try {
      await onDelete();
      setShowDeleteConfirm(false);
      onClose();
    } catch (error) {
      console.error('Delete error:', error);
    }
  };

  const handleDuplicate = () => {
    if (!collection || !onDuplicate) return;
    
    onDuplicate();
    onClose();
  };

  const canSave = formData.name.trim();

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="lg"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200/60 dark:border-slate-600/60">
          <div>
            <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
              {collection ? 'Edit Collection' : 'Create Collection'}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {collection ? 'Update collection details' : 'Create a new collection to organize your requests'}
            </p>
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
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center space-x-2">
                <FolderIcon className="w-5 h-5 text-slate-500" />
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
                  Basic Information
                </h3>
              </div>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Collection Name *
                </label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., User Management API, Payment Service"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe what this collection contains..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
                />
              </div>
            </CardBody>
          </Card>

          {/* Organization */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
                Organization
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Optional settings to help organize your collections
              </p>
            </CardHeader>
            <CardBody className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Folder Path
                </label>
                <Input
                  value={formData.folder_path}
                  onChange={(e) => setFormData(prev => ({ ...prev, folder_path: e.target.value }))}
                  placeholder="e.g., /api/v1, /microservices/auth"
                  className="w-full"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Virtual folder path for organizing collections
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Git Branch
                </label>
                <Input
                  value={formData.git_branch}
                  onChange={(e) => setFormData(prev => ({ ...prev, git_branch: e.target.value }))}
                  placeholder="e.g., main, develop, feature/new-api"
                  className="w-full"
                />
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Associate this collection with a specific Git branch
                </p>
              </div>
            </CardBody>
          </Card>

          {/* Metadata */}
          {collection && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">
                  Metadata
                </h3>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-2 gap-4 text-sm text-slate-500 dark:text-slate-400">
                  <div>
                    <span className="font-medium">Created:</span> {new Date(collection.created_at).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">Modified:</span> {new Date(collection.updated_at).toLocaleDateString()}
                  </div>
                  <div>
                    <span className="font-medium">ID:</span> {collection.id}
                  </div>
                  <div>
                    <span className="font-medium">Status:</span> {collection.is_active ? 'Active' : 'Inactive'}
                  </div>
                </div>
              </CardBody>
            </Card>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-6 border-t border-slate-200/60 dark:border-slate-600/60">
          <div className="flex items-center space-x-2">
            {collection && onDuplicate && (
              <Button
                variant="ghost"
                onClick={handleDuplicate}
                className="flex items-center space-x-2"
              >
                <DocumentDuplicateIcon className="w-4 h-4" />
                <span>Duplicate</span>
              </Button>
            )}

            {collection && onDelete && (
              <Button
                variant="ghost"
                onClick={() => setShowDeleteConfirm(true)}
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
              disabled={!canSave || isSaving}
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
                  <span>{collection ? 'Update' : 'Create'}</span>
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
                Delete Collection
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                Are you sure you want to delete the collection "{collection?.name}"? 
                This will also delete all requests in this collection. This action cannot be undone.
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
                  Delete Collection
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </>
  );
};