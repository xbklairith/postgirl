export interface Environment {
  id: string;
  name: string;
  variables: Record<string, EnvironmentVariable>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EnvironmentVariable {
  key: string;
  value: string;
  isSecret: boolean;
  variableType: VariableType;
}

export type VariableType = 'string' | 'secret';

// Form data interfaces for UI components
export interface EnvironmentFormData {
  name: string;
  variables: EnvironmentVariable[];
}

// Helper functions
export function createDefaultEnvironment(): Environment {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    name: 'New Environment',
    variables: {},
    isActive: false,
    createdAt: now,
    updatedAt: now,
  };
}

export function createDefaultEnvironmentVariable(): EnvironmentVariable {
  return {
    key: '',
    value: '',
    isSecret: false,
    variableType: 'string',
  };
}