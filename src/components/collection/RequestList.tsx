import React, { useState, useEffect } from 'react';
import {
  PlayIcon,
  DocumentDuplicateIcon,
  TrashIcon,
  PlusIcon,
  EllipsisVerticalIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import { Button } from '../ui';
import { CollectionApiService } from '../../services/collection-api';
import { cn } from '../../utils/cn';
import type { Request } from '../../types/collection';
import { getMethodColor } from '../../types/http';

interface RequestListProps {
  collectionId: string;
  onRequestSelect?: (request: Request) => void;
  onRequestEdit?: (request: Request) => void;
  onRequestCreate?: (collectionId: string) => void;
  compact?: boolean;
  showHeader?: boolean;
  className?: string;
}

export const RequestList: React.FC<RequestListProps> = ({
  collectionId,
  onRequestSelect,
  onRequestEdit,
  onRequestCreate,
  compact = false,
  showHeader = false,
  className
}) => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [collection, setCollection] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);

  useEffect(() => {
    loadRequests();
  }, [collectionId]);

  const loadRequests = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [requestsData, collectionData] = await Promise.all([
        CollectionApiService.listRequests(collectionId),
        showHeader ? CollectionApiService.getCollection(collectionId) : Promise.resolve(null)
      ]);
      
      setRequests(requestsData);
      setCollection(collectionData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load requests';
      setError(errorMessage);
      console.error('Error loading requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRequestClick = (request: Request) => {
    setSelectedRequest(request.id);
    onRequestSelect?.(request);
  };

  const handleEditRequest = (request: Request) => {
    onRequestEdit?.(request);
  };

  const handleCreateRequest = () => {
    onRequestCreate?.(collectionId);
  };

  const handleDuplicateRequest = async (request: Request) => {
    try {
      await CollectionApiService.duplicateRequest(request.id, `${request.name} (Copy)`);
      await loadRequests();
    } catch (err) {
      console.error('Failed to duplicate request:', err);
    }
  };

  const handleDeleteRequest = async (request: Request) => {
    if (window.confirm(`Are you sure you want to delete "${request.name}"?`)) {
      try {
        await CollectionApiService.deleteRequest(request.id);
        await loadRequests();
        
        // Clear selection if deleted request was selected
        if (selectedRequest === request.id) {
          setSelectedRequest(null);
        }
      } catch (err) {
        console.error('Failed to delete request:', err);
      }
    }
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
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={loadRequests}
          className="mt-2 text-red-600 hover:text-red-700"
        >
          Retry
        </Button>
      </div>
    );
  }

  const RequestItem: React.FC<{ request: Request }> = ({ request }) => {
    const isSelected = selectedRequest === request.id;
    const methodColor = getMethodColor(request.method as any);
    
    return (
      <div
        className={cn(
          'group flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-all duration-200',
          'hover:bg-slate-50/60 dark:hover:bg-slate-700/60',
          isSelected && 'bg-primary-50/60 dark:bg-primary-900/20 ring-1 ring-primary-200/50 dark:ring-primary-700/50',
          compact ? 'py-2' : 'py-3'
        )}
        onClick={() => handleRequestClick(request)}
      >
        {/* Method Badge */}
        <div
          className={cn(
            'px-2 py-1 rounded text-xs font-mono font-semibold',
            methodColor,
            compact ? 'text-xs' : 'text-sm'
          )}
        >
          {request.method}
        </div>

        {/* Request Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <h4 className={cn(
              'font-medium truncate',
              compact ? 'text-sm' : 'text-base',
              'text-slate-900 dark:text-slate-100'
            )}>
              {request.name}
            </h4>
            {!compact && (
              <div className="flex items-center space-x-2 text-xs text-slate-500 dark:text-slate-400 ml-2">
                <ClockIcon className="w-3 h-3" />
                <span>{formatRelativeTime(request.updated_at)}</span>
              </div>
            )}
          </div>
          
          <p className={cn(
            'truncate text-slate-500 dark:text-slate-400',
            compact ? 'text-xs' : 'text-sm'
          )}>
            {request.url || 'No URL set'}
          </p>
          
          {!compact && request.description && (
            <p className="text-xs text-slate-400 truncate mt-1">
              {request.description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleRequestClick(request);
            }}
            className="p-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-600/60 transition-colors"
            title="Run request"
          >
            <PlayIcon className="w-4 h-4 text-green-600" />
          </button>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEditRequest(request);
            }}
            className="p-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-600/60 transition-colors"
            title="Edit request"
          >
            <EllipsisVerticalIcon className="w-4 h-4 text-slate-500" />
          </button>
          
          {!compact && (
            <>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDuplicateRequest(request);
                }}
                className="p-1 rounded hover:bg-slate-200/60 dark:hover:bg-slate-600/60 transition-colors"
                title="Duplicate request"
              >
                <DocumentDuplicateIcon className="w-4 h-4 text-slate-500" />
              </button>
              
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteRequest(request);
                }}
                className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors"
                title="Delete request"
              >
                <TrashIcon className="w-4 h-4 text-red-500" />
              </button>
            </>
          )}
        </div>
      </div>
    );
  };

  if (compact) {
    return (
      <div className={cn('space-y-1', className)}>
        {requests.length === 0 ? (
          <div className="text-xs text-slate-400 pl-2 py-1">
            No requests
          </div>
        ) : (
          requests.map((request) => (
            <RequestItem key={request.id} request={request} />
          ))
        )}
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      {showHeader && collection && (
        <div className="p-4 border-b border-slate-200/60 dark:border-slate-600/60">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                {collection.name}
              </h2>
              {collection.description && (
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {collection.description}
                </p>
              )}
              <p className="text-xs text-slate-400 mt-1">
                {requests.length} request{requests.length !== 1 ? 's' : ''}
              </p>
            </div>
            
            <Button
              variant="primary"
              size="sm"
              onClick={handleCreateRequest}
              className="flex items-center space-x-2"
            >
              <PlusIcon className="w-4 h-4" />
              <span>New Request</span>
            </Button>
          </div>
        </div>
      )}

      {/* Request List */}
      <div className="flex-1 overflow-auto">
        {requests.length === 0 ? (
          <div className="flex items-center justify-center h-full text-slate-500 dark:text-slate-400">
            <div className="text-center">
              <PlayIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <h3 className="font-medium mb-1">No requests yet</h3>
              <p className="text-sm">Create your first request to get started</p>
              {onRequestCreate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCreateRequest}
                  className="mt-3"
                >
                  <PlusIcon className="w-4 h-4 mr-1" />
                  Create Request
                </Button>
              )}
            </div>
          </div>
        ) : (
          <div className="p-4 space-y-2">
            {requests.map((request) => (
              <RequestItem key={request.id} request={request} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};