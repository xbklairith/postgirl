import React from 'react';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import type { Workspace, WorkspaceSummary, CreateWorkspaceRequest } from '../types/workspace';
import * as workspaceApi from '../services/workspace-api';

interface WorkspaceState {
  // State
  workspaces: Workspace[];
  activeWorkspace: Workspace | null;
  workspaceSummaries: WorkspaceSummary[];
  isLoading: boolean;
  error: string | null;
  
  // Actions
  initializeDatabase: (databasePath: string) => Promise<void>;
  loadWorkspaces: () => Promise<void>;
  loadWorkspaceSummaries: () => Promise<void>;
  createWorkspace: (request: CreateWorkspaceRequest) => Promise<Workspace>;
  setActiveWorkspace: (id: string) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  accessWorkspace: (id: string) => Promise<void>;
  clearError: () => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    workspaces: [],
    activeWorkspace: null,
    workspaceSummaries: [],
    isLoading: false,
    error: null,

    // Initialize database
    initializeDatabase: async (databasePath: string) => {
      set({ isLoading: true, error: null });
      try {
        await workspaceApi.initializeDatabase(databasePath);
        await get().loadWorkspaces();
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to initialize database' });
      } finally {
        set({ isLoading: false });
      }
    },

    // Load all workspaces
    loadWorkspaces: async () => {
      set({ isLoading: true, error: null });
      try {
        const [workspaces, activeWorkspace] = await Promise.all([
          workspaceApi.getAllWorkspaces(),
          workspaceApi.getActiveWorkspace()
        ]);
        set({ workspaces, activeWorkspace });
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to load workspaces' });
      } finally {
        set({ isLoading: false });
      }
    },

    // Load workspace summaries for dashboard
    loadWorkspaceSummaries: async () => {
      set({ isLoading: true, error: null });
      try {
        const workspaceSummaries = await workspaceApi.getWorkspaceSummaries();
        set({ workspaceSummaries });
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to load workspace summaries' });
      } finally {
        set({ isLoading: false });
      }
    },

    // Create new workspace
    createWorkspace: async (request: CreateWorkspaceRequest) => {
      set({ isLoading: true, error: null });
      try {
        const workspace = await workspaceApi.createWorkspace(request);
        
        // Add to workspaces list
        set(state => ({
          workspaces: [...state.workspaces, workspace]
        }));
        
        // Reload summaries to get updated data
        await get().loadWorkspaceSummaries();
        
        return workspace;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to create workspace';
        set({ error: errorMessage });
        throw new Error(errorMessage);
      } finally {
        set({ isLoading: false });
      }
    },

    // Set active workspace
    setActiveWorkspace: async (id: string) => {
      set({ isLoading: true, error: null });
      try {
        await workspaceApi.setActiveWorkspace(id);
        
        // Update local state
        const { workspaces } = get();
        const newActiveWorkspace = workspaces.find(w => w.id === id) || null;
        
        // Update all workspaces to reflect active status
        const updatedWorkspaces = workspaces.map(w => ({
          ...w,
          is_active: w.id === id
        }));
        
        set({ 
          activeWorkspace: newActiveWorkspace,
          workspaces: updatedWorkspaces
        });
        
        // Access the workspace (updates last_accessed_at)
        if (id) {
          await workspaceApi.accessWorkspace(id);
        }
        
        // Reload summaries to get updated access time
        await get().loadWorkspaceSummaries();
        
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to set active workspace' });
        throw error;
      } finally {
        set({ isLoading: false });
      }
    },

    // Delete workspace
    deleteWorkspace: async (id: string) => {
      set({ isLoading: true, error: null });
      try {
        await workspaceApi.deleteWorkspace(id);
        
        // Remove from local state
        set(state => ({
          workspaces: state.workspaces.filter(w => w.id !== id),
          activeWorkspace: state.activeWorkspace?.id === id ? null : state.activeWorkspace,
          workspaceSummaries: state.workspaceSummaries.filter(w => w.id !== id)
        }));
        
        // If we deleted the active workspace, clear it
        const { activeWorkspace } = get();
        if (activeWorkspace?.id === id) {
          set({ activeWorkspace: null });
        }
        
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to delete workspace' });
        throw error;
      } finally {
        set({ isLoading: false });
      }
    },

    // Access workspace (update last accessed time)
    accessWorkspace: async (id: string) => {
      try {
        await workspaceApi.accessWorkspace(id);
        // Reload summaries to reflect updated access time
        await get().loadWorkspaceSummaries();
      } catch (error) {
        // Don't show error for access tracking, silently ignore
      }
    },

    // Clear error
    clearError: () => set({ error: null })
  }))
);

// Helper hook for workspace initialization
export const useWorkspaceInitialization = () => {
  const initializeDatabase = useWorkspaceStore(state => state.initializeDatabase);
  
  React.useEffect(() => {
    // Initialize with database path in user data directory (outside source)
    const defaultDbPath = 'sqlite:../data/postgirl.db';
    initializeDatabase(defaultDbPath);
  }, [initializeDatabase]);
};

// Export for external use
export default useWorkspaceStore;