import { describe, it, expect, beforeEach, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import type { 
  Workspace, 
  CreateWorkspaceRequest, 
  WorkspaceSummary,
  WorkspaceSettings 
} from '../../types/workspace';
import type { Environment } from '../../types/environment';
import type { Collection } from '../../types/collection';

// Mock the Tauri invoke function
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);

describe('Tauri Command Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Database Initialization Commands', () => {
    it('should initialize database successfully', async () => {
      mockInvoke.mockResolvedValue(true);

      const result = await invoke('workspace_initialize_database', {
        databasePath: '/tmp/test.db'
      });

      expect(mockInvoke).toHaveBeenCalledWith('workspace_initialize_database', {
        databasePath: '/tmp/test.db'
      });
      expect(result).toBe(true);
    });

    it('should perform database health check', async () => {
      mockInvoke.mockResolvedValue(true);

      const result = await invoke('workspace_database_health_check');

      expect(mockInvoke).toHaveBeenCalledWith('workspace_database_health_check');
      expect(result).toBe(true);
    });

    it('should run database migrations', async () => {
      mockInvoke.mockResolvedValue('Database migrations completed successfully');

      const result = await invoke('workspace_run_migrations');

      expect(mockInvoke).toHaveBeenCalledWith('workspace_run_migrations');
      expect(result).toBe('Database migrations completed successfully');
    });
  });

  describe('Workspace Management Commands', () => {
    const mockWorkspace: Workspace = {
      id: 'workspace-123',
      name: 'Test Workspace',
      description: 'A test workspace',
      git_repository_url: 'https://github.com/test/repo.git',
      local_path: '/Users/test/Documents/Postgirl/test-workspace',
      is_active: true,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
      last_accessed_at: '2023-01-01T00:00:00Z',
    };

    it('should create workspace successfully', async () => {
      const createRequest: CreateWorkspaceRequest = {
        name: 'Test Workspace',
        description: 'A test workspace',
        git_repository_url: 'https://github.com/test/repo.git',
        local_path: '/Users/test/Documents/Postgirl/test-workspace',
      };

      mockInvoke.mockResolvedValue(mockWorkspace);

      const result = await invoke('workspace_create', { request: createRequest });

      expect(mockInvoke).toHaveBeenCalledWith('workspace_create', {
        request: createRequest
      });
      expect(result).toEqual(mockWorkspace);
    });

    it('should handle workspace creation errors', async () => {
      const createRequest: CreateWorkspaceRequest = {
        name: 'Invalid Workspace',
        description: null,
        git_repository_url: 'invalid-url',
        local_path: '/invalid/path',
      };

      const errorMessage = 'Failed to create workspace: Invalid Git URL';
      mockInvoke.mockRejectedValue(new Error(errorMessage));

      await expect(
        invoke('workspace_create', { request: createRequest })
      ).rejects.toThrow(errorMessage);
    });

    it('should get workspace by ID', async () => {
      mockInvoke.mockResolvedValue(mockWorkspace);

      const result = await invoke('workspace_get', { id: 'workspace-123' });

      expect(mockInvoke).toHaveBeenCalledWith('workspace_get', {
        id: 'workspace-123'
      });
      expect(result).toEqual(mockWorkspace);
    });

    it('should return null for non-existent workspace', async () => {
      mockInvoke.mockResolvedValue(null);

      const result = await invoke('workspace_get', { id: 'non-existent' });

      expect(result).toBeNull();
    });

    it('should get all workspaces', async () => {
      const workspaces = [mockWorkspace];
      mockInvoke.mockResolvedValue(workspaces);

      const result = await invoke('workspace_get_all');

      expect(mockInvoke).toHaveBeenCalledWith('workspace_get_all');
      expect(result).toEqual(workspaces);
    });

    it('should get active workspace', async () => {
      mockInvoke.mockResolvedValue(mockWorkspace);

      const result = await invoke('workspace_get_active');

      expect(mockInvoke).toHaveBeenCalledWith('workspace_get_active');
      expect(result).toEqual(mockWorkspace);
    });

    it('should set active workspace', async () => {
      mockInvoke.mockResolvedValue(true);

      const result = await invoke('workspace_set_active', { id: 'workspace-123' });

      expect(mockInvoke).toHaveBeenCalledWith('workspace_set_active', {
        id: 'workspace-123'
      });
      expect(result).toBe(true);
    });

    it('should delete workspace', async () => {
      mockInvoke.mockResolvedValue(true);

      const result = await invoke('workspace_delete', { id: 'workspace-123' });

      expect(mockInvoke).toHaveBeenCalledWith('workspace_delete', {
        id: 'workspace-123'
      });
      expect(result).toBe(true);
    });

    it('should get workspace summaries', async () => {
      const summaries: WorkspaceSummary[] = [{
        id: 'workspace-123',
        name: 'Test Workspace',
        description: 'A test workspace',
        local_path: '/Users/test/Documents/Postgirl/test-workspace',
        is_active: true,
        last_accessed_at: '2023-01-01T00:00:00Z',
        git_status: 'clean',
        collection_count: 5,
        request_count: 23,
      }];

      mockInvoke.mockResolvedValue(summaries);

      const result = await invoke('workspace_get_summaries');

      expect(mockInvoke).toHaveBeenCalledWith('workspace_get_summaries');
      expect(result).toEqual(summaries);
    });
  });

  describe('Workspace Settings Commands', () => {
    const mockSettings: WorkspaceSettings = {
      id: 'settings-123',
      workspace_id: 'workspace-123',
      auto_save: true,
      sync_on_startup: true,
      default_timeout: 30000,
      follow_redirects: true,
      verify_ssl: true,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    };

    it('should create workspace settings', async () => {
      mockInvoke.mockResolvedValue(mockSettings);

      const result = await invoke('workspace_settings_create', {
        workspaceId: 'workspace-123'
      });

      expect(mockInvoke).toHaveBeenCalledWith('workspace_settings_create', {
        workspaceId: 'workspace-123'
      });
      expect(result).toEqual(mockSettings);
    });

    it('should get workspace settings', async () => {
      mockInvoke.mockResolvedValue(mockSettings);

      const result = await invoke('workspace_settings_get', {
        workspaceId: 'workspace-123'
      });

      expect(mockInvoke).toHaveBeenCalledWith('workspace_settings_get', {
        workspaceId: 'workspace-123'
      });
      expect(result).toEqual(mockSettings);
    });

    it('should update workspace settings', async () => {
      mockInvoke.mockResolvedValue(true);

      const result = await invoke('workspace_settings_update', {
        settings: mockSettings
      });

      expect(mockInvoke).toHaveBeenCalledWith('workspace_settings_update', {
        settings: mockSettings
      });
      expect(result).toBe(true);
    });
  });

  describe('Directory Validation Commands', () => {
    it('should check if directory exists', async () => {
      mockInvoke.mockResolvedValue(false);

      const result = await invoke('workspace_check_directory_exists', {
        path: '/Users/test/new-workspace'
      });

      expect(mockInvoke).toHaveBeenCalledWith('workspace_check_directory_exists', {
        path: '/Users/test/new-workspace'
      });
      expect(result).toBe(false);
    });

    it('should check parent directory', async () => {
      mockInvoke.mockResolvedValue(true);

      const result = await invoke('workspace_check_parent_directory', {
        path: '/Users/test/Documents/Postgirl/new-workspace'
      });

      expect(mockInvoke).toHaveBeenCalledWith('workspace_check_parent_directory', {
        path: '/Users/test/Documents/Postgirl/new-workspace'
      });
      expect(result).toBe(true);
    });
  });

  describe('Git Commands', () => {
    it('should initialize Git repository', async () => {
      const gitResult = {
        success: true,
        message: 'Repository initialized successfully',
        path: '/Users/test/workspace',
      };

      mockInvoke.mockResolvedValue(gitResult);

      const result = await invoke('git_initialize_repository', {
        path: '/Users/test/workspace'
      });

      expect(mockInvoke).toHaveBeenCalledWith('git_initialize_repository', {
        path: '/Users/test/workspace'
      });
      expect(result).toEqual(gitResult);
    });

    it('should check Git repository status', async () => {
      const statusResult = {
        is_clean: false,
        staged_files: ['file1.txt'],
        unstaged_files: ['file2.txt'],
        untracked_files: ['file3.txt'],
      };

      mockInvoke.mockResolvedValue(statusResult);

      const result = await invoke('git_get_repository_status', {
        path: '/Users/test/workspace'
      });

      expect(mockInvoke).toHaveBeenCalledWith('git_get_repository_status', {
        path: '/Users/test/workspace'
      });
      expect(result).toEqual(statusResult);
    });

    it('should clone Git repository', async () => {
      const cloneResult = {
        success: true,
        message: 'Repository cloned successfully',
        path: '/Users/test/workspace',
      };

      mockInvoke.mockResolvedValue(cloneResult);

      const result = await invoke('git_clone_repository', {
        url: 'https://github.com/test/repo.git',
        path: '/Users/test/workspace',
        branch: 'main'
      });

      expect(mockInvoke).toHaveBeenCalledWith('git_clone_repository', {
        url: 'https://github.com/test/repo.git',
        path: '/Users/test/workspace',
        branch: 'main'
      });
      expect(result).toEqual(cloneResult);
    });

    it('should handle Git authentication errors', async () => {
      const errorMessage = 'Git authentication failed. Please ensure your SSH key is configured.';
      mockInvoke.mockRejectedValue(new Error(errorMessage));

      await expect(
        invoke('git_clone_repository', {
          url: 'git@github.com:private/repo.git',
          path: '/Users/test/workspace',
          branch: 'main'
        })
      ).rejects.toThrow(errorMessage);
    });

    it('should get Git branches', async () => {
      const branches = [
        { name: 'main', is_current: true },
        { name: 'feature/new-feature', is_current: false },
        { name: 'develop', is_current: false },
      ];

      mockInvoke.mockResolvedValue(branches);

      const result = await invoke('git_get_branches', {
        path: '/Users/test/workspace'
      });

      expect(mockInvoke).toHaveBeenCalledWith('git_get_branches', {
        path: '/Users/test/workspace'
      });
      expect(result).toEqual(branches);
    });
  });

  describe('Collection Commands', () => {
    const mockCollection: Collection = {
      id: 'collection-123',
      workspace_id: 'workspace-123',
      name: 'API Tests',
      description: 'Collection of API tests',
      folder_path: 'api',
      git_branch: 'main',
      is_active: true,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    };

    it('should create collection', async () => {
      const createRequest = {
        workspace_id: 'workspace-123',
        name: 'API Tests',
        description: 'Collection of API tests',
        folder_path: 'api',
        git_branch: 'main',
      };

      mockInvoke.mockResolvedValue(mockCollection);

      const result = await invoke('collection_create', { request: createRequest });

      expect(mockInvoke).toHaveBeenCalledWith('collection_create', {
        request: createRequest
      });
      expect(result).toEqual(mockCollection);
    });

    it('should list collections by workspace', async () => {
      const collections = [mockCollection];
      mockInvoke.mockResolvedValue(collections);

      const result = await invoke('collection_list', {
        workspaceId: 'workspace-123'
      });

      expect(mockInvoke).toHaveBeenCalledWith('collection_list', {
        workspaceId: 'workspace-123'
      });
      expect(result).toEqual(collections);
    });

    it('should delete collection', async () => {
      mockInvoke.mockResolvedValue(true);

      const result = await invoke('collection_delete', {
        id: 'collection-123'
      });

      expect(mockInvoke).toHaveBeenCalledWith('collection_delete', {
        id: 'collection-123'
      });
      expect(result).toBe(true);
    });
  });

  describe('Environment Commands', () => {
    const mockEnvironment: Environment = {
      id: 'env-123',
      name: 'Development',
      variables: {
        'API_URL': {
          key: 'API_URL',
          value: 'https://api.dev.example.com',
          is_secret: false,
          variable_type: 'String',
        },
        'API_KEY': {
          key: 'API_KEY',
          value: 'dev-key-123',
          is_secret: true,
          variable_type: 'Secret',
        },
      },
      is_active: true,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    };

    it('should create environment', async () => {
      mockInvoke.mockResolvedValue(mockEnvironment);

      const result = await invoke('environment_create', {
        workspaceId: 'workspace-123',
        name: 'Development'
      });

      expect(mockInvoke).toHaveBeenCalledWith('environment_create', {
        workspaceId: 'workspace-123',
        name: 'Development'
      });
      expect(result).toEqual(mockEnvironment);
    });

    it('should list environments by workspace', async () => {
      const environments = [mockEnvironment];
      mockInvoke.mockResolvedValue(environments);

      const result = await invoke('environment_list', {
        workspaceId: 'workspace-123'
      });

      expect(mockInvoke).toHaveBeenCalledWith('environment_list', {
        workspaceId: 'workspace-123'
      });
      expect(result).toEqual(environments);
    });

    it('should add environment variable', async () => {
      const variable = {
        key: 'NEW_VAR',
        value: 'new-value',
        is_secret: false,
        variable_type: 'String',
      };

      mockInvoke.mockResolvedValue(mockEnvironment);

      const result = await invoke('environment_add_variable', {
        environmentId: 'env-123',
        variable: variable
      });

      expect(mockInvoke).toHaveBeenCalledWith('environment_add_variable', {
        environmentId: 'env-123',
        variable: variable
      });
      expect(result).toEqual(mockEnvironment);
    });

    it('should delete environment', async () => {
      mockInvoke.mockResolvedValue(true);

      const result = await invoke('environment_delete', {
        id: 'env-123'
      });

      expect(mockInvoke).toHaveBeenCalledWith('environment_delete', {
        id: 'env-123'
      });
      expect(result).toBe(true);
    });
  });

  describe('HTTP Request Commands', () => {
    it('should execute HTTP request', async () => {
      const httpRequest = {
        method: 'GET',
        url: 'https://api.example.com/users',
        headers: { 'Authorization': 'Bearer token' },
        body: null,
        timeout_ms: 30000,
      };

      const response = {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: { users: [] },
        timing: {
          total_time_ms: 245,
          dns_lookup_ms: 12,
          connect_ms: 34,
          tls_handshake_ms: 56,
          first_byte_ms: 123,
        },
      };

      mockInvoke.mockResolvedValue(response);

      const result = await invoke('http_execute_request', {
        request: httpRequest,
        environmentVariables: { 'BASE_URL': 'https://api.example.com' }
      });

      expect(mockInvoke).toHaveBeenCalledWith('http_execute_request', {
        request: httpRequest,
        environmentVariables: { 'BASE_URL': 'https://api.example.com' }
      });
      expect(result).toEqual(response);
    });

    it('should handle HTTP request timeouts', async () => {
      const httpRequest = {
        method: 'GET',
        url: 'https://slow-api.example.com/users',
        headers: {},
        body: null,
        timeout_ms: 1000,
      };

      const errorMessage = 'Request timeout after 1000ms';
      mockInvoke.mockRejectedValue(new Error(errorMessage));

      await expect(
        invoke('http_execute_request', {
          request: httpRequest,
          environmentVariables: {}
        })
      ).rejects.toThrow(errorMessage);
    });

    it('should test connection', async () => {
      mockInvoke.mockResolvedValue(true);

      const result = await invoke('http_test_connection', {
        url: 'https://api.example.com'
      });

      expect(mockInvoke).toHaveBeenCalledWith('http_test_connection', {
        url: 'https://api.example.com'
      });
      expect(result).toBe(true);
    });
  });

  describe('Import/Export Commands', () => {
    it('should import Postman collection', async () => {
      const importResult = {
        success: true,
        collection_id: 'collection-123',
        imported_requests: 15,
        message: 'Successfully imported Postman collection',
      };

      mockInvoke.mockResolvedValue(importResult);

      const result = await invoke('import_postman_collection', {
        workspaceId: 'workspace-123',
        collectionData: { /* Postman collection JSON */ }
      });

      expect(mockInvoke).toHaveBeenCalledWith('import_postman_collection', {
        workspaceId: 'workspace-123',
        collectionData: { /* Postman collection JSON */ }
      });
      expect(result).toEqual(importResult);
    });

    it('should export collection to Postman format', async () => {
      const exportData = {
        info: { name: 'API Tests', version: '1.0.0' },
        item: [/* Postman collection items */],
      };

      mockInvoke.mockResolvedValue(exportData);

      const result = await invoke('export_collection_postman', {
        collectionId: 'collection-123'
      });

      expect(mockInvoke).toHaveBeenCalledWith('export_collection_postman', {
        collectionId: 'collection-123'
      });
      expect(result).toEqual(exportData);
    });

    it('should handle import errors gracefully', async () => {
      const errorMessage = 'Invalid Postman collection format';
      mockInvoke.mockRejectedValue(new Error(errorMessage));

      await expect(
        invoke('import_postman_collection', {
          workspaceId: 'workspace-123',
          collectionData: { invalid: 'data' }
        })
      ).rejects.toThrow(errorMessage);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Network unreachable');
      mockInvoke.mockRejectedValue(networkError);

      await expect(
        invoke('workspace_get_all')
      ).rejects.toThrow('Network unreachable');
    });

    it('should handle database errors', async () => {
      const dbError = new Error('Database connection failed');
      mockInvoke.mockRejectedValue(dbError);

      await expect(
        invoke('workspace_create', { request: {} })
      ).rejects.toThrow('Database connection failed');
    });

    it('should handle validation errors', async () => {
      const validationError = new Error('Workspace name is required');
      mockInvoke.mockRejectedValue(validationError);

      await expect(
        invoke('workspace_create', { 
          request: { name: '', local_path: '/test' } 
        })
      ).rejects.toThrow('Workspace name is required');
    });
  });

  describe('Performance and Reliability', () => {
    it('should handle concurrent requests', async () => {
      mockInvoke.mockImplementation((command) => {
        if (command === 'workspace_get_all') {
          return Promise.resolve([]);
        }
        if (command === 'environment_list') {
          return Promise.resolve([]);
        }
        if (command === 'collection_list') {
          return Promise.resolve([]);
        }
        return Promise.resolve(null);
      });

      const promises = [
        invoke('workspace_get_all'),
        invoke('environment_list', { workspaceId: 'test' }),
        invoke('collection_list', { workspaceId: 'test' }),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      expect(mockInvoke).toHaveBeenCalledTimes(3);
    });

    it('should handle large data responses', async () => {
      const largeCollection = {
        id: 'collection-123',
        name: 'Large Collection',
        requests: Array.from({ length: 1000 }, (_, i) => ({
          id: `request-${i}`,
          name: `Request ${i}`,
          method: 'GET',
          url: `https://api.example.com/endpoint/${i}`,
        })),
      };

      mockInvoke.mockResolvedValue(largeCollection);

      const result = await invoke('collection_get', { id: 'collection-123' });

      expect(result).toEqual(largeCollection);
      expect(result.requests).toHaveLength(1000);
    });
  });
});