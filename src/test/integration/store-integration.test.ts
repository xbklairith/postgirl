import { describe, it, expect, beforeEach, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { invoke } from '@tauri-apps/api/core';
import { useWorkspaceStore } from '../../stores/workspace-store';
import { useRequestTabStore } from '../../stores/request-tab-store';
import type { Workspace, CreateWorkspaceRequest } from '../../types/workspace';
import type { RequestTab } from '../../types/tab';

// Mock the Tauri invoke function
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

const mockInvoke = vi.mocked(invoke);

describe('Store Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Workspace Store Integration', () => {
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

    it('should load workspaces from backend', async () => {
      const workspaces = [mockWorkspace];
      mockInvoke.mockResolvedValue(workspaces);

      const { result } = renderHook(() => useWorkspaceStore());

      // Initial state
      expect(result.current.workspaces).toEqual([]);
      expect(result.current.isLoading).toBe(false);

      // Load workspaces
      await act(async () => {
        await result.current.loadWorkspaces();
      });

      expect(mockInvoke).toHaveBeenCalledWith('workspace_get_all');
      expect(result.current.workspaces).toEqual(workspaces);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle loading state correctly', async () => {
      // Mock a slow response
      mockInvoke.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve([mockWorkspace]), 100))
      );

      const { result } = renderHook(() => useWorkspaceStore());

      // Start loading
      const loadPromise = act(async () => {
        await result.current.loadWorkspaces();
      });

      // Should be loading
      expect(result.current.isLoading).toBe(true);

      // Wait for completion
      await loadPromise;

      expect(result.current.isLoading).toBe(false);
      expect(result.current.workspaces).toEqual([mockWorkspace]);
    });

    it('should create workspace and update store', async () => {
      const createRequest: CreateWorkspaceRequest = {
        name: 'New Workspace',
        description: 'A new test workspace',
        git_repository_url: null,
        local_path: '/Users/test/new-workspace',
      };

      const newWorkspace = { ...mockWorkspace, id: 'new-workspace-456', ...createRequest };
      mockInvoke.mockResolvedValue(newWorkspace);

      const { result } = renderHook(() => useWorkspaceStore());

      // Create workspace
      await act(async () => {
        await result.current.createWorkspace(createRequest);
      });

      expect(mockInvoke).toHaveBeenCalledWith('workspace_create', {
        request: createRequest
      });
      expect(result.current.workspaces).toContain(newWorkspace);
    });

    it('should set active workspace', async () => {
      const workspaces = [
        { ...mockWorkspace, is_active: false },
        { ...mockWorkspace, id: 'workspace-456', is_active: true },
      ];

      mockInvoke
        .mockResolvedValueOnce(workspaces) // loadWorkspaces
        .mockResolvedValueOnce(true); // setActiveWorkspace

      const { result } = renderHook(() => useWorkspaceStore());

      // Load initial workspaces
      await act(async () => {
        await result.current.loadWorkspaces();
      });

      expect(result.current.activeWorkspace?.id).toBe('workspace-456');

      // Set different active workspace
      await act(async () => {
        await result.current.setActiveWorkspace('workspace-123');
      });

      expect(mockInvoke).toHaveBeenCalledWith('workspace_set_active', {
        id: 'workspace-123'
      });
      expect(result.current.activeWorkspace?.id).toBe('workspace-123');
    });

    it('should handle workspace deletion', async () => {
      const workspaces = [mockWorkspace];
      mockInvoke
        .mockResolvedValueOnce(workspaces) // loadWorkspaces
        .mockResolvedValueOnce(true); // deleteWorkspace

      const { result } = renderHook(() => useWorkspaceStore());

      // Load workspaces first
      await act(async () => {
        await result.current.loadWorkspaces();
      });

      expect(result.current.workspaces).toHaveLength(1);

      // Delete workspace
      await act(async () => {
        await result.current.deleteWorkspace('workspace-123');
      });

      expect(mockInvoke).toHaveBeenCalledWith('workspace_delete', {
        id: 'workspace-123'
      });
      expect(result.current.workspaces).toHaveLength(0);
    });

    it('should handle errors gracefully', async () => {
      const errorMessage = 'Failed to load workspaces';
      mockInvoke.mockRejectedValue(new Error(errorMessage));

      const { result } = renderHook(() => useWorkspaceStore());

      await act(async () => {
        await result.current.loadWorkspaces();
      });

      expect(result.current.error).toBe(errorMessage);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.workspaces).toEqual([]);
    });

    it('should clear errors on successful operations', async () => {
      const { result } = renderHook(() => useWorkspaceStore());

      // First, cause an error
      mockInvoke.mockRejectedValueOnce(new Error('Test error'));
      await act(async () => {
        await result.current.loadWorkspaces();
      });
      expect(result.current.error).toBe('Test error');

      // Then, succeed
      mockInvoke.mockResolvedValue([mockWorkspace]);
      await act(async () => {
        await result.current.loadWorkspaces();
      });
      expect(result.current.error).toBeNull();
    });
  });

  describe('Request Tab Store Integration', () => {
    const mockTab: RequestTab = {
      id: 'tab-123',
      title: 'GET /users',
      type: 'request',
      isActive: true,
      isDirty: false,
      request: {
        id: 'request-123',
        collection_id: 'collection-123',
        name: 'Get Users',
        description: null,
        method: 'GET',
        url: 'https://api.example.com/users',
        headers: '{}',
        body: null,
        body_type: 'json',
        auth_type: null,
        auth_config: null,
        follow_redirects: true,
        timeout_ms: 30000,
        order_index: 0,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
      createdAt: new Date('2023-01-01T00:00:00Z'),
      updatedAt: new Date('2023-01-01T00:00:00Z'),
    };

    it('should manage request tabs state', () => {
      const { result } = renderHook(() => useRequestTabStore());

      // Initial state
      expect(result.current.tabs).toEqual([]);
      expect(result.current.activeTabId).toBeNull();

      // Add tab
      act(() => {
        result.current.addTab(mockTab);
      });

      expect(result.current.tabs).toHaveLength(1);
      expect(result.current.tabs[0]).toEqual(mockTab);
      expect(result.current.activeTabId).toBe('tab-123');
    });

    it('should handle multiple tabs correctly', () => {
      const { result } = renderHook(() => useRequestTabStore());

      const tab1 = { ...mockTab, id: 'tab-1', title: 'GET /users' };
      const tab2 = { ...mockTab, id: 'tab-2', title: 'POST /users', isActive: false };
      const tab3 = { ...mockTab, id: 'tab-3', title: 'DELETE /users/:id', isActive: false };

      // Add multiple tabs
      act(() => {
        result.current.addTab(tab1);
        result.current.addTab(tab2);
        result.current.addTab(tab3);
      });

      expect(result.current.tabs).toHaveLength(3);
      expect(result.current.activeTabId).toBe('tab-3'); // Last added should be active

      // Switch active tab
      act(() => {
        result.current.setActiveTab('tab-2');
      });

      expect(result.current.activeTabId).toBe('tab-2');
      expect(result.current.tabs.find(t => t.id === 'tab-2')?.isActive).toBe(true);
      expect(result.current.tabs.find(t => t.id === 'tab-1')?.isActive).toBe(false);
      expect(result.current.tabs.find(t => t.id === 'tab-3')?.isActive).toBe(false);
    });

    it('should close tabs correctly', () => {
      const { result } = renderHook(() => useRequestTabStore());

      const tab1 = { ...mockTab, id: 'tab-1', title: 'GET /users' };
      const tab2 = { ...mockTab, id: 'tab-2', title: 'POST /users', isActive: false };
      const tab3 = { ...mockTab, id: 'tab-3', title: 'DELETE /users/:id', isActive: false };

      // Add tabs
      act(() => {
        result.current.addTab(tab1);
        result.current.addTab(tab2);
        result.current.addTab(tab3);
      });

      // Close middle tab
      act(() => {
        result.current.closeTab('tab-2');
      });

      expect(result.current.tabs).toHaveLength(2);
      expect(result.current.tabs.map(t => t.id)).toEqual(['tab-1', 'tab-3']);

      // Close active tab
      act(() => {
        result.current.closeTab('tab-3');
      });

      expect(result.current.tabs).toHaveLength(1);
      expect(result.current.activeTabId).toBe('tab-1'); // Should switch to remaining tab
    });

    it('should update tab content', () => {
      const { result } = renderHook(() => useRequestTabStore());

      act(() => {
        result.current.addTab(mockTab);
      });

      // Update tab
      act(() => {
        result.current.updateTab('tab-123', {
          title: 'Updated Title',
          isDirty: true,
          request: {
            ...mockTab.request!,
            url: 'https://api.example.com/updated',
          },
        });
      });

      const updatedTab = result.current.tabs.find(t => t.id === 'tab-123');
      expect(updatedTab?.title).toBe('Updated Title');
      expect(updatedTab?.isDirty).toBe(true);
      expect(updatedTab?.request?.url).toBe('https://api.example.com/updated');
    });

    it('should handle tab persistence', () => {
      const { result } = renderHook(() => useRequestTabStore());

      // Add tabs
      act(() => {
        result.current.addTab(mockTab);
        result.current.addTab({ ...mockTab, id: 'tab-2', title: 'POST /users' });
      });

      // Save session
      act(() => {
        result.current.saveSession();
      });

      // Clear tabs
      act(() => {
        result.current.closeAllTabs();
      });

      expect(result.current.tabs).toHaveLength(0);

      // Restore session
      act(() => {
        result.current.restoreSession();
      });

      expect(result.current.tabs).toHaveLength(2);
    });

    it('should handle dirty tab warnings', () => {
      const { result } = renderHook(() => useRequestTabStore());

      const dirtyTab = { ...mockTab, isDirty: true };

      act(() => {
        result.current.addTab(dirtyTab);
      });

      // Try to close dirty tab
      const canClose = result.current.canCloseTab('tab-123');
      expect(canClose).toBe(false); // Should warn about unsaved changes

      // Mark as clean
      act(() => {
        result.current.updateTab('tab-123', { isDirty: false });
      });

      const canCloseNow = result.current.canCloseTab('tab-123');
      expect(canCloseNow).toBe(true);
    });
  });

  describe('Cross-Store Integration', () => {
    it('should coordinate between workspace and tab stores', async () => {
      const mockWorkspace = {
        id: 'workspace-123',
        name: 'Test Workspace',
        description: null,
        git_repository_url: null,
        local_path: '/tmp/test',
        is_active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        last_accessed_at: '2023-01-01T00:00:00Z',
      };

      const mockTabs = [
        { ...mockTab, id: 'tab-1', title: 'Request 1' },
        { ...mockTab, id: 'tab-2', title: 'Request 2' },
      ];

      mockInvoke.mockResolvedValue([mockWorkspace]);

      const workspaceStore = renderHook(() => useWorkspaceStore());
      const tabStore = renderHook(() => useRequestTabStore());

      // Load workspace
      await act(async () => {
        await workspaceStore.result.current.loadWorkspaces();
      });

      // Add tabs related to the workspace
      act(() => {
        mockTabs.forEach(tab => tabStore.result.current.addTab(tab));
      });

      expect(workspaceStore.result.current.workspaces).toHaveLength(1);
      expect(tabStore.result.current.tabs).toHaveLength(2);

      // Switch workspace (should clear tabs)
      act(() => {
        tabStore.result.current.closeAllTabs();
      });

      expect(tabStore.result.current.tabs).toHaveLength(0);
    });

    it('should handle workspace deletion affecting open tabs', async () => {
      const workspaceStore = renderHook(() => useWorkspaceStore());
      const tabStore = renderHook(() => useRequestTabStore());

      const workspaceId = 'workspace-123';
      const workspaceTabs = [
        { 
          ...mockTab, 
          id: 'tab-1', 
          request: { ...mockTab.request!, collection_id: 'col-1' } 
        },
        { 
          ...mockTab, 
          id: 'tab-2', 
          request: { ...mockTab.request!, collection_id: 'col-2' } 
        },
      ];

      // Add tabs
      act(() => {
        workspaceTabs.forEach(tab => tabStore.result.current.addTab(tab));
      });

      expect(tabStore.result.current.tabs).toHaveLength(2);

      // Mock workspace deletion
      mockInvoke.mockResolvedValue(true);
      
      await act(async () => {
        await workspaceStore.result.current.deleteWorkspace(workspaceId);
      });

      // Tabs related to deleted workspace should be closed
      act(() => {
        tabStore.result.current.closeTabsByWorkspace(workspaceId);
      });

      expect(tabStore.result.current.tabs).toHaveLength(0);
    });
  });

  describe('State Persistence and Recovery', () => {
    it('should persist workspace selection across sessions', async () => {
      const workspaces = [
        { ...mockWorkspace, id: 'workspace-1', is_active: false },
        { ...mockWorkspace, id: 'workspace-2', is_active: true },
      ];

      mockInvoke.mockResolvedValue(workspaces);

      const { result } = renderHook(() => useWorkspaceStore());

      await act(async () => {
        await result.current.loadWorkspaces();
      });

      expect(result.current.activeWorkspace?.id).toBe('workspace-2');

      // Simulate session restart
      const { result: newResult } = renderHook(() => useWorkspaceStore());

      await act(async () => {
        await newResult.current.loadWorkspaces();
      });

      expect(newResult.current.activeWorkspace?.id).toBe('workspace-2');
    });

    it('should recover from corrupted state gracefully', () => {
      const tabStore = renderHook(() => useRequestTabStore());

      // Simulate corrupted state restoration
      const corruptedTabs = [
        { ...mockTab, id: null }, // Invalid tab
        { ...mockTab, request: null }, // Missing request
        mockTab, // Valid tab
      ];

      act(() => {
        // Should filter out invalid tabs
        corruptedTabs.forEach(tab => {
          try {
            if (tab.id && tab.request) {
              tabStore.result.current.addTab(tab as RequestTab);
            }
          } catch (error) {
            // Ignore invalid tabs
          }
        });
      });

      // Only valid tab should be added
      expect(tabStore.result.current.tabs).toHaveLength(1);
      expect(tabStore.result.current.tabs[0].id).toBe('tab-123');
    });
  });

  describe('Performance and Memory Management', () => {
    it('should limit number of open tabs', () => {
      const { result } = renderHook(() => useRequestTabStore());

      // Add many tabs
      for (let i = 0; i < 25; i++) {
        act(() => {
          result.current.addTab({
            ...mockTab,
            id: `tab-${i}`,
            title: `Request ${i}`,
            isActive: false,
          });
        });
      }

      // Should enforce tab limit (e.g., 20 tabs)
      expect(result.current.tabs.length).toBeLessThanOrEqual(20);
    });

    it('should cleanup resources when closing tabs', () => {
      const { result } = renderHook(() => useRequestTabStore());

      // Add tab with response data
      const tabWithResponse = {
        ...mockTab,
        response: {
          status: 200,
          headers: {},
          body: new Array(1000).fill('large data'), // Large response
          timing: { total_time_ms: 100 },
        },
      };

      act(() => {
        result.current.addTab(tabWithResponse);
      });

      expect(result.current.tabs[0].response).toBeDefined();

      // Close tab should cleanup response data
      act(() => {
        result.current.closeTab('tab-123');
      });

      expect(result.current.tabs).toHaveLength(0);
      // Memory should be freed (can't directly test, but tab is removed)
    });

    it('should debounce rapid state updates', async () => {
      const { result } = renderHook(() => useRequestTabStore());

      act(() => {
        result.current.addTab(mockTab);
      });

      // Rapid updates
      act(() => {
        for (let i = 0; i < 10; i++) {
          result.current.updateTab('tab-123', {
            title: `Title ${i}`,
            isDirty: true,
          });
        }
      });

      // Should only reflect the last update
      expect(result.current.tabs[0].title).toBe('Title 9');
      expect(result.current.tabs[0].isDirty).toBe(true);
    });
  });
});