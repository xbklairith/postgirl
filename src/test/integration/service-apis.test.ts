import { describe, it, expect, beforeEach, vi } from 'vitest';
import { invoke } from '@tauri-apps/api/core';
import * as workspaceApi from '../../services/workspace-api';
import * as environmentApi from '../../services/environment-api';
import * as collectionApi from '../../services/collection-api';
import * as gitApi from '../../services/git-api';
import * as httpApi from '../../services/http-api';
import type { CreateWorkspaceRequest, Workspace } from '../../types/workspace';
import type { Environment } from '../../types/environment';

// Mock the Tauri invoke function
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);

describe('Service API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Workspace API Service', () => {
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

    it('should initialize database through API', async () => {
      mockInvoke.mockResolvedValue(true);

      const result = await workspaceApi.initializeDatabase('/tmp/test.db');

      expect(mockInvoke).toHaveBeenCalledWith('workspace_initialize_database', {
        databasePath: '/tmp/test.db'
      });
      expect(result).toBe(true);
    });

    it('should create workspace through API', async () => {
      const createRequest: CreateWorkspaceRequest = {
        name: 'Test Workspace',
        description: 'A test workspace',
        git_repository_url: 'https://github.com/test/repo.git',
        local_path: '/Users/test/Documents/Postgirl/test-workspace',
      };

      mockInvoke.mockResolvedValue(mockWorkspace);

      const result = await workspaceApi.createWorkspace(createRequest);

      expect(mockInvoke).toHaveBeenCalledWith('workspace_create', {
        request: createRequest
      });
      expect(result).toEqual(mockWorkspace);
    });

    it('should get all workspaces through API', async () => {
      const workspaces = [mockWorkspace];
      mockInvoke.mockResolvedValue(workspaces);

      const result = await workspaceApi.getAllWorkspaces();

      expect(mockInvoke).toHaveBeenCalledWith('workspace_get_all');
      expect(result).toEqual(workspaces);
    });

    it('should get workspace by ID through API', async () => {
      mockInvoke.mockResolvedValue(mockWorkspace);

      const result = await workspaceApi.getWorkspace('workspace-123');

      expect(mockInvoke).toHaveBeenCalledWith('workspace_get', {
        id: 'workspace-123'
      });
      expect(result).toEqual(mockWorkspace);
    });

    it('should set active workspace through API', async () => {
      mockInvoke.mockResolvedValue(true);

      const result = await workspaceApi.setActiveWorkspace('workspace-123');

      expect(mockInvoke).toHaveBeenCalledWith('workspace_set_active', {
        id: 'workspace-123'
      });
      expect(result).toBe(true);
    });

    it('should delete workspace through API', async () => {
      mockInvoke.mockResolvedValue(true);

      const result = await workspaceApi.deleteWorkspace('workspace-123');

      expect(mockInvoke).toHaveBeenCalledWith('workspace_delete', {
        id: 'workspace-123'
      });
      expect(result).toBe(true);
    });

    it('should check directory existence through API', async () => {
      mockInvoke.mockResolvedValue(false);

      const result = await workspaceApi.checkDirectoryExists('/Users/test/new-workspace');

      expect(mockInvoke).toHaveBeenCalledWith('workspace_check_directory_exists', {
        path: '/Users/test/new-workspace'
      });
      expect(result).toBe(false);
    });

    it('should handle workspace API errors gracefully', async () => {
      const errorMessage = 'Workspace not found';
      mockInvoke.mockRejectedValue(new Error(errorMessage));

      await expect(
        workspaceApi.getWorkspace('non-existent')
      ).rejects.toThrow(errorMessage);
    });
  });

  describe('Environment API Service', () => {
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
      },
      is_active: true,
      created_at: '2023-01-01T00:00:00Z',
      updated_at: '2023-01-01T00:00:00Z',
    };

    it('should create environment through API', async () => {
      mockInvoke.mockResolvedValue(mockEnvironment);

      const result = await environmentApi.createEnvironment('workspace-123', 'Development');

      expect(mockInvoke).toHaveBeenCalledWith('environment_create', {
        workspaceId: 'workspace-123',
        name: 'Development'
      });
      expect(result).toEqual(mockEnvironment);
    });

    it('should list environments through API', async () => {
      const environments = [mockEnvironment];
      mockInvoke.mockResolvedValue(environments);

      const result = await environmentApi.listEnvironments('workspace-123');

      expect(mockInvoke).toHaveBeenCalledWith('environment_list', {
        workspaceId: 'workspace-123'
      });
      expect(result).toEqual(environments);
    });

    it('should add environment variable through API', async () => {
      const variable = {
        key: 'NEW_VAR',
        value: 'new-value',
        is_secret: false,
        variable_type: 'String' as const,
      };

      mockInvoke.mockResolvedValue(mockEnvironment);

      const result = await environmentApi.addVariable('env-123', variable);

      expect(mockInvoke).toHaveBeenCalledWith('environment_add_variable', {
        environmentId: 'env-123',
        variable: variable
      });
      expect(result).toEqual(mockEnvironment);
    });

    it('should delete environment through API', async () => {
      mockInvoke.mockResolvedValue(true);

      const result = await environmentApi.deleteEnvironment('env-123');

      expect(mockInvoke).toHaveBeenCalledWith('environment_delete', {
        id: 'env-123'
      });
      expect(result).toBe(true);
    });

    it('should handle environment API errors', async () => {
      const errorMessage = 'Environment already exists';
      mockInvoke.mockRejectedValue(new Error(errorMessage));

      await expect(
        environmentApi.createEnvironment('workspace-123', 'Duplicate')
      ).rejects.toThrow(errorMessage);
    });
  });

  describe('Collection API Service', () => {
    it('should create collection through API', async () => {
      const createRequest = {
        workspace_id: 'workspace-123',
        name: 'API Tests',
        description: 'Collection of API tests',
        folder_path: 'api',
        git_branch: 'main',
      };

      const mockCollection = {
        id: 'collection-123',
        ...createRequest,
        is_active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      mockInvoke.mockResolvedValue(mockCollection);

      const result = await collectionApi.createCollection(createRequest);

      expect(mockInvoke).toHaveBeenCalledWith('collection_create', {
        request: createRequest
      });
      expect(result).toEqual(mockCollection);
    });

    it('should list collections through API', async () => {
      const collections = [{
        id: 'collection-123',
        workspace_id: 'workspace-123',
        name: 'API Tests',
        description: 'Collection of API tests',
        folder_path: 'api',
        git_branch: 'main',
        is_active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      }];

      mockInvoke.mockResolvedValue(collections);

      const result = await collectionApi.listCollections('workspace-123');

      expect(mockInvoke).toHaveBeenCalledWith('collection_list', {
        workspaceId: 'workspace-123'
      });
      expect(result).toEqual(collections);
    });

    it('should handle collection API errors', async () => {
      const errorMessage = 'Invalid collection name';
      mockInvoke.mockRejectedValue(new Error(errorMessage));

      await expect(
        collectionApi.createCollection({
          workspace_id: 'workspace-123',
          name: '',
          description: null,
          folder_path: null,
          git_branch: null,
        })
      ).rejects.toThrow(errorMessage);
    });
  });

  describe('Git API Service', () => {
    it('should initialize repository through API', async () => {
      const gitResult = {
        success: true,
        message: 'Repository initialized successfully',
        path: '/Users/test/workspace',
      };

      mockInvoke.mockResolvedValue(gitResult);

      const result = await gitApi.initializeRepository('/Users/test/workspace');

      expect(mockInvoke).toHaveBeenCalledWith('git_initialize_repository', {
        path: '/Users/test/workspace'
      });
      expect(result).toEqual(gitResult);
    });

    it('should clone repository through API', async () => {
      const cloneResult = {
        success: true,
        message: 'Repository cloned successfully',
        path: '/Users/test/workspace',
      };

      mockInvoke.mockResolvedValue(cloneResult);

      const result = await gitApi.cloneRepository(
        'https://github.com/test/repo.git',
        '/Users/test/workspace',
        'main'
      );

      expect(mockInvoke).toHaveBeenCalledWith('git_clone_repository', {
        url: 'https://github.com/test/repo.git',
        path: '/Users/test/workspace',
        branch: 'main'
      });
      expect(result).toEqual(cloneResult);
    });

    it('should get repository status through API', async () => {
      const statusResult = {
        is_clean: false,
        staged_files: ['file1.txt'],
        unstaged_files: ['file2.txt'],
        untracked_files: ['file3.txt'],
      };

      mockInvoke.mockResolvedValue(statusResult);

      const result = await gitApi.getRepositoryStatus('/Users/test/workspace');

      expect(mockInvoke).toHaveBeenCalledWith('git_get_repository_status', {
        path: '/Users/test/workspace'
      });
      expect(result).toEqual(statusResult);
    });

    it('should handle Git API authentication errors', async () => {
      const errorMessage = 'SSH authentication failed';
      mockInvoke.mockRejectedValue(new Error(errorMessage));

      await expect(
        gitApi.cloneRepository(
          'git@github.com:private/repo.git',
          '/Users/test/workspace'
        )
      ).rejects.toThrow(errorMessage);
    });
  });

  describe('HTTP API Service', () => {
    it('should execute HTTP request through API', async () => {
      const httpRequest = {
        method: 'GET' as const,
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

      const result = await httpApi.executeRequest(httpRequest, {});

      expect(mockInvoke).toHaveBeenCalledWith('http_execute_request', {
        request: httpRequest,
        environmentVariables: {}
      });
      expect(result).toEqual(response);
    });

    it('should test connection through API', async () => {
      mockInvoke.mockResolvedValue(true);

      const result = await httpApi.testConnection('https://api.example.com');

      expect(mockInvoke).toHaveBeenCalledWith('http_test_connection', {
        url: 'https://api.example.com'
      });
      expect(result).toBe(true);
    });

    it('should handle HTTP API timeout errors', async () => {
      const errorMessage = 'Request timeout after 5000ms';
      mockInvoke.mockRejectedValue(new Error(errorMessage));

      await expect(
        httpApi.executeRequest({
          method: 'GET',
          url: 'https://slow-api.example.com/data',
          headers: {},
          body: null,
          timeout_ms: 5000,
        }, {})
      ).rejects.toThrow(errorMessage);
    });
  });

  describe('Cross-Service Integration', () => {
    it('should create workspace with environment and collection', async () => {
      // Mock workspace creation
      const workspace = {
        id: 'workspace-123',
        name: 'Integration Test',
        description: 'Testing cross-service integration',
        git_repository_url: null,
        local_path: '/Users/test/integration-test',
        is_active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        last_accessed_at: '2023-01-01T00:00:00Z',
      };

      const environment = {
        id: 'env-123',
        name: 'Development',
        variables: {},
        is_active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      const collection = {
        id: 'collection-123',
        workspace_id: 'workspace-123',
        name: 'API Tests',
        description: 'Test collection',
        folder_path: null,
        git_branch: null,
        is_active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      };

      mockInvoke
        .mockResolvedValueOnce(workspace) // workspace_create
        .mockResolvedValueOnce(environment) // environment_create
        .mockResolvedValueOnce(collection); // collection_create

      // Create workspace
      const createdWorkspace = await workspaceApi.createWorkspace({
        name: 'Integration Test',
        description: 'Testing cross-service integration',
        git_repository_url: null,
        local_path: '/Users/test/integration-test',
      });

      // Create environment in the workspace
      const createdEnvironment = await environmentApi.createEnvironment(
        createdWorkspace.id,
        'Development'
      );

      // Create collection in the workspace
      const createdCollection = await collectionApi.createCollection({
        workspace_id: createdWorkspace.id,
        name: 'API Tests',
        description: 'Test collection',
        folder_path: null,
        git_branch: null,
      });

      expect(createdWorkspace.id).toBe('workspace-123');
      expect(createdEnvironment.id).toBe('env-123');
      expect(createdCollection.id).toBe('collection-123');
      expect(mockInvoke).toHaveBeenCalledTimes(3);
    });

    it('should handle Git-enabled workspace creation workflow', async () => {
      const gitResult = {
        success: true,
        message: 'Repository cloned successfully',
        path: '/Users/test/git-workspace',
      };

      const workspace = {
        id: 'workspace-git-123',
        name: 'Git Workspace',
        description: 'Git-enabled workspace',
        git_repository_url: 'https://github.com/test/repo.git',
        local_path: '/Users/test/git-workspace',
        is_active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        last_accessed_at: '2023-01-01T00:00:00Z',
      };

      mockInvoke
        .mockResolvedValueOnce(gitResult) // git_clone_repository
        .mockResolvedValueOnce(workspace); // workspace_create

      // Clone repository first
      const cloneResult = await gitApi.cloneRepository(
        'https://github.com/test/repo.git',
        '/Users/test/git-workspace',
        'main'
      );

      // Create workspace with Git URL
      const createdWorkspace = await workspaceApi.createWorkspace({
        name: 'Git Workspace',
        description: 'Git-enabled workspace',
        git_repository_url: 'https://github.com/test/repo.git',
        local_path: '/Users/test/git-workspace',
      });

      expect(cloneResult.success).toBe(true);
      expect(createdWorkspace.git_repository_url).toBe('https://github.com/test/repo.git');
      expect(mockInvoke).toHaveBeenCalledTimes(2);
    });

    it('should handle complete request execution workflow', async () => {
      const environments = [{
        id: 'env-123',
        name: 'Development',
        variables: {
          'API_URL': {
            key: 'API_URL',
            value: 'https://api.dev.example.com',
            is_secret: false,
            variable_type: 'String' as const,
          },
          'API_KEY': {
            key: 'API_KEY',
            value: 'dev-key-123',
            is_secret: true,
            variable_type: 'Secret' as const,
          },
        },
        is_active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      }];

      const response = {
        status: 200,
        headers: { 'content-type': 'application/json' },
        body: { users: [{ id: 1, name: 'John Doe' }] },
        timing: {
          total_time_ms: 245,
          dns_lookup_ms: 12,
          connect_ms: 34,
          tls_handshake_ms: 56,
          first_byte_ms: 123,
        },
      };

      mockInvoke
        .mockResolvedValueOnce(environments) // environment_list
        .mockResolvedValueOnce(response); // http_execute_request

      // Get environments first
      const workspaceEnvironments = await environmentApi.listEnvironments('workspace-123');
      
      // Extract environment variables
      const activeEnv = workspaceEnvironments.find(env => env.is_active);
      const envVars = Object.fromEntries(
        Object.values(activeEnv!.variables).map(v => [v.key, v.value])
      );

      // Execute request with environment variables
      const httpResponse = await httpApi.executeRequest({
        method: 'GET',
        url: '{{API_URL}}/users',
        headers: { 'Authorization': 'Bearer {{API_KEY}}' },
        body: null,
        timeout_ms: 30000,
      }, envVars);

      expect(workspaceEnvironments).toHaveLength(1);
      expect(httpResponse.status).toBe(200);
      expect(httpResponse.body.users).toHaveLength(1);
      expect(mockInvoke).toHaveBeenCalledTimes(2);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle partial failures in multi-step operations', async () => {
      mockInvoke
        .mockResolvedValueOnce({ id: 'workspace-123', name: 'Test' }) // workspace_create succeeds
        .mockRejectedValueOnce(new Error('Environment creation failed')) // environment_create fails
        .mockResolvedValueOnce({ id: 'collection-123', name: 'Test Collection' }); // collection_create succeeds

      // Create workspace - should succeed
      const workspace = await workspaceApi.createWorkspace({
        name: 'Test',
        description: null,
        git_repository_url: null,
        local_path: '/tmp/test',
      });

      expect(workspace.id).toBe('workspace-123');

      // Create environment - should fail
      await expect(
        environmentApi.createEnvironment(workspace.id, 'Development')
      ).rejects.toThrow('Environment creation failed');

      // Create collection - should still work
      const collection = await collectionApi.createCollection({
        workspace_id: workspace.id,
        name: 'Test Collection',
        description: null,
        folder_path: null,
        git_branch: null,
      });

      expect(collection.id).toBe('collection-123');
    });

    it('should handle network interruptions gracefully', async () => {
      // Simulate network failure followed by success
      mockInvoke
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce([]);

      // First attempt fails
      await expect(
        workspaceApi.getAllWorkspaces()
      ).rejects.toThrow('Network timeout');

      // Retry succeeds
      const workspaces = await workspaceApi.getAllWorkspaces();
      expect(workspaces).toEqual([]);
    });
  });

  describe('Data Consistency and Validation', () => {
    it('should maintain data consistency across service calls', async () => {
      const workspaceId = 'workspace-123';
      
      const workspace = {
        id: workspaceId,
        name: 'Consistency Test',
        description: 'Testing data consistency',
        git_repository_url: null,
        local_path: '/tmp/consistency-test',
        is_active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        last_accessed_at: '2023-01-01T00:00:00Z',
      };

      const environments = [
        { id: 'env-1', name: 'Development', workspace_id: workspaceId },
        { id: 'env-2', name: 'Production', workspace_id: workspaceId },
      ];

      const collections = [
        { id: 'col-1', name: 'API Tests', workspace_id: workspaceId },
        { id: 'col-2', name: 'Integration Tests', workspace_id: workspaceId },
      ];

      mockInvoke
        .mockResolvedValueOnce(workspace)
        .mockResolvedValueOnce(environments)
        .mockResolvedValueOnce(collections);

      // Get workspace and its related data
      const fetchedWorkspace = await workspaceApi.getWorkspace(workspaceId);
      const workspaceEnvironments = await environmentApi.listEnvironments(workspaceId);
      const workspaceCollections = await collectionApi.listCollections(workspaceId);

      // Verify data consistency
      expect(fetchedWorkspace.id).toBe(workspaceId);
      expect(workspaceEnvironments.every(env => env.workspace_id === workspaceId)).toBe(true);
      expect(workspaceCollections.every(col => col.workspace_id === workspaceId)).toBe(true);
    });

    it('should validate API parameters before sending to backend', async () => {
      // These should trigger validation errors before calling invoke
      await expect(
        workspaceApi.createWorkspace({
          name: '', // empty name
          description: null,
          git_repository_url: null,
          local_path: '/tmp/test',
        })
      ).rejects.toThrow();

      await expect(
        environmentApi.createEnvironment('', 'Test') // empty workspace ID
      ).rejects.toThrow();

      // Verify invoke was never called due to validation failures
      expect(mockInvoke).not.toHaveBeenCalled();
    });
  });
});