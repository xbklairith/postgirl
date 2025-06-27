import React, { useState, useEffect } from 'react';
import { EnvironmentManagement } from './EnvironmentManagement';
import { EnvironmentApiService } from '../../services/environment-api';
// import type { Environment } from '../../types/environment';

export const EnvironmentDemo: React.FC = () => {
  const [workspaceId] = useState('demo-workspace');
  const [activeEnvironmentId, setActiveEnvironmentId] = useState<string | undefined>();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    initializeDemo();
  }, []);

  const initializeDemo = async () => {
    try {
      // Create some demo environments
      const demoEnvs = await EnvironmentApiService.createDefaultEnvironments(workspaceId);
      
      if (demoEnvs.length > 0) {
        // Add some demo variables to the development environment
        const devEnv = demoEnvs.find(env => env.name.toLowerCase().includes('dev'));
        if (devEnv) {
          await EnvironmentApiService.addVariable(devEnv.id, {
            key: 'API_URL',
            value: 'https://httpbin.org',
            isSecret: false,
            variableType: 'string'
          });

          await EnvironmentApiService.addVariable(devEnv.id, {
            key: 'API_KEY',
            value: 'dev-api-key-123',
            isSecret: true,
            variableType: 'secret'
          });

          await EnvironmentApiService.addVariable(devEnv.id, {
            key: 'DEBUG_MODE',
            value: 'true',
            isSecret: false,
            variableType: 'string'
          });

          await EnvironmentApiService.addVariable(devEnv.id, {
            key: 'TIMEOUT_MS',
            value: '30000',
            isSecret: false,
            variableType: 'string'
          });
        }

        // Add different variables to staging environment
        const stagingEnv = demoEnvs.find(env => env.name.toLowerCase().includes('staging'));
        if (stagingEnv) {
          await EnvironmentApiService.addVariable(stagingEnv.id, {
            key: 'API_URL',
            value: 'https://httpbin.org',
            isSecret: false,
            variableType: 'string'
          });

          await EnvironmentApiService.addVariable(stagingEnv.id, {
            key: 'API_KEY',
            value: 'staging-api-key-456',
            isSecret: true,
            variableType: 'secret'
          });

          await EnvironmentApiService.addVariable(stagingEnv.id, {
            key: 'DEBUG_MODE',
            value: 'false',
            isSecret: false,
            variableType: 'string'
          });
        }

        // Add production variables
        const prodEnv = demoEnvs.find(env => env.name.toLowerCase().includes('prod'));
        if (prodEnv) {
          await EnvironmentApiService.addVariable(prodEnv.id, {
            key: 'API_URL',
            value: 'https://httpbin.org',
            isSecret: false,
            variableType: 'string'
          });

          await EnvironmentApiService.addVariable(prodEnv.id, {
            key: 'API_KEY',
            value: 'prod-api-key-789',
            isSecret: true,
            variableType: 'secret'
          });

          await EnvironmentApiService.addVariable(prodEnv.id, {
            key: 'DEBUG_MODE',
            value: 'false',
            isSecret: false,
            variableType: 'string'
          });

          await EnvironmentApiService.addVariable(prodEnv.id, {
            key: 'RATE_LIMIT',
            value: '1000',
            isSecret: false,
            variableType: 'string'
          });
        }

        // Set development as active
        if (devEnv) {
          await EnvironmentApiService.setActiveEnvironment(workspaceId, devEnv.id);
          setActiveEnvironmentId(devEnv.id);
        }
      }

      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to initialize demo:', error);
      setIsInitialized(true); // Show the component even if initialization fails
    }
  };


  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent mx-auto mb-4"></div>
          <p className="text-slate-600 dark:text-slate-400">Initializing demo environment...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Demo Header */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                Environment Management Demo
              </h2>
              <p className="text-blue-700 dark:text-blue-300 text-sm mt-1">
                This demo showcases the environment management features with sample data.
              </p>
            </div>
          </div>
        </div>

        {/* Environment Management Component */}
        <EnvironmentManagement
          workspaceId={workspaceId}
          activeEnvironmentId={activeEnvironmentId}
          onEnvironmentChange={setActiveEnvironmentId}
        />
      </div>
    </div>
  );
};