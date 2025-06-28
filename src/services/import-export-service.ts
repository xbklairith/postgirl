import type {
  PostmanCollection,
  ImportResult,
  ExportResult,
  ImportError,
  ImportWarning,
  PostmanItem,
  InsomniaExport,
  InsomniaRequest,
} from '../types/external-formats';
import type { OpenAPIDocument } from '../types/openapi';
import type {
  Request,
  CreateCollectionRequest,
  CreateRequestRequest,
} from '../types/collection';
import type { HttpMethod } from '../types/http';
import { CollectionApiService } from './collection-api';

export class ImportExportService {

  /**
   * Import a Postman Collection v2.1
   */
  async importPostmanCollection(
    workspaceId: string,
    collectionData: PostmanCollection
  ): Promise<ImportResult> {
    const startTime = Date.now();
    const errors: ImportError[] = [];
    const warnings: ImportWarning[] = [];
    const collections: any[] = [];

    try {
      // Validate Postman collection format
      if (!this.isValidPostmanCollection(collectionData)) {
        throw new Error('Invalid Postman collection format');
      }

      // Create main collection
      const collectionRequest: CreateCollectionRequest = {
        workspace_id: workspaceId,
        name: collectionData.info.name,
        description: collectionData.info.description?.content || '',
      };

      const newCollection = await CollectionApiService.createCollection(collectionRequest);
      collections.push({
        id: newCollection.id,
        name: newCollection.name,
        description: newCollection.description,
        requestCount: 0,
        folderCount: 0,
        sourceFormat: 'postman' as const,
        originalId: collectionData.info._postman_id,
      });

      // Convert and import requests
      let requestCount = 0;
      let folderCount = 0;

      for (const item of collectionData.item || []) {
        const result = await this.processPostmanItem(
          item,
          newCollection.id,
          0
        );
        requestCount += result.requestCount;
        folderCount += result.folderCount;
        errors.push(...result.errors);
        warnings.push(...result.warnings);
      }

      // Update collection summary
      collections[0].requestCount = requestCount;
      collections[0].folderCount = folderCount;

      const duration = Date.now() - startTime;

      return {
        success: errors.length === 0,
        collections,
        environments: [], // TODO: Handle Postman environments
        errors,
        warnings,
        summary: {
          totalItems: requestCount + folderCount,
          successfulItems: requestCount + folderCount - errors.length,
          failedItems: errors.length,
          warningItems: warnings.length,
          duration,
          sourceFormat: 'Postman Collection v2.1',
        },
      };
    } catch (error) {
      errors.push({
        type: 'parsing',
        message: 'Failed to import Postman collection',
        details: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        collections,
        environments: [],
        errors,
        warnings,
        summary: {
          totalItems: 0,
          successfulItems: 0,
          failedItems: 1,
          warningItems: 0,
          duration: Date.now() - startTime,
          sourceFormat: 'Postman Collection v2.1',
        },
      };
    }
  }

  /**
   * Import an Insomnia workspace
   */
  async importInsomniaWorkspace(
    workspaceId: string,
    exportData: InsomniaExport
  ): Promise<ImportResult> {
    const startTime = Date.now();
    const errors: ImportError[] = [];
    const warnings: ImportWarning[] = [];
    const collections: any[] = [];

    try {
      // Find workspace and requests
      const workspace = exportData.resources.find(r => r._type === 'workspace');
      const requests = exportData.resources.filter(r => r._type === 'request') as InsomniaRequest[];
      const requestGroups = exportData.resources.filter(r => r._type === 'request_group');

      if (!workspace) {
        throw new Error('No workspace found in Insomnia export');
      }

      // Create main collection
      const collectionRequest: CreateCollectionRequest = {
        workspace_id: workspaceId,
        name: workspace.name || 'Imported from Insomnia',
        description: workspace.description || '',
      };

      const newCollection = await CollectionApiService.createCollection(collectionRequest);
      let requestCount = 0;

      // Convert requests
      for (const insomniaRequest of requests) {
        try {
          const requestData = this.convertInsomniaRequest(insomniaRequest, newCollection.id);
          await CollectionApiService.createRequest(requestData);
          requestCount++;
        } catch (error) {
          errors.push({
            type: 'conversion',
            message: `Failed to convert request: ${insomniaRequest.name}`,
            details: error instanceof Error ? error.message : String(error),
            itemName: insomniaRequest.name,
          });
        }
      }

      collections.push({
        id: newCollection.id,
        name: newCollection.name,
        description: newCollection.description,
        requestCount,
        folderCount: requestGroups.length,
        sourceFormat: 'insomnia' as const,
        originalId: workspace._id,
      });

      return {
        success: errors.length === 0,
        collections,
        environments: [], // TODO: Handle Insomnia environments
        errors,
        warnings,
        summary: {
          totalItems: requests.length,
          successfulItems: requestCount,
          failedItems: errors.length,
          warningItems: warnings.length,
          duration: Date.now() - startTime,
          sourceFormat: `Insomnia v${exportData.__export_format}`,
        },
      };
    } catch (error) {
      errors.push({
        type: 'parsing',
        message: 'Failed to import Insomnia workspace',
        details: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        collections,
        environments: [],
        errors,
        warnings,
        summary: {
          totalItems: 0,
          successfulItems: 0,
          failedItems: 1,
          warningItems: 0,
          duration: Date.now() - startTime,
          sourceFormat: `Insomnia v${exportData.__export_format}`,
        },
      };
    }
  }

  /**
   * Import an OpenAPI specification
   */
  async importOpenAPISpec(
    workspaceId: string,
    specData: OpenAPIDocument
  ): Promise<ImportResult> {
    const startTime = Date.now();
    const errors: ImportError[] = [];
    const warnings: ImportWarning[] = [];
    const collections: any[] = [];

    try {
      // Validate OpenAPI spec format
      if (!this.isValidOpenAPISpec(specData)) {
        throw new Error('Invalid OpenAPI specification format');
      }

      // Create main collection
      const collectionRequest: CreateCollectionRequest = {
        workspace_id: workspaceId,
        name: specData.info.title,
        description: specData.info.description || '',
      };

      const newCollection = await CollectionApiService.createCollection(collectionRequest);
      collections.push({
        id: newCollection.id,
        name: newCollection.name,
        description: newCollection.description,
        requestCount: 0,
        folderCount: 0,
        sourceFormat: 'openapi' as const,
        originalId: specData.info.title,
      });

      // Convert OpenAPI paths to requests
      let requestCount = 0;
      const baseUrl = specData.servers?.[0]?.url || 'https://api.example.com';

      for (const [path, pathItem] of Object.entries(specData.paths)) {
        const methods = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options'] as const;
        
        for (const method of methods) {
          const operation = pathItem[method];
          if (!operation) continue;

          try {
            const requestData = this.convertOpenAPIOperation(
              newCollection.id,
              method.toUpperCase(),
              baseUrl + path,
              operation,
              path
            );
            await CollectionApiService.createRequest(requestData);
            requestCount++;
          } catch (error) {
            errors.push({
              type: 'conversion',
              message: `Failed to convert operation: ${method.toUpperCase()} ${path}`,
              details: error instanceof Error ? error.message : String(error),
              itemName: operation.summary || `${method.toUpperCase()} ${path}`,
            });
          }
        }
      }

      // Update collection summary
      collections[0].requestCount = requestCount;

      const duration = Date.now() - startTime;

      return {
        success: errors.length === 0,
        collections,
        environments: [], // TODO: Handle OpenAPI servers as environments
        errors,
        warnings,
        summary: {
          totalItems: requestCount,
          successfulItems: requestCount - errors.length,
          failedItems: errors.length,
          warningItems: warnings.length,
          duration,
          sourceFormat: `OpenAPI ${specData.openapi}`,
        },
      };
    } catch (error) {
      errors.push({
        type: 'parsing',
        message: 'Failed to import OpenAPI specification',
        details: error instanceof Error ? error.message : String(error),
      });

      return {
        success: false,
        collections,
        environments: [],
        errors,
        warnings,
        summary: {
          totalItems: 0,
          successfulItems: 0,
          failedItems: 1,
          warningItems: 0,
          duration: Date.now() - startTime,
          sourceFormat: `OpenAPI ${specData.openapi}`,
        },
      };
    }
  }

  /**
   * Import from a curl command
   */
  async importCurlCommand(
    collectionId: string,
    curlCommand: string
  ): Promise<CreateRequestRequest> {
    // Parse curl command - this is a simplified implementation
    const request: CreateRequestRequest = {
      collection_id: collectionId,
      name: 'Imported from curl',
      method: 'GET',
      url: '',
      headers: {},
      body_type: 'raw',
    };

    // Extract method
    const methodMatch = curlCommand.match(/-X\s+(\w+)/i);
    if (methodMatch) {
      request.method = methodMatch[1].toUpperCase();
    }

    // Extract URL
    const urlMatch = curlCommand.match(/curl\s+['"](https?:\/\/[^'"]+)['"]/);
    if (urlMatch) {
      request.url = urlMatch[1];
    } else {
      // Try without quotes
      const urlMatch2 = curlCommand.match(/curl\s+(https?:\/\/\S+)/);
      if (urlMatch2) {
        request.url = urlMatch2[1];
      }
    }

    // Extract headers
    const headerMatches = curlCommand.matchAll(/-H\s+['"]([^:]+):\s*([^'"]+)['"]/g);
    const headers: Record<string, string> = {};
    for (const match of headerMatches) {
      headers[match[1].trim()] = match[2].trim();
    }
    request.headers = headers;

    // Extract data/body
    const dataMatch = curlCommand.match(/--data(?:-raw)?\s+['"]([^'"]+)['"]/);
    if (dataMatch) {
      request.body = dataMatch[1];
      request.body_type = 'raw';
    }

    return request;
  }

  /**
   * Export collection to Postman format
   */
  async exportToPostman(collectionId: string): Promise<ExportResult> {
    try {
      const collection = await CollectionApiService.getCollection(collectionId);
      if (!collection) {
        throw new Error('Collection not found');
      }
      
      const requests = await CollectionApiService.listRequests(collectionId);

      const postmanCollection: PostmanCollection = {
        info: {
          name: collection.name,
          description: { content: collection.description || '' },
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        },
        item: requests.map((req: Request) => this.convertToPostmanItem(req)),
      };

      return {
        success: true,
        data: postmanCollection,
        errors: [],
        summary: {
          totalItems: requests.length,
          exportedItems: requests.length,
          skippedItems: 0,
          duration: 0,
          targetFormat: 'Postman Collection v2.1',
        },
      };
    } catch (error) {
      return {
        success: false,
        errors: [{
          type: 'conversion',
          message: 'Failed to export to Postman format',
          details: error instanceof Error ? error.message : String(error),
        }],
        summary: {
          totalItems: 0,
          exportedItems: 0,
          skippedItems: 0,
          duration: 0,
          targetFormat: 'Postman Collection v2.1',
        },
      };
    }
  }

  /**
   * Validate if data is a valid Postman collection
   */
  private isValidPostmanCollection(data: any): data is PostmanCollection {
    return (
      typeof data === 'object' &&
      data !== null &&
      typeof data.info === 'object' &&
      typeof data.info.name === 'string' &&
      Array.isArray(data.item)
    );
  }

  /**
   * Validate if data is a valid OpenAPI specification
   */
  private isValidOpenAPISpec(data: any): data is OpenAPIDocument {
    return (
      typeof data === 'object' &&
      data !== null &&
      typeof data.openapi === 'string' &&
      typeof data.info === 'object' &&
      typeof data.info.title === 'string' &&
      typeof data.paths === 'object'
    );
  }

  /**
   * Process a Postman item (request or folder)
   */
  private async processPostmanItem(
    item: PostmanItem,
    collectionId: string,
    depth: number
  ): Promise<{
    requestCount: number;
    folderCount: number;
    errors: ImportError[];
    warnings: ImportWarning[];
  }> {
    const errors: ImportError[] = [];
    const warnings: ImportWarning[] = [];
    let requestCount = 0;
    let folderCount = 0;

    try {
      if (item.request) {
        // This is a request
        const requestData = this.convertPostmanRequest(item, collectionId);
        await CollectionApiService.createRequest(requestData);
        requestCount = 1;
      } else if (item.item) {
        // This is a folder
        folderCount = 1;
        
        // Process nested items
        for (const nestedItem of item.item) {
          const result = await this.processPostmanItem(
            nestedItem,
            collectionId,
            depth + 1
          );
          requestCount += result.requestCount;
          folderCount += result.folderCount;
          errors.push(...result.errors);
          warnings.push(...result.warnings);
        }
      }
    } catch (error) {
      errors.push({
        type: 'conversion',
        message: `Failed to process item: ${item.name}`,
        details: error instanceof Error ? error.message : String(error),
        itemName: item.name,
      });
    }

    return { requestCount, folderCount, errors, warnings };
  }

  /**
   * Convert Postman request to internal format
   */
  private convertPostmanRequest(
    item: PostmanItem,
    collectionId: string
  ): CreateRequestRequest {
    const postmanRequest = item.request!;
    
    // Extract URL
    let url = '';
    if (typeof postmanRequest.url === 'string') {
      url = postmanRequest.url;
    } else if (postmanRequest.url?.raw) {
      url = postmanRequest.url.raw;
    }

    // Extract headers
    const headers: Record<string, string> = {};
    if (postmanRequest.header) {
      for (const header of postmanRequest.header) {
        if (!header.disabled) {
          headers[header.key] = header.value;
        }
      }
    }

    // Extract method
    const method = (postmanRequest.method || 'GET').toUpperCase() as HttpMethod;

    // Extract body
    let body = '';
    let bodyType = 'raw';
    if (postmanRequest.body) {
      switch (postmanRequest.body.mode) {
        case 'raw':
          body = postmanRequest.body.raw || '';
          bodyType = 'raw';
          break;
        case 'urlencoded':
          if (postmanRequest.body.urlencoded) {
            const params = postmanRequest.body.urlencoded
              .filter(p => !p.disabled)
              .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value || '')}`)
              .join('&');
            body = params;
            bodyType = 'form';
          }
          break;
        case 'formdata':
          bodyType = 'form';
          // Note: File uploads will need special handling
          break;
        default:
          bodyType = 'raw';
      }
    }

    return {
      collection_id: collectionId,
      name: item.name,
      description: item.description?.content || '',
      method,
      url,
      headers,
      body,
      body_type: bodyType,
      follow_redirects: true,
      timeout_ms: 30000,
    };
  }

  /**
   * Convert Insomnia request to internal format
   */
  private convertInsomniaRequest(
    insomniaRequest: InsomniaRequest,
    collectionId: string
  ): CreateRequestRequest {
    // Extract headers
    const headers: Record<string, string> = {};
    if (insomniaRequest.headers) {
      for (const header of insomniaRequest.headers) {
        if (!header.disabled) {
          headers[header.name] = header.value;
        }
      }
    }

    // Extract body
    let body = '';
    let bodyType = 'raw';
    if (insomniaRequest.body) {
      if (insomniaRequest.body.text) {
        body = insomniaRequest.body.text;
        bodyType = 'raw';
      } else if (insomniaRequest.body.params) {
        const params = insomniaRequest.body.params
          .map(p => `${encodeURIComponent(p.name)}=${encodeURIComponent(p.value)}`)
          .join('&');
        body = params;
        bodyType = 'form';
      }
    }

    return {
      collection_id: collectionId,
      name: insomniaRequest.name,
      description: insomniaRequest.description || '',
      method: insomniaRequest.method.toUpperCase() as HttpMethod,
      url: insomniaRequest.url,
      headers,
      body,
      body_type: bodyType,
      follow_redirects: true,
      timeout_ms: 30000,
    };
  }

  /**
   * Convert OpenAPI operation to internal format
   */
  private convertOpenAPIOperation(
    collectionId: string,
    method: string,
    url: string,
    operation: any,
    path: string
  ): CreateRequestRequest {
    // Extract headers from parameters
    const headers: Record<string, string> = {};
    const queryParams: string[] = [];
    
    if (operation.parameters) {
      for (const param of operation.parameters) {
        if (param.in === 'header' && param.schema?.default) {
          headers[param.name] = String(param.schema.default);
        } else if (param.in === 'query' && param.schema?.default) {
          queryParams.push(`${param.name}=${encodeURIComponent(param.schema.default)}`);
        }
      }
    }
    
    // Add query parameters to URL
    let finalUrl = url;
    if (queryParams.length > 0) {
      finalUrl += (finalUrl.includes('?') ? '&' : '?') + queryParams.join('&');
    }
    
    // Extract request body
    let body = '';
    let bodyType = 'raw';
    if (operation.requestBody?.content) {
      const contentTypes = Object.keys(operation.requestBody.content);
      const contentType = contentTypes[0]; // Use first available content type
      
      if (contentType) {
        headers['Content-Type'] = contentType;
        
        // Generate example body based on schema
        const mediaType = operation.requestBody.content[contentType];
        if (mediaType.schema) {
          body = JSON.stringify(this.generateExampleFromSchema(mediaType.schema), null, 2);
          bodyType = contentType.includes('json') ? 'raw' : 'form';
        }
      }
    }

    return {
      collection_id: collectionId,
      name: operation.summary || operation.operationId || `${method} ${path}`,
      description: operation.description || '',
      method: method as HttpMethod,
      url: finalUrl,
      headers,
      body,
      body_type: bodyType,
      follow_redirects: true,
      timeout_ms: 30000,
    };
  }

  /**
   * Generate example data from OpenAPI schema
   */
  private generateExampleFromSchema(schema: any): any {
    if (schema.example !== undefined) {
      return schema.example;
    }
    
    if (schema.type === 'object') {
      const obj: any = {};
      if (schema.properties) {
        for (const [key, propSchema] of Object.entries(schema.properties)) {
          obj[key] = this.generateExampleFromSchema(propSchema);
        }
      }
      return obj;
    }
    
    if (schema.type === 'array') {
      if (schema.items) {
        return [this.generateExampleFromSchema(schema.items)];
      }
      return [];
    }
    
    switch (schema.type) {
      case 'string':
        return schema.enum ? schema.enum[0] : 'string';
      case 'number':
      case 'integer':
        return schema.enum ? schema.enum[0] : 0;
      case 'boolean':
        return false;
      default:
        return null;
    }
  }

  /**
   * Convert internal request to Postman format
   */
  private convertToPostmanItem(request: Request): PostmanItem {
    const headers = JSON.parse(request.headers || '{}');
    
    return {
      name: request.name,
      request: {
        method: request.method,
        header: Object.entries(headers).map(([key, value]) => ({
          key,
          value: String(value),
        })),
        url: {
          raw: request.url,
        },
        body: request.body ? {
          mode: 'raw',
          raw: request.body,
        } : undefined,
      },
    };
  }
}