import { invoke } from '@tauri-apps/api/core';
import type { 
  HttpRequest, 
  HttpMethod, 
  ExecuteRequestResponse,
  ExecuteRequestRequest 
} from '../types/http';

export class HttpApiService {
  
  /**
   * Execute an HTTP request
   */
  static async executeRequest(
    request: HttpRequest, 
    environmentVariables?: Record<string, string>
  ): Promise<ExecuteRequestResponse> {
    const payload: ExecuteRequestRequest = {
      request,
      environmentVariables
    };
    
    return await invoke('execute_http_request', {
      request: payload.request,
      environmentVariables: payload.environmentVariables
    });
  }

  /**
   * Test if a URL is reachable
   */
  static async testConnection(url: string): Promise<boolean> {
    return await invoke('test_http_connection', { url });
  }

  /**
   * Get list of supported HTTP methods
   */
  static async getSupportedMethods(): Promise<HttpMethod[]> {
    return await invoke('get_supported_http_methods');
  }

  /**
   * Create a new default HTTP request
   */
  static async createDefaultRequest(): Promise<HttpRequest> {
    return await invoke('create_default_http_request');
  }

  /**
   * Validate if a URL is properly formatted for HTTP requests
   */
  static async validateUrl(url: string): Promise<boolean> {
    return await invoke('validate_http_url', { url });
  }

  /**
   * Parse a curl command into an HTTP request
   */
  static async parseCurlCommand(curlCommand: string): Promise<HttpRequest> {
    return await invoke('parse_curl_command', { curlCommand });
  }

  /**
   * Format an HTTP response for debugging purposes
   */
  static async formatResponseDebug(response: any): Promise<string> {
    return await invoke('format_http_response_debug', { response });
  }

  /**
   * Quick test requests for common scenarios
   */
  static async quickTest(type: 'get' | 'post' | 'status'): Promise<ExecuteRequestResponse> {
    let request: HttpRequest;
    
    switch (type) {
      case 'get':
        request = await this.createDefaultRequest();
        request.url = 'https://httpbin.org/get';
        request.method = 'GET';
        break;
        
      case 'post':
        request = await this.createDefaultRequest();
        request.url = 'https://httpbin.org/post';
        request.method = 'POST';
        request.headers['Content-Type'] = 'application/json';
        request.body = {
          type: 'json',
          data: { message: 'Hello from Postgirl!' }
        };
        break;
        
      case 'status':
        request = await this.createDefaultRequest();
        request.url = 'https://httpbin.org/status/200';
        request.method = 'GET';
        break;
        
      default:
        throw new Error(`Unknown test type: ${type}`);
    }
    
    return await this.executeRequest(request);
  }

  /**
   * Batch execute multiple requests
   */
  static async executeRequestBatch(
    requests: HttpRequest[],
    environmentVariables?: Record<string, string>
  ): Promise<ExecuteRequestResponse[]> {
    const results: ExecuteRequestResponse[] = [];
    
    for (const request of requests) {
      try {
        const result = await this.executeRequest(request, environmentVariables);
        results.push(result);
      } catch (error) {
        results.push({
          requestId: request.id,
          error: {
            errorType: 'unknownError',
            message: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          }
        });
      }
    }
    
    return results;
  }

  /**
   * Create a request from URL with smart defaults
   */
  static async createRequestFromUrl(url: string): Promise<HttpRequest> {
    const request = await this.createDefaultRequest();
    request.url = url;
    
    // Set smart defaults based on URL
    const urlObj = new URL(url);
    
    // Add common headers for APIs
    if (urlObj.pathname.includes('/api/') || urlObj.pathname.endsWith('.json')) {
      request.headers['Accept'] = 'application/json';
    }
    
    // Set appropriate method for common endpoints
    if (urlObj.pathname.includes('/auth/') || urlObj.pathname.includes('/login')) {
      request.method = 'POST';
      request.headers['Content-Type'] = 'application/json';
    }
    
    return request;
  }

  /**
   * Import requests from various formats
   */
  static async importFromFormat(format: 'curl' | 'postman', data: string): Promise<HttpRequest[]> {
    switch (format) {
      case 'curl': {
        // Split multiple curl commands if provided
        const curlCommands = data.split('\n').filter(line => line.trim().startsWith('curl'));
        const requests: HttpRequest[] = [];
        
        for (const cmd of curlCommands) {
          try {
            const request = await this.parseCurlCommand(cmd.trim());
            requests.push(request);
          } catch (error) {
            // Skip invalid curl commands
          }
        }
        
        return requests;
      }
        
      case 'postman': {
        // Basic Postman collection parsing - would need expansion for full support
        try {
          JSON.parse(data);
          // This would need a more complete implementation
          throw new Error('Postman import not fully implemented yet');
        } catch (error) {
          throw new Error('Invalid Postman collection format');
        }
      }
        
      default:
        throw new Error(`Unsupported import format: ${format}`);
    }
  }
}

export default HttpApiService;