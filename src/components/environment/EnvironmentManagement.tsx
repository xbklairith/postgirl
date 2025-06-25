import React, { useState, useEffect } from 'react';
import { 
  PlusIcon,
  Cog6ToothIcon,
  DocumentDuplicateIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { Button, Card, CardHeader, CardBody } from '../ui';
import { EnvironmentSelector } from './EnvironmentSelector';
import { EnvironmentEditor } from './EnvironmentEditor';
import { EnvironmentApiService } from '../../services/environment-api';
import { cn } from '../../utils/cn';
import type { 
  Environment
} from '../../types/environment';

interface EnvironmentManagementProps {
  workspaceId: string;
  activeEnvironmentId?: string;
  onEnvironmentChange?: (environmentId: string) => void;
  className?: string;
}

export const EnvironmentManagement: React.FC<EnvironmentManagementProps> = ({
  workspaceId,
  activeEnvironmentId,
  onEnvironmentChange,
  className
}) => {
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeTab, setActiveTab] = useState<'overview' | 'editor'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editor state
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingEnvironment, setEditingEnvironment] = useState<Environment | undefined>();


  useEffect(() => {
    loadEnvironments();
  }, [workspaceId]);

  const loadEnvironments = async () => {
    try {
      setIsLoading(true);
      const envs = await EnvironmentApiService.listEnvironments(workspaceId);
      setEnvironments(envs);
      
      // Note: No auto-creation of default environments
      // Users can manually create environments as needed
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load environments');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateEnvironment = () => {
    setEditingEnvironment(undefined);
    setIsEditorOpen(true);
  };

  const handleEditEnvironment = (environment: Environment) => {
    setEditingEnvironment(environment);
    setIsEditorOpen(true);
  };

  const handleSaveEnvironment = async (environment: Environment) => {
    try {
      if (editingEnvironment) {
        console.log('Updating existing environment:', environment);
        await EnvironmentApiService.updateEnvironment(environment);
      } else {
        console.log('Creating new environment:', environment);
        // First create the environment
        const newEnv = await EnvironmentApiService.createEnvironment(
          workspaceId,
          environment.name
        );
        
        // Then add variables if any exist
        const variables = Object.values(environment.variables);
        if (variables.length > 0) {
          console.log('Adding variables to new environment:', variables);
          for (const variable of variables) {
            await EnvironmentApiService.addVariable(newEnv.id, variable);
          }
        }
      }
      
      await loadEnvironments();
      setIsEditorOpen(false);
    } catch (err) {
      console.error('Save environment error:', err);
      setError(err instanceof Error ? err.message : 'Failed to save environment');
    }
  };

  const handleDeleteEnvironment = async (environmentId: string) => {
    try {
      await EnvironmentApiService.deleteEnvironment(environmentId);
      await loadEnvironments();
      
      // If deleted environment was active, set a new active environment
      if (environmentId === activeEnvironmentId && environments.length > 1) {
        const remainingEnvs = environments.filter(env => env.id !== environmentId);
        if (remainingEnvs.length > 0 && onEnvironmentChange) {
          await EnvironmentApiService.setActiveEnvironment(workspaceId, remainingEnvs[0].id);
          onEnvironmentChange(remainingEnvs[0].id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete environment');
    }
  };

  const handleDuplicateEnvironment = async (environment: Environment) => {
    try {
      await EnvironmentApiService.duplicateEnvironment(
        environment.id,
        `${environment.name} (Copy)`,
        workspaceId
      );
      await loadEnvironments();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to duplicate environment');
    }
  };

  const handleEnvironmentChange = async (environmentId: string) => {
    try {
      await EnvironmentApiService.setActiveEnvironment(workspaceId, environmentId);
      onEnvironmentChange?.(environmentId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set active environment');
    }
  };

  // const handleValidateEnvironment = async (environment: Environment): Promise<ValidationResult> => {
  //   // For now, return a simple validation
  //   // In a real implementation, this would validate against a schema
  //   return {
  //     isValid: true,
  //     errors: [],
  //     warnings: []
  //   };
  // };


  const getEnvironmentStatus = (environment: Environment) => {
    // Simple validation - in real implementation, this would use actual validation
    const variableCount = Object.keys(environment.variables).length;
    
    if (variableCount === 0) {
      return { status: 'warning', message: 'No variables defined' };
    }
    
    return { status: 'success', message: `${variableCount} variables` };
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <div className="flex items-center space-x-2">
          <ExclamationTriangleIcon className="w-5 h-5 text-red-500" />
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={loadEnvironments}
          className="mt-2 text-red-600 hover:text-red-700"
        >
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
            Environment Management
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage environment variables and configurations for your workspace
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <EnvironmentSelector
            environments={environments}
            activeEnvironmentId={activeEnvironmentId}
            onEnvironmentChange={handleEnvironmentChange}
            onCreateEnvironment={handleCreateEnvironment}
            onEditEnvironment={handleEditEnvironment}
            onManageEnvironments={() => setActiveTab('overview')}
            className="min-w-[250px]"
          />
          
          <Button
            variant="primary"
            onClick={handleCreateEnvironment}
            className="flex items-center space-x-2"
          >
            <PlusIcon className="w-4 h-4" />
            <span>New Environment</span>
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-slate-200/60 dark:border-slate-600/60">
        <nav className="flex space-x-8">
          {[
            { id: 'overview', label: 'Overview', icon: Cog6ToothIcon },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                'flex items-center space-x-2 py-3 px-1 border-b-2 font-medium text-sm',
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
              )}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <>
          {environments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                <Cog6ToothIcon className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">
                No Environments
              </h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md">
                Environments help you manage different configurations for development, staging, and production.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  variant="primary"
                  onClick={handleCreateEnvironment}
                  className="flex items-center space-x-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Create Environment</span>
                </Button>
                <Button
                  variant="secondary"
                  onClick={async () => {
                    try {
                      await EnvironmentApiService.createDefaultEnvironments(workspaceId);
                      await loadEnvironments();
                    } catch (err) {
                      console.error('Failed to create default environments:', err);
                      alert('Failed to create default environments. Please try again.');
                    }
                  }}
                  className="flex items-center space-x-2"
                >
                  <span>Create Default Environments</span>
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {environments.map(environment => {
            const status = getEnvironmentStatus(environment);
            const isActive = environment.id === activeEnvironmentId;
            
            return (
              <Card key={environment.id} className="relative">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                          {environment.name}
                        </h3>
                        {isActive && (
                          <span className="px-2 py-1 text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardBody>
                  <div className="space-y-2">
                    {/* Status and Variables Count */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {status.status === 'success' ? (
                          <CheckCircleIcon className="w-4 h-4 text-green-500" />
                        ) : (
                          <ExclamationTriangleIcon className={cn(
                            'w-4 h-4',
                            status.status === 'error' ? 'text-red-500' : 'text-amber-500'
                          )} />
                        )}
                        <span className="text-sm text-slate-600 dark:text-slate-400">
                          {Object.keys(environment.variables).length} variables
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(environment.updatedAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditEnvironment(environment)}
                        className="flex items-center space-x-1"
                      >
                        <Cog6ToothIcon className="w-3 h-3" />
                        <span>Edit</span>
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicateEnvironment(environment)}
                        className="flex items-center space-x-1"
                      >
                        <DocumentDuplicateIcon className="w-3 h-3" />
                        <span>Duplicate</span>
                      </Button>

                      {!isActive && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEnvironmentChange(environment.id)}
                          className="text-primary-600 hover:text-primary-700"
                        >
                          Activate
                        </Button>
                      )}
                    </div>
                  </div>
                </CardBody>
              </Card>
            );
          })}
            </div>
          )}
        </>
      )}


      {/* Environment Editor Modal */}
      <EnvironmentEditor
        environment={editingEnvironment}
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSaveEnvironment}
        onDelete={handleDeleteEnvironment}
        onDuplicate={handleDuplicateEnvironment}
      />
    </div>
  );
};