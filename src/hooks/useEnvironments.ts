import { useState, useEffect, useCallback } from 'react';
import { EnvironmentApiService } from '../services/environment-api';
import type { 
  Environment, 
  EnvironmentVariable
} from '../types/environment';

export interface UseEnvironmentsOptions {
  workspaceId: string;
  autoLoad?: boolean;
}

export interface UseEnvironmentsReturn {
  // State
  environments: Environment[];
  activeEnvironment: Environment | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadEnvironments: () => Promise<void>;
  createEnvironment: (name: string) => Promise<Environment>;
  updateEnvironment: (environment: Environment) => Promise<Environment>;
  deleteEnvironment: (environmentId: string) => Promise<void>;
  duplicateEnvironment: (environmentId: string, newName: string) => Promise<Environment>;
  setActiveEnvironment: (environmentId: string) => Promise<void>;
  
  // Variable operations
  addVariable: (environmentId: string, variable: EnvironmentVariable) => Promise<Environment>;
  updateVariable: (environmentId: string, variable: EnvironmentVariable) => Promise<Environment>;
  removeVariable: (environmentId: string, variableKey: string) => Promise<Environment>;
  
  // Utility operations
  substituteVariables: (text: string, environmentId?: string) => Promise<string>;
  
  // Helpers
  getEnvironmentById: (id: string) => Environment | undefined;
  getActiveEnvironmentVariables: () => Record<string, string>;
  createDefaultEnvironments: () => Promise<Environment[]>;
}

export const useEnvironments = ({ 
  workspaceId, 
  autoLoad = true 
}: UseEnvironmentsOptions): UseEnvironmentsReturn => {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeEnvironment, setActiveEnvironmentState] = useState<Environment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load environments from API
  const loadEnvironments = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const envs = await EnvironmentApiService.listEnvironments(workspaceId);
      setEnvironments(envs);
      
      // Get active environment
      const activeEnv = await EnvironmentApiService.getActiveEnvironment(workspaceId);
      setActiveEnvironmentState(activeEnv);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load environments';
      setError(errorMessage);
      console.error('Error loading environments:', err);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId]);

  // Auto-load on mount
  useEffect(() => {
    if (autoLoad) {
      loadEnvironments();
    }
  }, [autoLoad, loadEnvironments]);

  // Create new environment
  const createEnvironment = useCallback(async (name: string): Promise<Environment> => {
    try {
      const environment = await EnvironmentApiService.createEnvironment(workspaceId, name);
      await loadEnvironments(); // Reload to get updated list
      return environment;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create environment';
      setError(errorMessage);
      throw err;
    }
  }, [workspaceId, loadEnvironments]);

  // Update environment
  const updateEnvironment = useCallback(async (environment: Environment): Promise<Environment> => {
    try {
      const updated = await EnvironmentApiService.updateEnvironment(environment);
      await loadEnvironments(); // Reload to get updated list
      return updated;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update environment';
      setError(errorMessage);
      throw err;
    }
  }, [loadEnvironments]);

  // Delete environment
  const deleteEnvironment = useCallback(async (environmentId: string): Promise<void> => {
    try {
      await EnvironmentApiService.deleteEnvironment(environmentId);
      await loadEnvironments(); // Reload to get updated list
      
      // If deleted environment was active, clear active environment
      if (activeEnvironment?.id === environmentId) {
        setActiveEnvironmentState(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete environment';
      setError(errorMessage);
      throw err;
    }
  }, [loadEnvironments, activeEnvironment]);

  // Duplicate environment
  const duplicateEnvironment = useCallback(async (environmentId: string, newName: string): Promise<Environment> => {
    try {
      const duplicated = await EnvironmentApiService.duplicateEnvironment(environmentId, newName, workspaceId);
      await loadEnvironments(); // Reload to get updated list
      return duplicated;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to duplicate environment';
      setError(errorMessage);
      throw err;
    }
  }, [workspaceId, loadEnvironments]);

  // Set active environment
  const setActiveEnvironment = useCallback(async (environmentId: string): Promise<void> => {
    try {
      await EnvironmentApiService.setActiveEnvironment(workspaceId, environmentId);
      const environment = environments.find(env => env.id === environmentId);
      setActiveEnvironmentState(environment || null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to set active environment';
      setError(errorMessage);
      throw err;
    }
  }, [workspaceId, environments]);

  // Add variable
  const addVariable = useCallback(async (environmentId: string, variable: EnvironmentVariable): Promise<Environment> => {
    try {
      const updated = await EnvironmentApiService.addVariable(environmentId, variable);
      await loadEnvironments(); // Reload to get updated list
      return updated;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add variable';
      setError(errorMessage);
      throw err;
    }
  }, [loadEnvironments]);

  // Update variable
  const updateVariable = useCallback(async (environmentId: string, variable: EnvironmentVariable): Promise<Environment> => {
    try {
      const updated = await EnvironmentApiService.updateVariable(environmentId, variable);
      await loadEnvironments(); // Reload to get updated list
      return updated;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update variable';
      setError(errorMessage);
      throw err;
    }
  }, [loadEnvironments]);

  // Remove variable
  const removeVariable = useCallback(async (environmentId: string, variableKey: string): Promise<Environment> => {
    try {
      const updated = await EnvironmentApiService.removeVariable(environmentId, variableKey);
      await loadEnvironments(); // Reload to get updated list
      return updated;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to remove variable';
      setError(errorMessage);
      throw err;
    }
  }, [loadEnvironments]);


  // Substitute variables
  const substituteVariables = useCallback(async (text: string, environmentId?: string): Promise<string> => {
    try {
      const envId = environmentId || activeEnvironment?.id;
      if (!envId) {
        return text; // No environment to substitute from
      }

      const environment = environments.find(env => env.id === envId);
      if (!environment) {
        return text;
      }

      const variables = getActiveEnvironmentVariables();
      return await EnvironmentApiService.substituteVariables(text, variables);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to substitute variables';
      setError(errorMessage);
      throw err;
    }
  }, [activeEnvironment, environments]);

  // Helper: Get environment by ID
  const getEnvironmentById = useCallback((id: string): Environment | undefined => {
    return environments.find(env => env.id === id);
  }, [environments]);

  // Helper: Get active environment variables as key-value pairs
  const getActiveEnvironmentVariables = useCallback((): Record<string, string> => {
    if (!activeEnvironment) return {};
    
    const result: Record<string, string> = {};
    for (const [key, variable] of Object.entries(activeEnvironment.variables)) {
      result[key] = variable.value;
    }
    return result;
  }, [activeEnvironment]);

  // Helper: Create default environments
  const createDefaultEnvironments = useCallback(async (): Promise<Environment[]> => {
    try {
      const defaults = await EnvironmentApiService.createDefaultEnvironments(workspaceId);
      await loadEnvironments(); // Reload to get updated list
      return defaults;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create default environments';
      setError(errorMessage);
      throw err;
    }
  }, [workspaceId, loadEnvironments]);

  return {
    // State
    environments,
    activeEnvironment,
    isLoading,
    error,
    
    // Actions
    loadEnvironments,
    createEnvironment,
    updateEnvironment,
    deleteEnvironment,
    duplicateEnvironment,
    setActiveEnvironment,
    
    // Variable operations
    addVariable,
    updateVariable,
    removeVariable,
    
    // Utility operations
    substituteVariables,
    
    // Helpers
    getEnvironmentById,
    getActiveEnvironmentVariables,
    createDefaultEnvironments
  };
};