import React from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div data-testid="test-wrapper">{children}</div>;
};

// Custom render function
const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: TestWrapper, ...options });

// Mock Tauri invoke function
export const mockTauriInvoke = vi.fn();

// Mock workspace store
export const mockWorkspaceStore = {
  workspaces: [],
  activeWorkspace: null,
  isLoading: false,
  error: null,
  createWorkspace: vi.fn(),
  setActiveWorkspace: vi.fn(),
  loadWorkspaces: vi.fn(),
};

// Mock successful workspace creation
export const mockSuccessfulWorkspaceCreation = (workspaceId = 'test-workspace-123') => {
  mockWorkspaceStore.createWorkspace.mockResolvedValue({
    id: workspaceId,
    name: 'Test Workspace',
    description: 'Test Description',
    local_path: '~/Documents/Postgirl/test-workspace',
    git_repository_url: 'https://github.com/test/repo.git',
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    last_accessed_at: '2023-01-01T00:00:00Z',
    is_active: true,
  });
};

// Mock failed workspace creation
export const mockFailedWorkspaceCreation = (error = 'Creation failed') => {
  mockWorkspaceStore.createWorkspace.mockRejectedValue(new Error(error));
  mockWorkspaceStore.error = error;
};

// Reset all mocks
export const resetMocks = () => {
  vi.clearAllMocks();
  mockWorkspaceStore.createWorkspace.mockReset();
  mockWorkspaceStore.setActiveWorkspace.mockReset();
  mockWorkspaceStore.loadWorkspaces.mockReset();
  mockWorkspaceStore.error = null;
  mockWorkspaceStore.isLoading = false;
};

// Test data generators
export const generateWorkspaceData = (overrides = {}) => ({
  name: 'Test Workspace',
  description: 'A test workspace',
  local_path: '~/Documents/Postgirl/test-workspace',
  git_repository_url: 'https://github.com/test/repo.git',
  ...overrides,
});

export const generateValidGitUrls = () => [
  'https://github.com/user/repo.git',
  'https://gitlab.com/user/project.git',
  'git@github.com:user/repo.git',
  'git@gitlab.com:user/project.git',
  'https://bitbucket.org/team/repo.git',
  'git@bitbucket.org:team/repo.git',
];

export const generateInvalidGitUrls = () => [
  'not-a-url',
  'https://github.com/user/repo', // missing .git
  'ftp://github.com/user/repo.git',
  'git@invalid', // incomplete SSH
  'https://',
  '',
];

// Re-export everything from testing-library
export * from '@testing-library/react';
export { customRender as render };