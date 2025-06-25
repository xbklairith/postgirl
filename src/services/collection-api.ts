import { invoke } from '@tauri-apps/api/core';
import type {
  Collection,
  Request,
  CreateCollectionRequest,
  UpdateCollectionRequest,
  CreateRequestRequest,
  UpdateRequestRequest,
  CollectionSummary,
} from '../types/collection';

export class CollectionApiService {
  // Collection methods
  static async createCollection(request: CreateCollectionRequest): Promise<Collection> {
    return await invoke('create_collection', { request });
  }

  static async getCollection(id: string): Promise<Collection | null> {
    return await invoke('get_collection', { id });
  }

  static async updateCollection(request: UpdateCollectionRequest): Promise<Collection> {
    return await invoke('update_collection', { request });
  }

  static async deleteCollection(id: string): Promise<void> {
    return await invoke('delete_collection', { id });
  }

  static async listCollections(workspaceId: string): Promise<Collection[]> {
    return await invoke('list_collections', { workspaceId });
  }

  static async getCollectionSummaries(workspaceId: string): Promise<CollectionSummary[]> {
    return await invoke('get_collection_summaries', { workspaceId });
  }

  // Request methods
  static async createRequest(request: CreateRequestRequest): Promise<Request> {
    return await invoke('create_request', { request });
  }

  static async getRequest(id: string): Promise<Request | null> {
    return await invoke('get_request', { id });
  }

  static async updateRequest(request: UpdateRequestRequest): Promise<Request> {
    return await invoke('update_request', { request });
  }

  static async deleteRequest(id: string): Promise<void> {
    return await invoke('delete_request', { id });
  }

  static async listRequests(collectionId: string): Promise<Request[]> {
    return await invoke('list_requests', { collectionId });
  }

  static async duplicateRequest(id: string, newName: string): Promise<Request> {
    return await invoke('duplicate_request', { id, newName });
  }

  static async reorderRequests(collectionId: string, requestOrders: Array<[string, number]>): Promise<void> {
    return await invoke('reorder_requests', { collectionId, requestOrders });
  }

  // Helper methods
  static async getRequestsForWorkspace(workspaceId: string): Promise<Request[]> {
    const collections = await this.listCollections(workspaceId);
    const allRequests: Request[] = [];
    
    for (const collection of collections) {
      const requests = await this.listRequests(collection.id);
      allRequests.push(...requests);
    }
    
    return allRequests;
  }

  static async duplicateCollection(id: string, newName: string, workspaceId: string): Promise<Collection> {
    const original = await this.getCollection(id);
    if (!original) {
      throw new Error('Collection not found');
    }

    // Create new collection
    const newCollection = await this.createCollection({
      workspace_id: workspaceId,
      name: newName,
      description: original.description,
      folder_path: original.folder_path,
      git_branch: original.git_branch,
    });

    // Duplicate all requests
    const requests = await this.listRequests(id);
    for (const request of requests) {
      await this.createRequest({
        collection_id: newCollection.id,
        name: request.name,
        description: request.description,
        method: request.method,
        url: request.url,
        headers: JSON.parse(request.headers || '{}'),
        body: request.body,
        body_type: request.body_type,
        auth_type: request.auth_type,
        auth_config: request.auth_config ? JSON.parse(request.auth_config) : undefined,
        follow_redirects: request.follow_redirects,
        timeout_ms: request.timeout_ms,
        order_index: request.order_index,
      });
    }

    return newCollection;
  }

  static async moveRequestToCollection(requestId: string, targetCollectionId: string): Promise<Request> {
    const request = await this.getRequest(requestId);
    if (!request) {
      throw new Error('Request not found');
    }

    return await this.updateRequest({
      id: requestId,
      collection_id: targetCollectionId,
    });
  }

  static async searchRequests(workspaceId: string, query: string): Promise<Request[]> {
    const allRequests = await this.getRequestsForWorkspace(workspaceId);
    const searchTerm = query.toLowerCase();
    
    return allRequests.filter(request => 
      request.name.toLowerCase().includes(searchTerm) ||
      request.url.toLowerCase().includes(searchTerm) ||
      request.method.toLowerCase().includes(searchTerm) ||
      (request.description && request.description.toLowerCase().includes(searchTerm))
    );
  }

  static async exportCollection(id: string): Promise<{ collection: Collection; requests: Request[] }> {
    const collection = await this.getCollection(id);
    if (!collection) {
      throw new Error('Collection not found');
    }

    const requests = await this.listRequests(id);
    return { collection, requests };
  }

  static async importCollection(
    workspaceId: string,
    data: { collection: Omit<Collection, 'id' | 'workspace_id' | 'created_at' | 'updated_at'>; requests: Omit<Request, 'id' | 'collection_id' | 'created_at' | 'updated_at'>[] }
  ): Promise<Collection> {
    // Create collection
    const collection = await this.createCollection({
      workspace_id: workspaceId,
      name: data.collection.name,
      description: data.collection.description,
      folder_path: data.collection.folder_path,
      git_branch: data.collection.git_branch,
    });

    // Import requests
    for (const requestData of data.requests) {
      await this.createRequest({
        collection_id: collection.id,
        name: requestData.name,
        description: requestData.description,
        method: requestData.method,
        url: requestData.url,
        headers: JSON.parse(requestData.headers || '{}'),
        body: requestData.body,
        body_type: requestData.body_type,
        auth_type: requestData.auth_type,
        auth_config: requestData.auth_config ? JSON.parse(requestData.auth_config) : undefined,
        follow_redirects: requestData.follow_redirects,
        timeout_ms: requestData.timeout_ms,
        order_index: requestData.order_index,
      });
    }

    return collection;
  }
}