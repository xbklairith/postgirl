import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  FolderIcon,
  FolderOpenIcon,
  PlusIcon,
  EllipsisVerticalIcon,
  MagnifyingGlassIcon,
  ChevronRightIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { Button, Input } from '../ui';
import { CollectionEditor } from './CollectionEditor';
import { CollectionApiService } from '../../services/collection-api';
import { cn } from '../../utils/cn';
import type { Collection, CollectionSummary, Request } from '../../types/collection';
import { getMethodColor } from '../../types/http';

interface CollectionBrowserProps {
  workspaceId: string;
  selectedCollectionId?: string | null;
  selectedRequest?: any | null;
  onCollectionSelect?: (collectionId: string) => void;
  onRequestSelect?: (request: Request) => void;
  onRequestEdit?: (request: Request) => void;
  onRequestCreate?: (collectionId: string) => void;
  refreshTrigger?: number; // Add this to trigger refreshes from parent
  className?: string;
}

export const CollectionBrowser: React.FC<CollectionBrowserProps> = ({
  workspaceId,
  selectedCollectionId,
  selectedRequest,
  onCollectionSelect,
  onRequestSelect,
  onRequestCreate,
  refreshTrigger,
  className
}) => {
  const [collections, setCollections] = useState<CollectionSummary[]>([]);
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingCollection, setEditingCollection] = useState<Collection | undefined>();
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [dropdownPosition, setDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const menuButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});
  const [collectionRequests, setCollectionRequests] = useState<{ [key: string]: Request[] }>({});
  const [openRequestMenuId, setOpenRequestMenuId] = useState<string | null>(null);
  const [requestDropdownPosition, setRequestDropdownPosition] = useState<{ top: number; left: number } | null>(null);
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [editingRequestName, setEditingRequestName] = useState('');

  useEffect(() => {
    loadCollections();
  }, [workspaceId]);

  useEffect(() => {
    console.log('CollectionBrowser onRequestCreate callback:', !!onRequestCreate);
  }, [onRequestCreate]);

  // Refresh collections and requests when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      console.log('CollectionBrowser: Refresh triggered, reloading collections and requests');
      loadCollections();
      
      // Reload requests for all expanded collections
      Object.keys(collectionRequests).forEach(collectionId => {
        loadRequestsForCollection(collectionId);
      });
    }
  }, [refreshTrigger]);

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

  const loadRequestsForCollection = async (collectionId: string) => {
    try {
      const requests = await CollectionApiService.listRequests(collectionId);
      setCollectionRequests(prev => ({
        ...prev,
        [collectionId]: requests
      }));
    } catch (err) {
      console.error('Error loading requests for collection:', collectionId, err);
    }
  };

  const handleRenameRequest = async (requestId: string, newName: string) => {
    try {
      await CollectionApiService.updateRequest({
        id: requestId,
        name: newName.trim()
      });
      
      // Reload requests for all collections to update the display
      Object.keys(collectionRequests).forEach(collectionId => {
        loadRequestsForCollection(collectionId);
      });
      
      setEditingRequestId(null);
      setEditingRequestName('');
    } catch (err) {
      console.error('Failed to rename request:', err);
    }
  };

  const handleDeleteRequest = async (requestId: string, requestName: string) => {
    if (window.confirm(`Are you sure you want to delete "${requestName}"?`)) {
      try {
        await CollectionApiService.deleteRequest(requestId);
        
        // Reload requests for all collections to update the display
        Object.keys(collectionRequests).forEach(collectionId => {
          loadRequestsForCollection(collectionId);
        });
        
        // Clear selection if deleted request was selected
        if (selectedRequest?.id === requestId) {
          onRequestSelect?.(null as any);
        }
      } catch (err) {
        console.error('Failed to delete request:', err);
      }
    }
  };

  const handleDuplicateRequest = async (requestId: string, requestName: string) => {
    try {
      await CollectionApiService.duplicateRequest(requestId, `${requestName} (Copy)`);
      
      // Reload requests for all collections to update the display
      Object.keys(collectionRequests).forEach(collectionId => {
        loadRequestsForCollection(collectionId);
      });
    } catch (err) {
      console.error('Failed to duplicate request:', err);
    }
  };

  const handleCreateCollection = () => {
    if (isCreatingCollection) return; // Prevent multiple creation modes
    setIsCreatingCollection(true);
    setNewCollectionName('');
    setOpenMenuId(null); // Close any open menus
  };

  const handleCreateCollectionSubmit = async () => {
    const trimmedName = newCollectionName.trim();
    if (!trimmedName) {
      return;
    }

    // Validate workspace ID
    if (!workspaceId || workspaceId.trim() === '') {
      alert('No workspace selected. Please select a workspace first.');
      return;
    }

    // Check for duplicate names
    if (collections.some(c => c.name.toLowerCase() === trimmedName.toLowerCase())) {
      alert('A collection with this name already exists');
      return;
    }

    try {
      await CollectionApiService.createCollection({
        workspace_id: workspaceId,
        name: trimmedName,
      });
      
      await loadCollections();
      setIsCreatingCollection(false);
      setNewCollectionName('');
    } catch (err) {
      console.error('Failed to create collection:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      if (errorMessage.includes('FOREIGN KEY constraint failed')) {
        alert('Invalid workspace. Please select a valid workspace and try again.');
      } else {
        alert(`Failed to create collection: ${errorMessage}`);
      }
    }
  };

  const handleCreateCollectionCancel = () => {
    setIsCreatingCollection(false);
    setNewCollectionName('');
  };

  // Close dropdown when clicking outside or pressing escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpenMenuId(null);
        setDropdownPosition(null);
        setOpenRequestMenuId(null);
        setRequestDropdownPosition(null);
        setEditingRequestId(null);
        setEditingRequestName('');
        if (isCreatingCollection) {
          handleCreateCollectionCancel();
        }
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (openMenuId && !target.closest('[data-dropdown-portal="collection-menu"]')) {
        setOpenMenuId(null);
        setDropdownPosition(null);
      }
      if (openRequestMenuId && !target.closest('[data-dropdown-portal="request-menu"]')) {
        setOpenRequestMenuId(null);
        setRequestDropdownPosition(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isCreatingCollection, openMenuId, openRequestMenuId]);

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
        if (selectedCollectionId === id && onCollectionSelect) {
          onCollectionSelect('');
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
        // Load requests when expanding
        loadRequestsForCollection(id);
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
    <>
      <div id="collection-browser" className={cn('flex flex-col h-full', className)} data-testid="collection-browser">
      {/* Header */}
      <div id="collections-header" className="p-4 border-b border-slate-200/60 dark:border-slate-600/60" data-testid="collections-header">
        <div className="flex items-center justify-between mb-3">
          <h2 id="collections-title" className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Collections
          </h2>
          <Button
            id="new-collection-btn"
            variant="primary"
            size="sm"
            onClick={handleCreateCollection}
            disabled={isCreatingCollection}
            className="flex items-center space-x-1"
            data-testid="new-collection-button"
          >
            <PlusIcon className="w-4 h-4" />
            <span>New</span>
          </Button>
        </div>
        
        {/* Search */}
        <div id="collections-search" className="relative" data-testid="collections-search">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
          <Input
            id="search-collections-input"
            placeholder="Search collections..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 text-sm"
            data-testid="search-input"
          />
        </div>
      </div>

      {/* Collections List */}
      <div id="collections-list" className="flex-1 overflow-auto" data-testid="collections-list">
        <div className="p-4">
            {/* Inline Collection Creation */}
            {isCreatingCollection && (
              <div id="collection-creator" className="mb-1" data-testid="collection-creator">
                <div className="flex items-center space-x-2 p-2 bg-primary-50/60 dark:bg-primary-900/20 border border-primary-200/50 dark:border-primary-700/50 rounded-md">
                  <div className="flex items-center justify-center w-4 h-4">
                    {/* Empty space for alignment */}
                  </div>
                  <FolderIcon className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  <div className="flex-1">
                    <input
                      id="new-collection-name-input"
                      type="text"
                      value={newCollectionName}
                      onChange={(e) => setNewCollectionName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleCreateCollectionSubmit();
                        } else if (e.key === 'Escape') {
                          handleCreateCollectionCancel();
                        }
                      }}
                      placeholder="Collection name..."
                      className="w-full text-sm font-medium bg-transparent border-none outline-none text-slate-900 dark:text-slate-100 placeholder-slate-500"
                      autoFocus
                      data-testid="collection-name-input"
                    />
                  </div>
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={handleCreateCollectionSubmit}
                      disabled={!newCollectionName.trim()}
                      className="p-1 rounded text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Save collection"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </button>
                    <button
                      onClick={handleCreateCollectionCancel}
                      className="p-1 rounded text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
                      title="Cancel"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {filteredCollections.length === 0 && !isCreatingCollection ? (
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
              <>
                {filteredCollections.map((collection) => {
                const isExpanded = expandedCollections.has(collection.id);
                const isSelected = selectedCollectionId === collection.id;
                
                return (
                  <div key={collection.id} id={`collection-item-${collection.id}`} className="mb-2" data-testid={`collection-${collection.id}`} data-collection-name={collection.name}>
                    <div
                      id={`collection-header-${collection.id}`}
                      className={cn(
                        'flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all duration-200',
                        'hover:bg-slate-100/60 dark:hover:bg-slate-700/60',
                        isSelected && 'bg-primary-50/60 dark:bg-primary-900/20 ring-1 ring-primary-200/50 dark:ring-primary-700/50'
                      )}
                      onClick={() => {
                        onCollectionSelect?.(collection.id);
                        toggleCollectionExpanded(collection.id);
                      }}
                      data-testid={`collection-header-${collection.id}`}
                      data-selected={isSelected}
                      data-expanded={isExpanded}
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
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm truncate text-slate-900 dark:text-slate-100">
                            {collection.name}
                          </span>
                          <span className="text-xs text-slate-400 ml-2 flex-shrink-0">
                            {collection.request_count}
                          </span>
                        </div>
                        {collection.description && (
                          <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                            {collection.description}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <button
                          ref={(el) => menuButtonRefs.current[collection.id] = el}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (openMenuId === collection.id) {
                              setOpenMenuId(null);
                              setDropdownPosition(null);
                            } else {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setDropdownPosition({
                                top: rect.bottom + window.scrollY + 4,
                                left: rect.right + window.scrollX - 140, // Align to right edge
                              });
                              setOpenMenuId(collection.id);
                            }
                          }}
                          className="p-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-600/60 transition-colors"
                          title="Collection options"
                        >
                          <EllipsisVerticalIcon className="w-3 h-3 text-slate-400" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Add Request button and requests when expanded */}
                    {isExpanded && (
                      <div className="ml-6 mt-2">
                        <div id={`add-request-${collection.id}`} data-testid={`add-request-button-container-${collection.id}`}>
                          <button
                            id={`add-request-btn-${collection.id}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              onRequestCreate?.(collection.id);
                            }}
                            className="flex items-center space-x-2 w-full p-2 text-left text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-slate-700/60 rounded-md transition-colors"
                            data-testid={`add-request-button-${collection.id}`}
                            data-collection-id={collection.id}
                          >
                            <PlusIcon className="w-4 h-4" />
                            <span>Add Request</span>
                          </button>
                        </div>
                        
                        {/* Requests List */}
                        <div className="mt-2 space-y-1">
                          {collectionRequests[collection.id]?.map((request) => {
                            const isRequestSelected = selectedRequest?.id === request.id;
                            return (
                            <div
                              key={request.id}
                              id={`request-item-${request.id}`}
                              className={cn(
                                "flex items-center space-x-2 p-2 rounded-md cursor-pointer transition-colors",
                                isRequestSelected 
                                  ? "bg-primary-50 dark:bg-primary-900/20 ring-1 ring-primary-200 dark:ring-primary-700" 
                                  : "hover:bg-slate-100/60 dark:hover:bg-slate-700/60"
                              )}
                              onClick={async (e) => {
                                e.stopPropagation();
                                console.log('CollectionBrowser: Request clicked:', request);
                                
                                // Reload the request data to get latest changes
                                try {
                                  const latestRequest = await CollectionApiService.getRequest(request.id);
                                  if (latestRequest) {
                                    console.log('Loaded latest request data:', latestRequest.name, 'URL:', latestRequest.url);
                                    onRequestSelect?.(latestRequest);
                                  } else {
                                    onRequestSelect?.(request);
                                  }
                                } catch (err) {
                                  console.error('Failed to reload request data:', err);
                                  onRequestSelect?.(request);
                                }
                              }}
                              data-testid={`request-${request.id}`}
                              data-request-id={request.id}
                              data-request-name={request.name}
                              data-request-method={request.method}
                              data-selected={isRequestSelected}
                            >
                              {/* Method Badge */}
                              <div
                                id={`method-badge-${request.id}`}
                                className={cn(
                                  'px-2 py-1 rounded text-xs font-mono font-semibold',
                                  getMethodColor(request.method as any)
                                )}
                                data-testid={`method-badge-${request.method.toLowerCase()}`}
                                data-method={request.method}
                              >
                                {request.method}
                              </div>
                              
                              {/* Request Name */}
                              <div className="flex-1 min-w-0">
                                {editingRequestId === request.id ? (
                                  <input
                                    type="text"
                                    value={editingRequestName}
                                    onChange={(e) => setEditingRequestName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        handleRenameRequest(request.id, editingRequestName);
                                      } else if (e.key === 'Escape') {
                                        setEditingRequestId(null);
                                        setEditingRequestName('');
                                      }
                                    }}
                                    onBlur={() => {
                                      if (editingRequestName.trim()) {
                                        handleRenameRequest(request.id, editingRequestName);
                                      } else {
                                        setEditingRequestId(null);
                                        setEditingRequestName('');
                                      }
                                    }}
                                    className="w-full text-sm font-medium bg-transparent border-none outline-none text-slate-900 dark:text-slate-100"
                                    autoFocus
                                  />
                                ) : (
                                  <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                                    {request.name}
                                  </span>
                                )}
                                {request.url && (
                                  <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                    {request.url}
                                  </div>
                                )}
                              </div>
                              
                              {/* Request Actions */}
                              <div className="flex items-center space-x-1">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (openRequestMenuId === request.id) {
                                      setOpenRequestMenuId(null);
                                      setRequestDropdownPosition(null);
                                    } else {
                                      const rect = e.currentTarget.getBoundingClientRect();
                                      setRequestDropdownPosition({
                                        top: rect.bottom + window.scrollY + 4,
                                        left: rect.right + window.scrollX - 120,
                                      });
                                      setOpenRequestMenuId(request.id);
                                    }
                                  }}
                                  className="p-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-600/60 transition-colors"
                                  title="Request options"
                                >
                                  <EllipsisVerticalIcon className="w-3 h-3 text-slate-400" />
                                </button>
                              </div>
                            </div>
                          );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
                })}
              </>
            )}
          </div>
        </div>
      </div>

      <CollectionEditor
        collection={editingCollection}
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSaveCollection}
        onDelete={editingCollection ? () => handleDeleteCollection(editingCollection.id) : undefined}
        onDuplicate={editingCollection ? () => handleDuplicateCollection(editingCollection.id) : undefined}
      />

      {openMenuId && dropdownPosition && createPortal(
        <>
          <div 
            className="fixed inset-0 z-[100]" 
            onClick={() => {
              setOpenMenuId(null);
              setDropdownPosition(null);
            }}
          />
          <div 
            className="fixed z-[101] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md shadow-lg py-1 min-w-[140px]"
            style={{
              top: dropdownPosition.top,
              left: dropdownPosition.left,
            }}
            data-dropdown-portal="collection-menu"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId(null);
                setDropdownPosition(null);
                handleEditCollection(openMenuId);
              }}
              className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId(null);
                setDropdownPosition(null);
                handleDuplicateCollection(openMenuId);
              }}
              className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Duplicate
            </button>
            <hr className="border-slate-200 dark:border-slate-600 my-1" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenMenuId(null);
                setDropdownPosition(null);
                handleDeleteCollection(openMenuId);
              }}
              className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Delete
            </button>
          </div>
        </>,
        document.body
      )}

      {openRequestMenuId && requestDropdownPosition && createPortal(
        <>
          <div 
            className="fixed inset-0 z-[100]" 
            onClick={() => {
              setOpenRequestMenuId(null);
              setRequestDropdownPosition(null);
            }}
          />
          <div 
            className="fixed z-[101] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-md shadow-lg py-1 min-w-[120px]"
            style={{
              top: requestDropdownPosition.top,
              left: requestDropdownPosition.left,
            }}
            data-dropdown-portal="request-menu"
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenRequestMenuId(null);
                setRequestDropdownPosition(null);
                const request = collectionRequests[Object.keys(collectionRequests).find(collectionId => 
                  collectionRequests[collectionId]?.some(r => r.id === openRequestMenuId)
                ) || '']?.find(r => r.id === openRequestMenuId);
                if (request) {
                  setEditingRequestId(request.id);
                  setEditingRequestName(request.name);
                }
              }}
              className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Rename
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenRequestMenuId(null);
                setRequestDropdownPosition(null);
                const request = collectionRequests[Object.keys(collectionRequests).find(collectionId => 
                  collectionRequests[collectionId]?.some(r => r.id === openRequestMenuId)
                ) || '']?.find(r => r.id === openRequestMenuId);
                if (request) {
                  handleDuplicateRequest(request.id, request.name);
                }
              }}
              className="w-full text-left px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              Duplicate
            </button>
            <hr className="border-slate-200 dark:border-slate-600 my-1" />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setOpenRequestMenuId(null);
                setRequestDropdownPosition(null);
                const request = collectionRequests[Object.keys(collectionRequests).find(collectionId => 
                  collectionRequests[collectionId]?.some(r => r.id === openRequestMenuId)
                ) || '']?.find(r => r.id === openRequestMenuId);
                if (request) {
                  handleDeleteRequest(request.id, request.name);
                }
              }}
              className="w-full text-left px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              Delete
            </button>
          </div>
        </>,
        document.body
      )}
    </>
  );
};