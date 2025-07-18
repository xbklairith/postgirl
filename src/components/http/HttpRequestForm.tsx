import React, { useState, useEffect, useCallback } from 'react';
import { PlayIcon, ClockIcon, CheckCircleIcon, XCircleIcon, CogIcon } from '@heroicons/react/24/outline';
import { Button, Select, VariableHighlighter } from '../ui';
import { RequestBodyEditor } from './RequestBodyEditor';
import { EnvironmentSelector } from '../environment/EnvironmentSelector';
import { EnvironmentEditor } from '../environment/EnvironmentEditor';
import { EnvironmentApiService } from '../../services/environment-api';
import { useWorkspaceStore } from '../../stores/workspace-store';
import { useRequestTabStore } from '../../stores/request-tab-store';
import { tabManager } from '../../services/tab-manager';
import type { HttpRequest, HttpResponse, HttpError, HttpMethod } from '../../types/http';
import type { Environment } from '../../types/environment';
import { HTTP_METHODS, formatResponseTime, getStatusColor } from '../../types/http';

interface HttpRequestFormProps {
  // Remove initialRequest prop as we now use the active tab
  onResponse?: (response: HttpResponse) => void;
  onError?: (error: HttpError) => void;
}


export const HttpRequestForm: React.FC<HttpRequestFormProps> = ({
  onResponse,
  onError
}) => {
  // Get active tab from store
  const { getActiveTab, updateTabRequest, setTabError } = useRequestTabStore();
  const activeTab = getActiveTab();
  
  // If no active tab, don't render the form
  if (!activeTab) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500 dark:text-slate-400">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">No request tab open</p>
          <p className="text-sm">Open a request from the collection or create a new tab to get started</p>
        </div>
      </div>
    );
  }

  const request = activeTab.request;
  const response = activeTab.response;
  const error = activeTab.error;
  const isLoading = activeTab.isLoading;

  // Environment state
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeEnvironmentId, setActiveEnvironmentId] = useState<string | undefined>();
  const [isEnvironmentEditorOpen, setIsEnvironmentEditorOpen] = useState(false);
  const [editingEnvironment, setEditingEnvironment] = useState<Environment | undefined>();

  // Get current workspace
  const { activeWorkspace } = useWorkspaceStore();
  const workspaceId = activeWorkspace?.id || 'default-workspace';

  // Helper function to update request in active tab
  const updateRequest = useCallback((updates: Partial<HttpRequest>) => {
    if (!activeTab) return;
    updateTabRequest(activeTab.id, updates);
  }, [activeTab, updateTabRequest]);

  // Load environments on component mount
  useEffect(() => {
    loadEnvironments();
  }, []);

  const loadEnvironments = async () => {
    try {
      let envs = await EnvironmentApiService.listEnvironments(workspaceId);
      
      // Note: No auto-creation of default environments
      // Let user work without environments or create them manually
      
      setEnvironments(envs);
      
      // Get or set active environment
      const activeEnv = await EnvironmentApiService.getActiveEnvironment(workspaceId);
      if (activeEnv) {
        setActiveEnvironmentId(activeEnv.id);
      } else if (envs.length > 0) {
        await EnvironmentApiService.setActiveEnvironment(workspaceId, envs[0].id);
        setActiveEnvironmentId(envs[0].id);
      }
    } catch (err) {
      console.error('Failed to load environments:', err);
    }
  };

  const handleEnvironmentChange = async (environmentId: string) => {
    try {
      await EnvironmentApiService.setActiveEnvironment(workspaceId, environmentId);
      setActiveEnvironmentId(environmentId);
    } catch (err) {
      console.error('Failed to change environment:', err);
    }
  };

  const handleCreateEnvironment = () => {
    setEditingEnvironment(undefined);
    setIsEnvironmentEditorOpen(true);
  };

  const handleEditEnvironment = (environment: Environment) => {
    setEditingEnvironment(environment);
    setIsEnvironmentEditorOpen(true);
  };

  const handleSaveEnvironment = async (environment: Environment) => {
    try {
      if (editingEnvironment) {
        await EnvironmentApiService.updateEnvironment(environment);
      } else {
        // First create the environment
        const newEnv = await EnvironmentApiService.createEnvironment(
          workspaceId,
          environment.name
        );
        
        // Then add variables if any exist
        const variables = Object.values(environment.variables);
        if (variables.length > 0) {
          for (const variable of variables) {
            await EnvironmentApiService.addVariable(newEnv.id, variable);
          }
        }
      }
      
      await loadEnvironments();
      setIsEnvironmentEditorOpen(false);
    } catch (err) {
      console.error('Failed to save environment:', err);
    }
  };

  const handleDeleteEnvironment = async (environmentId: string) => {
    try {
      await EnvironmentApiService.deleteEnvironment(environmentId);
      await loadEnvironments();
      
      // If deleted environment was active, set a new active environment
      if (environmentId === activeEnvironmentId && environments.length > 1) {
        const remainingEnvs = environments.filter(env => env.id !== environmentId);
        if (remainingEnvs.length > 0) {
          await handleEnvironmentChange(remainingEnvs[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to delete environment:', err);
    }
  };

  const getActiveEnvironmentVariables = (): Record<string, string> => {
    if (!activeEnvironmentId) return {};
    
    const activeEnv = environments.find(env => env.id === activeEnvironmentId);
    if (!activeEnv) return {};
    
    const variables: Record<string, string> = {};
    for (const [key, variable] of Object.entries(activeEnv.variables)) {
      variables[key] = variable.value;
    }
    return variables;
  };

  const handleExecuteRequest = async () => {
    if (!activeTab) return;

    try {
      // Use the tab manager to execute the request
      await tabManager.executeTabRequest(activeTab.id);
      
      // Get updated tab state
      const updatedTab = getActiveTab();
      if (updatedTab?.response) {
        onResponse?.(updatedTab.response);
      } else if (updatedTab?.error) {
        onError?.(updatedTab.error);
      }
    } catch (err) {
      const error: HttpError = {
        errorType: 'unknownError',
        message: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
      
      // Set error on the tab
      setTabError(activeTab.id, error);
      onError?.(error);
    }
  };



  const renderResponseStatus = () => {
    if (!response) return null;

    const statusColor = getStatusColor(response.status);
    const statusColorClass = {
      green: 'text-green-600 bg-green-50 border-green-200',
      red: 'text-red-600 bg-red-50 border-red-200',
      yellow: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      orange: 'text-orange-600 bg-orange-50 border-orange-200',
      blue: 'text-blue-600 bg-blue-50 border-blue-200',
      gray: 'text-gray-600 bg-gray-50 border-gray-200'
    }[statusColor] || 'text-gray-600 bg-gray-50 border-gray-200';

    return (
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${statusColorClass}`}>
        {response.status >= 200 && response.status < 300 ? (
          <CheckCircleIcon className="w-4 h-4 mr-1" />
        ) : (
          <XCircleIcon className="w-4 h-4 mr-1" />
        )}
        {response.status} {response.statusText}
      </div>
    );
  };

  return (
    <div className="space-y-6 w-full max-w-full overflow-hidden">
      {/* Request Form */}
      <div className="space-y-6 w-full max-w-full">
        {/* Header Section */}
        <div className="flex items-center justify-between w-full max-w-full min-w-0">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 truncate">
              {request.name}
            </h3>
            {activeTab.requestId && (
              <span className="px-2 py-1 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 text-xs rounded-full flex-shrink-0">
                Collection Request
              </span>
            )}
            {activeTab.hasUnsavedChanges && (
              <span className="px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 text-xs rounded-full flex-shrink-0">
                Unsaved
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3 flex-shrink-0">
            <EnvironmentSelector
              environments={environments}
              activeEnvironmentId={activeEnvironmentId}
              onEnvironmentChange={handleEnvironmentChange}
              onCreateEnvironment={handleCreateEnvironment}
              onEditEnvironment={handleEditEnvironment}
              onManageEnvironments={() => {}} // Not needed in this context
              className="min-w-[200px]"
            />
          </div>
        </div>

        {/* Request Form Content */}
        <div className="space-y-4 w-full max-w-full">
            {/* Method and URL */}
            <div className="flex space-x-2 w-full max-w-full">
              <Select
                value={request.method}
                onChange={(value) => updateRequest({ method: value as HttpMethod })}
                options={HTTP_METHODS.map(method => ({ value: method, label: method }))}
                className="min-w-[100px] flex-shrink-0"
              />
              
              <div className="flex-1 min-w-0">
                <VariableHighlighter
                  value={request.url}
                  onChange={(url) => updateRequest({ url })}
                  variables={getActiveEnvironmentVariables()}
                  placeholder="api.example.com/endpoint"
                  className="text-sm w-full"
                />
              </div>
              
              <Button
                variant="primary"
                onClick={handleExecuteRequest}
                disabled={isLoading || !request.url.trim()}
                className="flex items-center space-x-2 min-w-[100px] flex-shrink-0"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    <span>Sending</span>
                  </>
                ) : (
                  <>
                    <PlayIcon className="w-4 h-4" />
                    <span>Send</span>
                  </>
                )}
              </Button>
            </div>


            {/* Request Body */}
            <div>
              <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Request Body</h4>
              <RequestBodyEditor
                body={request.body || { type: 'none' }}
                onChange={(body) => updateRequest({ body })}
                variables={getActiveEnvironmentVariables()}
              />
            </div>

            {/* Environment Variables Info */}
            {activeEnvironmentId && (
              <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200/60 dark:border-slate-600/60">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
                    Active Environment Variables
                  </h4>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const activeEnv = environments.find(env => env.id === activeEnvironmentId);
                      if (activeEnv) handleEditEnvironment(activeEnv);
                    }}
                    className="text-xs"
                  >
                    <CogIcon className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(getActiveEnvironmentVariables()).map(([key, value]) => (
                    <span
                      key={key}
                      className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                      title={`${key}: ${value}`}
                    >
                      {key}
                    </span>
                  ))}
                  {Object.keys(getActiveEnvironmentVariables()).length === 0 && (
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      No environment variables defined
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                  Use <code className="bg-slate-200 dark:bg-slate-700 px-1 rounded">{'{{variable_name}}'}</code> in URLs and headers to substitute values
                </p>
              </div>
            )}
        </div>
      </div>

      {/* Response */}
      {(response || error) && (
        <div className="space-y-4">
          {/* Response Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Response
            </h3>
            {response && (
              <div className="flex items-center space-x-4">
                {renderResponseStatus()}
                <div className="flex items-center space-x-1 text-sm text-slate-500">
                  <ClockIcon className="w-4 h-4" />
                  <span>{formatResponseTime(response.timing.totalTimeMs)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Response Content */}
          <div>
            {error ? (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <XCircleIcon className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <p className="text-red-800 dark:text-red-200 font-medium">{error.message}</p>
                    {error.details && (
                      <p className="text-red-600 dark:text-red-300 text-sm mt-1">{error.details}</p>
                    )}
                  </div>
                </div>
              </div>
            ) : response ? (
              <div className="space-y-4">
                {/* Response Headers */}
                {Object.keys(response.headers).length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Headers</h4>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 space-y-1">
                      {Object.entries(response.headers).map(([key, value]) => (
                        <div key={key} className="flex text-sm">
                          <span className="text-slate-600 dark:text-slate-400 min-w-[150px]">{key}:</span>
                          <span className="text-slate-900 dark:text-slate-100">{value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Response Body */}
                <div>
                  <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Body</h4>
                  <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3">
                    {response.body.type === 'json' ? (
                      <pre className="text-sm text-slate-900 dark:text-slate-100 whitespace-pre-wrap overflow-x-auto">
                        {JSON.stringify(response.body.data, null, 2)}
                      </pre>
                    ) : response.body.type === 'text' ? (
                      <pre className="text-sm text-slate-900 dark:text-slate-100 whitespace-pre-wrap">
                        {response.body.content}
                      </pre>
                    ) : response.body.type === 'binary' ? (
                      <div className="text-sm text-slate-600 dark:text-slate-400">
                        Binary data ({response.body.size} bytes)
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500 dark:text-slate-400 italic">
                        No response body
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* Environment Editor Modal */}
      <EnvironmentEditor
        environment={editingEnvironment}
        isOpen={isEnvironmentEditorOpen}
        onClose={() => setIsEnvironmentEditorOpen(false)}
        onSave={handleSaveEnvironment}
        onDelete={handleDeleteEnvironment}
      />
    </div>
  );
};