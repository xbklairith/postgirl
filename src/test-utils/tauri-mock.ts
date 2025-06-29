// Mock Tauri API for testing environments
export const mockTauriAPI = () => {
  if (typeof window !== 'undefined') {
    // Mock the Tauri API structure
    (window as any).__TAURI__ = {
      core: {
        invoke: async (command: string, args?: any) => {
          console.log(`[MOCK] Tauri invoke: ${command}`, args);
          
          // Mock responses for different commands
          switch (command) {
            case 'workspace_create':
              console.log('[MOCK] workspace_create called with args:', args);
              // Add a small delay to simulate real async behavior
              await new Promise(resolve => setTimeout(resolve, 500));
              const workspace = {
                id: 'mock-workspace-' + Date.now(),
                name: args?.request?.name || 'Mock Workspace',
                local_path: args?.request?.local_path || '~/Documents/Postgirl/mock-workspace',
                description: args?.request?.description || '',
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                last_accessed_at: new Date().toISOString()
              };
              console.log('[MOCK] workspace_create returning:', workspace);
              return workspace;
              
            case 'workspace_get_all':
              return [
                {
                  id: 'mock-workspace-1',
                  name: 'Test Workspace',
                  local_path: '~/Documents/Postgirl/test-workspace',
                  description: 'A test workspace',
                  is_active: true,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  last_accessed_at: new Date().toISOString(),
                  collection_count: 2,
                  request_count: 5
                }
              ];
              
            case 'workspace_get_summaries':
              return [
                {
                  id: 'mock-workspace-1',
                  name: 'Test Workspace',
                  local_path: '~/Documents/Postgirl/test-workspace',
                  description: 'A test workspace',
                  is_active: true,
                  collection_count: 2,
                  request_count: 5,
                  last_accessed_at: new Date().toISOString()
                }
              ];
              
            case 'workspace_get_active':
              return {
                id: 'mock-workspace-1',
                name: 'Test Workspace',
                local_path: '~/Documents/Postgirl/test-workspace',
                description: 'A test workspace',
                is_active: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                last_accessed_at: new Date().toISOString()
              };
              
            case 'workspace_set_active':
              return true;
              
            case 'workspace_delete':
              return true;
              
            case 'workspace_initialize_database':
              return true;
              
            case 'workspace_run_migrations':
              return 'Migrations completed successfully';
              
            case 'collection_create':
              return {
                id: 'mock-collection-' + Date.now(),
                workspace_id: args?.request?.workspace_id || 'mock-workspace-1',
                name: args?.request?.name || 'Mock Collection',
                description: args?.request?.description || '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
              
            case 'collection_list':
            case 'collection_get_summaries':
              return [
                {
                  id: 'mock-collection-1',
                  workspace_id: args?.workspace_id || 'mock-workspace-1',
                  name: 'E2E API Tests',
                  description: 'Collection for E2E testing',
                  request_count: 3,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }
              ];
              
            case 'request_create':
              return {
                id: 'mock-request-' + Date.now(),
                collection_id: args?.request?.collection_id || 'mock-collection-1',
                name: args?.request?.name || 'Mock Request',
                method: args?.request?.method || 'GET',
                url: args?.request?.url || 'https://api.example.com',
                headers: args?.request?.headers || {},
                body: args?.request?.body || '',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              };
              
            case 'request_list':
              return [
                {
                  id: 'mock-request-1',
                  collection_id: args?.collection_id || 'mock-collection-1',
                  name: 'Test Request',
                  method: 'GET',
                  url: 'https://jsonplaceholder.typicode.com/posts/1',
                  headers: {},
                  body: '',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString()
                }
              ];
              
            case 'workspace_check_directory_exists':
              console.log('[MOCK] workspace_check_directory_exists called with:', args);
              // Always return false for test paths to allow creation
              const path = args?.path || '';
              const isTestPath = path.includes('e2e-test') || path.includes('test-workspace');
              const result = isTestPath ? false : Math.random() > 0.8;
              console.log('[MOCK] directory exists check result:', result);
              return result;
              
            default:
              console.warn(`[MOCK] Unhandled Tauri command: ${command}`);
              return { success: true, data: null };
          }
        }
      },
      event: {
        listen: async (event: string, handler: Function) => {
          console.log(`[MOCK] Tauri event listener: ${event}`);
          return () => {}; // Return unsubscribe function
        },
        emit: async (event: string, payload?: any) => {
          console.log(`[MOCK] Tauri event emit: ${event}`, payload);
        }
      }
    };

    // Also add the legacy format for compatibility
    (window as any).invoke = (window as any).__TAURI__.core.invoke;
    
    console.log('[MOCK] Tauri API mocked successfully');
  }
};

// Auto-initialize in test environments
if (typeof window !== 'undefined' && (
  window.location.hostname === 'localhost' || 
  process.env.NODE_ENV === 'test' ||
  (window as any).playwright ||
  navigator.userAgent.includes('HeadlessChrome') ||
  window.location.search.includes('playwright')
)) {
  console.log('[INIT] Detected test environment, initializing Tauri mock');
  mockTauriAPI();
}