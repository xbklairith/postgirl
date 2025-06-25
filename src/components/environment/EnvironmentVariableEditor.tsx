import React, { useState } from 'react';
import { 
  PlusIcon, 
  TrashIcon, 
  EyeIcon, 
  EyeSlashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
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
  const isValidValue = (value: string, type: VariableType): boolean => {
    if (type === 'secret') {
      return value.trim().length > 0; // Secrets must not be empty
    }
    return true; // Strings can be any value
  };

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
    const isValueValid = isValidValue(variable.value, variable.variableType);

    return (
      <div
        key={variable.key}
        className={cn(
          'grid grid-cols-12 gap-3 p-3 rounded-lg transition-all duration-200',
          'bg-white/50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-600/60',
        )}
      >
        {/* Variable Type Indicator */}
        <div className="col-span-1 flex items-center">
          <span className={`text-xs px-2 py-1 rounded font-medium ${
            variable.isSecret 
              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
          }`}>
            {variable.isSecret ? 'Secret' : 'String'}
          </span>
        </div>

        {/* Variable Key */}
        <div className="col-span-3">
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
        <div className="col-span-3 relative">
          <Input
            type={variable.isSecret && !showSecrets[variable.key] ? 'password' : 'text'}
            value={variable.value}
            onChange={(e) => updateVariable(variable.key, { value: e.target.value })}
            placeholder="Variable value"
            disabled={readOnly}
            className={cn(
              'text-sm pr-8',
              !isValueValid && 'border-amber-300 dark:border-amber-600'
            )}
          />
          {variable.isSecret && (
            <button
              type="button"
              onClick={() => toggleSecret(variable.key)}
              className="absolute right-2 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
            >
              {showSecrets[variable.key] ? (
                <EyeSlashIcon className="w-4 h-4" />
              ) : (
                <EyeIcon className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {/* Variable Type */}
        <div className="col-span-2">
          <Select
            value={variable.variableType}
            onChange={(value) => updateVariable(variable.key, { variableType: value as VariableType })}
            options={VARIABLE_TYPES.map(type => ({ value: type, label: VARIABLE_TYPE_LABELS[type] }))}
            disabled={readOnly}
            size="sm"
          />
        </div>

        {/* Secret Toggle */}
        <div className="col-span-1 flex items-center justify-center">
          <input
            type="checkbox"
            checked={variable.isSecret}
            onChange={(e) => updateVariable(variable.key, { isSecret: e.target.checked })}
            disabled={readOnly}
            className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
            title="Mark as secret"
          />
        </div>

        {/* Status Indicators */}
        <div className="col-span-1 flex items-center justify-center">
          {!isValueValid ? (
            <ExclamationTriangleIcon className="w-4 h-4 text-orange-500" title="Invalid value for type" />
          ) : (
            <CheckCircleIcon className="w-4 h-4 text-green-500" title="Valid" />
          )}
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
          <div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Environment Variables
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {variablesList.length} variable{variablesList.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex space-x-3 mt-4">
          <div className="flex-1">
            <Input
              placeholder="Search variables..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="text-sm"
            />
          </div>
          <div className="w-40">
            <Select
              value={selectedType}
              onChange={(value) => setSelectedType(value as VariableType | 'all')}
              options={[
                { value: 'all', label: 'All Types' },
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
            <div className="col-span-1">Enabled</div>
            <div className="col-span-3">Name</div>
            <div className="col-span-3">Value</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-1">Secret</div>
            <div className="col-span-1">Status</div>
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
                <div className="col-span-1 flex items-center">
                  <span className="text-xs text-slate-500 dark:text-slate-400">New</span>
                </div>

                <div className="col-span-3">
                  <Input
                    value={newVariable.key}
                    onChange={(e) => setNewVariable(prev => ({ ...prev, key: e.target.value }))}
                    placeholder="Variable name"
                    className="text-sm"
                  />
                </div>

                <div className="col-span-3">
                  <Input
                    type={newVariable.isSecret ? 'password' : 'text'}
                    value={newVariable.value}
                    onChange={(e) => setNewVariable(prev => ({ ...prev, value: e.target.value }))}
                    placeholder="Variable value"
                    className="text-sm"
                  />
                </div>

                <div className="col-span-2">
                  <Select
                    value={newVariable.variableType}
                    onChange={(value) => setNewVariable(prev => ({ ...prev, variableType: value as VariableType }))}
                    options={VARIABLE_TYPES.map(type => ({ value: type, label: VARIABLE_TYPE_LABELS[type] }))}
                    size="sm"
                  />
                </div>

                <div className="col-span-1 flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={newVariable.isSecret}
                    onChange={(e) => setNewVariable(prev => ({ ...prev, isSecret: e.target.checked }))}
                    className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                    title="Mark as secret"
                  />
                </div>

                <div className="col-span-1 flex items-center justify-center">
                  <span className="text-xs text-slate-400">
                    {isValidValue(newVariable.value, newVariable.variableType) ? '✓' : '!'}
                  </span>
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