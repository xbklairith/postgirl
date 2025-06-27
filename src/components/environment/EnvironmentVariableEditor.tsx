import React, { useState } from 'react';
import { 
  PlusIcon, 
  TrashIcon, 
  EyeIcon, 
  EyeSlashIcon
} from '@heroicons/react/24/outline';
import { Button, Input, Select, Card, CardHeader, CardBody } from '../ui';
import { cn } from '../../utils/cn';
import type { 
  EnvironmentVariable, 
  VariableType
} from '../../types/environment';
import { 
  createDefaultEnvironmentVariable
} from '../../types/environment';

// Simple constants for variable types
const VARIABLE_TYPES: VariableType[] = ['string', 'secret'];
const VARIABLE_TYPE_LABELS: Record<VariableType, string> = {
  string: 'String',
  secret: 'Secret'
};

interface EnvironmentVariableEditorProps {
  variables: Record<string, EnvironmentVariable>;
  onChange: (variables: Record<string, EnvironmentVariable>) => void;
  readOnly?: boolean;
  className?: string;
}

export const EnvironmentVariableEditor: React.FC<EnvironmentVariableEditorProps> = ({
  variables,
  onChange,
  readOnly = false,
  className
}) => {
  const [newVariable, setNewVariable] = useState(createDefaultEnvironmentVariable());
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState('');
  const [selectedType, setSelectedType] = useState<VariableType | 'all'>('all');

  const variablesList = Object.values(variables);
  const filteredVariables = variablesList.filter(variable => {
    const matchesFilter = filter === '' || 
      variable.key.toLowerCase().includes(filter.toLowerCase()) ||
      variable.value.toLowerCase().includes(filter.toLowerCase());
    
    const matchesType = selectedType === 'all' || variable.variableType === selectedType;
    
    return matchesFilter && matchesType;
  });

  // Simple validation for variable values
  // const isValidValue = (value: string, type: VariableType): boolean => {
  //   if (type === 'secret') {
  //     return value.trim().length > 0; // Secrets must not be empty
  //   }
  //   return true; // Strings can be any value
  // };

  const addVariable = () => {
    if (!newVariable.key.trim()) return;
    
    const updatedVariables = {
      ...variables,
      [newVariable.key]: { ...newVariable }
    };
    
    onChange(updatedVariables);
    setNewVariable(createDefaultEnvironmentVariable());
  };

  const updateVariable = (key: string, updates: Partial<EnvironmentVariable>) => {
    const variable = variables[key];
    if (!variable) return;

    const updatedVariables = {
      ...variables,
      [key]: { ...variable, ...updates }
    };
    
    onChange(updatedVariables);
  };

  const removeVariable = (key: string) => {
    const updatedVariables = { ...variables };
    delete updatedVariables[key];
    onChange(updatedVariables);
  };

  const toggleSecret = (key: string) => {
    setShowSecrets(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const renderVariableRow = (variable: EnvironmentVariable) => {
    // const isValueValid = isValidValue(variable.value, variable.variableType);

    return (
      <div
        key={variable.key}
        className={cn(
          'grid grid-cols-12 gap-3 p-3 rounded-lg transition-all duration-200',
          'bg-white/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-600/60',
        )}
      >
        {/* Variable Key */}
        <div className="col-span-5">
          <Input
            value={variable.key}
            onChange={(e) => {
              // Handle key change by removing old key and adding new one
              const newKey = e.target.value;
              if (newKey !== variable.key) {
                const updatedVariables = { ...variables };
                delete updatedVariables[variable.key];
                if (newKey.trim()) {
                  updatedVariables[newKey] = { ...variable, key: newKey };
                }
                onChange(updatedVariables);
              }
            }}
            placeholder="Variable name"
            disabled={readOnly}
            className="text-sm"
          />
        </div>

        {/* Variable Value */}
        <div className="col-span-6 relative">
          <Input
            type={variable.isSecret && !showSecrets[variable.key] ? 'password' : 'text'}
            value={variable.value}
            onChange={(e) => updateVariable(variable.key, { value: e.target.value })}
            placeholder="Variable value"
            disabled={readOnly}
            className="text-sm pr-16"
          />
          <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
            {/* Show/hide secret value button - only for secrets */}
            {variable.isSecret && (
              <button
                type="button"
                onClick={() => toggleSecret(variable.key)}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                title={showSecrets[variable.key] ? 'Hide value' : 'Show value'}
              >
                {showSecrets[variable.key] ? (
                  <EyeSlashIcon className="w-4 h-4" />
                ) : (
                  <EyeIcon className="w-4 h-4" />
                )}
              </button>
            )}
            {/* Secret toggle button */}
            <button
              type="button"
              onClick={() => updateVariable(variable.key, { isSecret: !variable.isSecret, variableType: !variable.isSecret ? 'secret' : 'string' })}
              disabled={readOnly}
              className={`p-1 rounded transition-colors ${
                variable.isSecret
                  ? 'text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20'
                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:text-slate-300 dark:hover:bg-slate-800'
              }`}
              title={variable.isSecret ? 'Mark as string' : 'Mark as secret'}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                {variable.isSecret ? (
                  <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.4,7 14.8,8.6 14.8,10V11H16V16H8V11H9.2V10C9.2,8.6 10.6,7 12,7M12,8.2C11.2,8.2 10.4,8.7 10.4,10V11H13.6V10C13.6,8.7 12.8,8.2 12,8.2Z" />
                ) : (
                  <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.4,7 14.8,8.6 14.8,10V11H16V16H8V11H9.2V10C9.2,8.6 10.6,7 12,7M12,8.2C11.2,8.2 10.4,8.7 10.4,10V11H13.6V10C13.6,8.7 12.8,8.2 12,8.2Z" opacity="0.3" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="col-span-1 flex items-center justify-center">
          {!readOnly && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => removeVariable(variable.key)}
              className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
            >
              <TrashIcon className="w-4 h-4" />
            </Button>
          )}
        </div>

      </div>
    );
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Variables
            </h3>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              {variablesList.length} variable{variablesList.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex space-x-3 mt-3">
          <div className="flex-1">
            <Input
              placeholder="Search variables..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="w-32">
            <Select
              value={selectedType}
              onChange={(value) => setSelectedType(value as VariableType | 'all')}
              options={[
                { value: 'all', label: 'All' },
                ...VARIABLE_TYPES.map(type => ({ value: type, label: VARIABLE_TYPE_LABELS[type] }))
              ]}
              size="sm"
            />
          </div>
        </div>
      </CardHeader>
      
      <CardBody>
        <div className="space-y-4">
          {/* Header Row */}
          <div className="grid grid-cols-12 gap-3 px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 border-b border-slate-200/60 dark:border-slate-600/60">
            <div className="col-span-5">Name</div>
            <div className="col-span-6">Value</div>
            <div className="col-span-1">Actions</div>
          </div>

          {/* Variable Rows */}
          <div className="space-y-3">
            {filteredVariables.map(renderVariableRow)}
          </div>

          {/* Empty State */}
          {filteredVariables.length === 0 && (
            <div className="text-center py-8 text-slate-500 dark:text-slate-400">
              {variablesList.length === 0 
                ? "No environment variables defined"
                : "No variables match the current filter"
              }
            </div>
          )}

          {/* Add New Variable */}
          {!readOnly && (
            <div className="border-t border-slate-200/60 dark:border-slate-600/60 pt-4">
              <div className="grid grid-cols-12 gap-3 p-3 rounded-lg bg-slate-50/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-600/60">
                <div className="col-span-5">
                  <Input
                    value={newVariable.key}
                    onChange={(e) => setNewVariable(prev => ({ ...prev, key: e.target.value }))}
                    placeholder="Variable name"
                    className="text-sm"
                  />
                </div>

                <div className="col-span-6 relative">
                  <Input
                    type={newVariable.isSecret ? 'password' : 'text'}
                    value={newVariable.value}
                    onChange={(e) => setNewVariable(prev => ({ ...prev, value: e.target.value }))}
                    placeholder="Variable value"
                    className="text-sm pr-16"
                  />
                  <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
                    {/* Show/hide secret value button - only for secrets */}
                    {newVariable.isSecret && (
                      <button
                        type="button"
                        onClick={() => setShowSecrets(prev => ({ ...prev, ['new-variable']: !prev['new-variable'] }))}
                        className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                        title={showSecrets['new-variable'] ? 'Hide value' : 'Show value'}
                      >
                        {showSecrets['new-variable'] ? (
                          <EyeSlashIcon className="w-4 h-4" />
                        ) : (
                          <EyeIcon className="w-4 h-4" />
                        )}
                      </button>
                    )}
                    {/* Secret toggle button */}
                    <button
                      type="button"
                      onClick={() => setNewVariable(prev => ({ 
                        ...prev, 
                        isSecret: !prev.isSecret, 
                        variableType: !prev.isSecret ? 'secret' : 'string' 
                      }))}
                      className={`p-1 rounded transition-colors ${
                        newVariable.isSecret
                          ? 'text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20'
                          : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50 dark:hover:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                      title={newVariable.isSecret ? 'Mark as string' : 'Mark as secret'}
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        {newVariable.isSecret ? (
                          <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.4,7 14.8,8.6 14.8,10V11H16V16H8V11H9.2V10C9.2,8.6 10.6,7 12,7M12,8.2C11.2,8.2 10.4,8.7 10.4,10V11H13.6V10C13.6,8.7 12.8,8.2 12,8.2Z" />
                        ) : (
                          <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.4,7 14.8,8.6 14.8,10V11H16V16H8V11H9.2V10C9.2,8.6 10.6,7 12,7M12,8.2C11.2,8.2 10.4,8.7 10.4,10V11H13.6V10C13.6,8.7 12.8,8.2 12,8.2Z" opacity="0.3" />
                        )}
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="col-span-1 flex items-center justify-center">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={addVariable}
                    disabled={!newVariable.key.trim()}
                    className="w-8 h-8 p-0"
                  >
                    <PlusIcon className="w-4 h-4" />
                  </Button>
                </div>

              </div>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
};