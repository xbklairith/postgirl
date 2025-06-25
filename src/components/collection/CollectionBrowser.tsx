import React, { useState, useEffect } from 'react';
import {
  FolderIcon,
  FolderOpenIcon,
  DocumentTextIcon,
  PlusIcon,
  EllipsisVerticalIcon,
  MagnifyingGlassIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { Button, Input } from '../ui';
import { CollectionEditor } from './CollectionEditor';
import { RequestList } from './RequestList';
import { CollectionApiService } from '../../services/collection-api';
import { cn } from '../../utils/cn';
import type { Collection, CollectionSummary, Request } from '../../types/collection';

interface CollectionBrowserProps {
  workspaceId: string;
  onRequestSelect?: (request: Request) => void;
  onRequestEdit?: (request: Request) => void;
  className?: string;
}

export const CollectionBrowser: React.FC<CollectionBrowserProps> = ({
  workspaceId,
  onRequestSelect,
  onRequestEdit,
  className
}) => {
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | undefined>();

  useEffect(() => {
    loadCollections();
  }, [workspaceId]);

  const loadCollections = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const summaries = await CollectionApiService.getCollectionSummaries(workspaceId);
      setCollections(summaries);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load collections';
      setError(errorMessage);
      console.error('Error loading collections:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCollection = () => {
    setEditingCollection(undefined);
    setIsEditorOpen(true);
  };

  const handleEditCollection = async (id: string) => {
    try {
      const collection = await CollectionApiService.getCollection(id);
      if (collection) {
        setEditingCollection(collection);
        setIsEditorOpen(true);
      }
    } catch (err) {
      console.error('Failed to load collection for editing:', err);
    }
  };

  const handleSaveCollection = async (collection: Collection) => {
    try {
      if (editingCollection) {
        await CollectionApiService.updateCollection({
          id: collection.id,
          name: collection.name,
          description: collection.description,
          folder_path: collection.folder_path,
          git_branch: collection.git_branch,
        });
      } else {
        await CollectionApiService.createCollection({
          workspace_id: workspaceId,
          name: collection.name,
          description: collection.description,
          folder_path: collection.folder_path,
          git_branch: collection.git_branch,
        });
      }
      
      await loadCollections();
      setIsEditorOpen(false);
    } catch (err) {
      console.error('Failed to save collection:', err);
    }
  };

  const handleDeleteCollection = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this collection? All requests in it will be lost.')) {
      try {
        await CollectionApiService.deleteCollection(id);
        await loadCollections();
        
        // Clear selection if deleted collection was selected
        if (selectedCollection === id) {
          setSelectedCollection(null);
        }
        
        // Remove from expanded collections
        setExpandedCollections(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      } catch (err) {
        console.error('Failed to delete collection:', err);
      }
    }
  };

  const handleDuplicateCollection = async (id: string) => {
    try {
      const original = await CollectionApiService.getCollection(id);
      if (original) {
        await CollectionApiService.duplicateCollection(id, `${original.name} (Copy)`, workspaceId);
        await loadCollections();
      }
    } catch (err) {
      console.error('Failed to duplicate collection:', err);
    }
  };

  const toggleCollectionExpanded = (id: string) => {
    setExpandedCollections(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const filteredCollections = collections.filter(collection =>
    !searchQuery || 
    collection.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (collection.description && collection.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-700 dark:text-red-300">{error}</p>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={loadCollections}
          className="mt-2 text-red-600 hover:text-red-700"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('flex h-full', className)}>
      {/* Collections Sidebar */}
      <div className="w-80 border-r border-slate-200/60 dark:border-slate-600/60 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-slate-200/60 dark:border-slate-600/60">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Collections
            </h2>
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateCollection}
              className="flex items-center space-x-1"
            >
              <PlusIcon className="w-4 h-4" />
              <span>New</span>
            </Button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Search collections..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 text-sm"
            />
          </div>
        </div>

        {/* Collections List */}
        <div className="flex-1 overflow-auto">
          {filteredCollections.length === 0 ? (
            <div className="p-4 text-center text-slate-500 dark:text-slate-400">
              {collections.length === 0 ? (
                <div>
                  <FolderIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No collections yet</p>
                  <p className="text-xs mt-1">Create your first collection to organize requests</p>
                </div>
              ) : (
                <p>No collections match your search</p>
              )}
            </div>
          ) : (
            <div className="p-2">
              {filteredCollections.map((collection) => {
                const isExpanded = expandedCollections.has(collection.id);
                const isSelected = selectedCollection === collection.id;
                
                return (
                  <div key={collection.id} className="mb-1">
                    <div
                      className={cn(
                        'flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-colors',
                        'hover:bg-slate-100/60 dark:hover:bg-slate-700/60',
                        isSelected && 'bg-primary-50/60 dark:bg-primary-900/20 ring-1 ring-primary-200/50 dark:ring-primary-700/50'
                      )}
                      onClick={() => {
                        setSelectedCollection(collection.id);
                        toggleCollectionExpanded(collection.id);
                      }}
                    >
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCollectionExpanded(collection.id);
                        }}
                        className="flex items-center justify-center w-4 h-4"
                      >
                        {isExpanded ? (
                          <ChevronDownIcon className="w-3 h-3 text-slate-400" />
                        ) : (
                          <ChevronRightIcon className="w-3 h-3 text-slate-400" />
                        )}
                      </button>
                      
                      {isExpanded ? (
                        <FolderOpenIcon className="w-4 h-4 text-slate-500" />
                      ) : (
                        <FolderIcon className="w-4 h-4 text-slate-500" />
                      )}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-sm truncate">
                            {collection.name}
                          </span>
                          <span className="text-xs text-slate-400 ml-2">
                            {collection.request_count}
                          </span>
                        </div>
                        {collection.description && (
                          <p className="text-xs text-slate-500 truncate mt-0.5">
                            {collection.description}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditCollection(collection.id);
                          }}
                          className="p-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-600/60 transition-colors"
                          title="Edit collection"
                        >
                          <EllipsisVerticalIcon className="w-3 h-3 text-slate-400" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Requests in collection */}
                    {isExpanded && (
                      <div className="ml-6 mt-1">
                        <RequestList
                          collectionId={collection.id}
                          onRequestSelect={onRequestSelect}
                          onRequestEdit={onRequestEdit}
                          compact
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {selectedCollection ? (
          <RequestList
            collectionId={selectedCollection}
            onRequestSelect={onRequestSelect}
            onRequestEdit={onRequestEdit}
            showHeader
          />
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 dark:text-slate-400">
            <div className="text-center">
              <DocumentTextIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Select a Collection</h3>
              <p className="text-sm">Choose a collection from the sidebar to view its requests</p>
            </div>
          </div>
        )}
      </div>

      {/* Collection Editor Modal */}
      <CollectionEditor
        collection={editingCollection}
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSaveCollection}
        onDelete={editingCollection ? () => handleDeleteCollection(editingCollection.id) : undefined}
        onDuplicate={editingCollection ? () => handleDuplicateCollection(editingCollection.id) : undefined}
      />
    </div>
  );
};