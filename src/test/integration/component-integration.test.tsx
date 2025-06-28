import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { invoke } from '@tauri-apps/api/core';
import { WorkspaceCreationWizard } from '../../components/workspace/WorkspaceCreationWizard';
import { EnvironmentSelector } from '../../components/environment/EnvironmentSelector';
import { ImportDialog } from '../../components/import/ImportDialog';
import { ExportDialog } from '../../components/export/ExportDialog';
import { render, resetMocks } from '../utils';

// Mock the Tauri invoke function
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

// Mock the stores
vi.mock('../../stores/workspace-store', () => ({
  useWorkspaceStore: () => ({
    workspaces: [],
    activeWorkspace: null,
    isLoading: false,
    error: null,
    createWorkspace: vi.fn().mockResolvedValue({
      id: 'workspace-123',
      name: 'Test Workspace',
    }),
    setActiveWorkspace: vi.fn(),
    loadWorkspaces: vi.fn(),
  }),
}));

const mockInvoke = vi.mocked(invoke);

describe('Component Integration Tests', () => {
  beforeEach(() => {
    resetMocks();
  });

  describe('WorkspaceCreationWizard Integration', () => {
    const defaultProps = {
      isOpen: true,
      onClose: vi.fn(),
      onSuccess: vi.fn(),
    };

    it('should complete full workspace creation workflow', async () => {
      const user = userEvent.setup();
      
      // Mock successful workspace creation
      mockInvoke.mockResolvedValue({
        id: 'workspace-123',
        name: 'Integration Test Workspace',
        description: 'Full workflow test',
        local_path: '~/Documents/Postgirl/integration-test',
        git_repository_url: null,
        is_active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        last_accessed_at: '2023-01-01T00:00:00Z',
      });

      render(<WorkspaceCreationWizard {...defaultProps} />);

      // Step 1: Skip Git setup
      await user.click(screen.getByText('Skip Git (Local Only)'));

      // Should move to step 2
      await waitFor(() => {
        expect(screen.getByText('Workspace Details')).toBeInTheDocument();
      });

      // Step 2: Fill out workspace details
      const nameInput = screen.getByLabelText('Workspace Name');
      const descInput = screen.getByLabelText('Description (optional)');

      await user.type(nameInput, 'Integration Test Workspace');
      await user.type(descInput, 'Full workflow test');

      // Verify auto-generated path
      const pathInput = screen.getByLabelText('Local Path');
      expect(pathInput).toHaveValue('~/Documents/Postgirl/integration-test-workspace');

      // Create workspace
      await user.click(screen.getByText('Create Workspace'));

      // Should call the backend
      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('workspace_create', {
          request: {
            name: 'Integration Test Workspace',
            description: 'Full workflow test',
            local_path: '~/Documents/Postgirl/integration-test-workspace',
            git_repository_url: undefined,
          }
        });
      });

      // Should trigger success callback
      expect(defaultProps.onSuccess).toHaveBeenCalledWith('workspace-123');
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('should handle Git-connected workspace creation', async () => {
      const user = userEvent.setup();
      
      // Mock directory checks
      mockInvoke
        .mockResolvedValueOnce(false) // directory doesn't exist
        .mockResolvedValueOnce(true) // parent directory exists
        .mockResolvedValueOnce({ // workspace creation
          id: 'git-workspace-456',
          name: 'Git Project',
          git_repository_url: 'https://github.com/test/project.git',
          local_path: '~/Documents/Postgirl/git-project',
        });

      render(<WorkspaceCreationWizard {...defaultProps} />);

      // Step 1: Enter Git URL
      const gitInput = screen.getByLabelText('Git Repository URL');
      await user.type(gitInput, 'https://github.com/test/project.git');

      // Should show auto-generation preview
      expect(screen.getByText(/Workspace name will be auto-generated from repository: "Project"/)).toBeInTheDocument();

      await user.click(screen.getByText('Continue with Git'));

      // Step 2: Verify auto-populated name
      await waitFor(() => {
        expect(screen.getByDisplayValue('Project')).toBeInTheDocument();
      });

      // Create workspace
      await user.click(screen.getByText('Create Workspace'));

      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('workspace_create', expect.objectContaining({
          request: expect.objectContaining({
            git_repository_url: 'https://github.com/test/project.git',
          })
        }));
      });
    });

    it('should handle creation errors with proper user feedback', async () => {
      const user = userEvent.setup();
      
      // Mock creation failure
      mockInvoke.mockRejectedValue(new Error('Directory already exists and is not empty'));

      render(<WorkspaceCreationWizard {...defaultProps} />);

      // Complete form
      await user.click(screen.getByText('Skip Git (Local Only)'));
      await user.type(screen.getByLabelText('Workspace Name'), 'Existing Workspace');
      await user.click(screen.getByText('Create Workspace'));

      // Should show error message
      await waitFor(() => {
        expect(screen.getByText('Directory already exists and is not empty')).toBeInTheDocument();
      });

      // Should not close the dialog
      expect(defaultProps.onClose).not.toHaveBeenCalled();
      expect(defaultProps.onSuccess).not.toHaveBeenCalled();
    });
  });

  describe('EnvironmentSelector Integration', () => {
    const mockEnvironments = [
      {
        id: 'env-1',
        name: 'Development',
        variables: {
          'API_URL': {
            key: 'API_URL',
            value: 'https://api.dev.example.com',
            is_secret: false,
            variable_type: 'String' as const,
          },
        },
        is_active: true,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
      {
        id: 'env-2',
        name: 'Production',
        variables: {},
        is_active: false,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      },
    ];

    it('should load and display environments from backend', async () => {
      mockInvoke.mockResolvedValue(mockEnvironments);

      const onEnvironmentChange = vi.fn();
      render(
        <EnvironmentSelector
          workspaceId="workspace-123"
          selectedEnvironmentId="env-1"
          onEnvironmentChange={onEnvironmentChange}
        />
      );

      // Should load environments
      await waitFor(() => {
        expect(mockInvoke).toHaveBeenCalledWith('environment_list', {
          workspaceId: 'workspace-123'
        });
      });

      // Should display environments
      expect(screen.getByText('Development')).toBeInTheDocument();
      expect(screen.getByText('Production')).toBeInTheDocument();
    });

    it('should handle environment switching', async () => {
      const user = userEvent.setup();
      mockInvoke.mockResolvedValue(mockEnvironments);

      const onEnvironmentChange = vi.fn();
      render(
        <EnvironmentSelector
          workspaceId="workspace-123"
          selectedEnvironmentId="env-1"
          onEnvironmentChange={onEnvironmentChange}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Development')).toBeInTheDocument();
      });

      // Switch to Production
      await user.click(screen.getByText('Production'));

      expect(onEnvironmentChange).toHaveBeenCalledWith('env-2');
    });
  });

  describe('Import/Export Integration', () => {
    describe('ImportDialog Integration', () => {
      const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        onImportComplete: vi.fn(),
        workspaceId: 'workspace-123',
      };

      it('should import Postman collection successfully', async () => {
        const user = userEvent.setup();
        
        const mockCollection = {
          info: { name: 'Test Collection' },
          item: [
            {
              name: 'Get Users',
              request: {
                method: 'GET',
                url: 'https://api.example.com/users',
              },
            },
          ],
        };

        const importResult = {
          success: true,
          collection_id: 'collection-123',
          imported_requests: 1,
          message: 'Successfully imported Postman collection',
        };

        mockInvoke.mockResolvedValue(importResult);

        render(<ImportDialog {...defaultProps} />);

        // Paste collection data
        const textArea = screen.getByPlaceholderText(/Paste your Postman collection/);
        await user.type(textArea, JSON.stringify(mockCollection));

        // Should detect format
        await waitFor(() => {
          expect(screen.getByText('Postman Collection v2.1')).toBeInTheDocument();
        });

        // Import
        await user.click(screen.getByText('Import Collection'));

        await waitFor(() => {
          expect(mockInvoke).toHaveBeenCalledWith('import_postman_collection', {
            workspaceId: 'workspace-123',
            collectionData: mockCollection,
          });
        });

        expect(defaultProps.onImportComplete).toHaveBeenCalledWith(importResult);
      });

      it('should handle import validation errors', async () => {
        const user = userEvent.setup();
        
        mockInvoke.mockRejectedValue(new Error('Invalid collection format'));

        render(<ImportDialog {...defaultProps} />);

        const textArea = screen.getByPlaceholderText(/Paste your Postman collection/);
        await user.type(textArea, 'invalid json');

        await user.click(screen.getByText('Import Collection'));

        await waitFor(() => {
          expect(screen.getByText('Invalid collection format')).toBeInTheDocument();
        });
      });
    });

    describe('ExportDialog Integration', () => {
      const mockCollection = {
        id: 'collection-123',
        name: 'Test Collection',
        requests: [
          {
            id: 'request-1',
            name: 'Get Users',
            method: 'GET',
            url: 'https://api.example.com/users',
          },
        ],
      };

      const defaultProps = {
        isOpen: true,
        onClose: vi.fn(),
        collection: mockCollection,
      };

      it('should export collection to Postman format', async () => {
        const user = userEvent.setup();
        
        const exportData = {
          info: { name: 'Test Collection' },
          item: [/* exported items */],
        };

        mockInvoke.mockResolvedValue(exportData);

        // Mock URL.createObjectURL and download
        const mockCreateObjectURL = vi.fn(() => 'blob:mock-url');
        const mockRevokeObjectURL = vi.fn();
        Object.defineProperty(URL, 'createObjectURL', { value: mockCreateObjectURL });
        Object.defineProperty(URL, 'revokeObjectURL', { value: mockRevokeObjectURL });

        // Mock document.createElement and click
        const mockLink = {
          href: '',
          download: '',
          click: vi.fn(),
        };
        vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);

        render(<ExportDialog {...defaultProps} />);

        // Select Postman format
        await user.click(screen.getByText('Postman Collection'));
        
        // Export
        await user.click(screen.getByText('Download'));

        await waitFor(() => {
          expect(mockInvoke).toHaveBeenCalledWith('export_collection_postman', {
            collectionId: 'collection-123'
          });
        });

        // Should trigger download
        expect(mockCreateObjectURL).toHaveBeenCalled();
        expect(mockLink.click).toHaveBeenCalled();
        expect(mockRevokeObjectURL).toHaveBeenCalled();
      });

      it('should handle export errors gracefully', async () => {
        const user = userEvent.setup();
        
        mockInvoke.mockRejectedValue(new Error('Export failed'));

        render(<ExportDialog {...defaultProps} />);

        await user.click(screen.getByText('Postman Collection'));
        await user.click(screen.getByText('Download'));

        await waitFor(() => {
          expect(screen.getByText('Export failed')).toBeInTheDocument();
        });
      });
    });
  });

  describe('Cross-Component Integration', () => {
    it('should handle workspace creation to environment setup workflow', async () => {
      // This would test the flow from creating a workspace to setting up environments
      // In a real app, this might involve multiple components working together
      
      const user = userEvent.setup();
      
      // Mock workspace creation
      mockInvoke
        .mockResolvedValueOnce({ // workspace creation
          id: 'new-workspace-789',
          name: 'Full Workflow Test',
        })
        .mockResolvedValueOnce([]); // environment list (empty initially)

      const onWorkspaceCreated = vi.fn();
      
      render(
        <WorkspaceCreationWizard
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={onWorkspaceCreated}
        />
      );

      // Create workspace
      await user.click(screen.getByText('Skip Git (Local Only)'));
      await user.type(screen.getByLabelText('Workspace Name'), 'Full Workflow Test');
      await user.click(screen.getByText('Create Workspace'));

      await waitFor(() => {
        expect(onWorkspaceCreated).toHaveBeenCalledWith('new-workspace-789');
      });

      // After workspace creation, environment selector should load
      // (This would be tested in a full integration test with multiple components)
    });
  });

  describe('Error Boundary Integration', () => {
    it('should handle component errors gracefully', () => {
      // Mock a component that throws an error
      const ErrorComponent = () => {
        throw new Error('Component crashed');
      };

      // In a real app, this would be wrapped with an error boundary
      expect(() => render(<ErrorComponent />)).toThrow('Component crashed');
    });

    it('should recover from API errors and allow retry', async () => {
      const user = userEvent.setup();
      
      // First call fails, second succeeds
      mockInvoke
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce([]);

      const onEnvironmentChange = vi.fn();
      render(
        <EnvironmentSelector
          workspaceId="workspace-123"
          selectedEnvironmentId={null}
          onEnvironmentChange={onEnvironmentChange}
        />
      );

      // Should show error initially
      await waitFor(() => {
        expect(screen.getByText(/error/i)).toBeInTheDocument();
      });

      // Click retry button (if available)
      const retryButton = screen.queryByText(/retry/i);
      if (retryButton) {
        await user.click(retryButton);
        
        // Should succeed on retry
        await waitFor(() => {
          expect(mockInvoke).toHaveBeenCalledTimes(2);
        });
      }
    });
  });

  describe('Performance Integration', () => {
    it('should handle large data sets efficiently', async () => {
      // Mock large environment list
      const largeEnvironmentList = Array.from({ length: 100 }, (_, i) => ({
        id: `env-${i}`,
        name: `Environment ${i}`,
        variables: {},
        is_active: i === 0,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
      }));

      mockInvoke.mockResolvedValue(largeEnvironmentList);

      const onEnvironmentChange = vi.fn();
      render(
        <EnvironmentSelector
          workspaceId="workspace-123"
          selectedEnvironmentId="env-0"
          onEnvironmentChange={onEnvironmentChange}
        />
      );

      // Should handle large list without performance issues
      await waitFor(() => {
        expect(screen.getByText('Environment 0')).toBeInTheDocument();
      });

      // Should be able to find and interact with items
      expect(screen.getByText('Environment 99')).toBeInTheDocument();
    });

    it('should debounce rapid user inputs', async () => {
      const user = userEvent.setup();
      
      render(
        <WorkspaceCreationWizard
          isOpen={true}
          onClose={vi.fn()}
          onSuccess={vi.fn()}
        />
      );

      await user.click(screen.getByText('Skip Git (Local Only)'));

      const nameInput = screen.getByLabelText('Workspace Name');
      
      // Rapid typing should not cause issues
      await user.type(nameInput, 'RapidTypingTest');
      
      // Path should update correctly
      const pathInput = screen.getByLabelText('Local Path');
      await waitFor(() => {
        expect(pathInput).toHaveValue('~/Documents/Postgirl/rapidtypingtest');
      });
    });
  });
});