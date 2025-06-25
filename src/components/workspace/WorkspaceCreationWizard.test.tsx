import { describe, it, expect, beforeEach, vi } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WorkspaceCreationWizard } from './WorkspaceCreationWizard';
import {
  render,
  mockWorkspaceStore,
  mockSuccessfulWorkspaceCreation,
  mockFailedWorkspaceCreation,
  resetMocks,
  generateValidGitUrls,
  generateInvalidGitUrls,
} from '../../test/utils';

// Mock the workspace store
vi.mock('../../stores/workspace-store', () => ({
  useWorkspaceStore: () => mockWorkspaceStore,
}));

describe('WorkspaceCreationWizard', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    resetMocks();
  });

  describe('Initial Render', () => {
    it('renders the wizard when open', () => {
      render(<WorkspaceCreationWizard {...defaultProps} />);
      
      expect(screen.getByText('Create New Workspace')).toBeInTheDocument();
      expect(screen.getByText('Connect Git Repository')).toBeInTheDocument();
      expect(screen.getByText('Git Repository URL')).toBeInTheDocument();
    });

    it('does not render when closed', () => {
      render(<WorkspaceCreationWizard {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByText('Create New Workspace')).not.toBeInTheDocument();
    });

    it('shows git-first approach in step 1', () => {
      render(<WorkspaceCreationWizard {...defaultProps} />);
      
      expect(screen.getByText('Connect Git Repository')).toBeInTheDocument();
      expect(screen.getByText('Link your workspace to a Git repository for team collaboration')).toBeInTheDocument();
      expect(screen.getByText('Git-First Workflow')).toBeInTheDocument();
    });

    it('shows progress indicators', () => {
      render(<WorkspaceCreationWizard {...defaultProps} />);
      
      const stepIndicators = screen.getAllByText(/^[12]$/);
      expect(stepIndicators).toHaveLength(2);
      
      // Step 1 should be active (primary color)
      expect(stepIndicators[0]).toHaveClass('bg-primary-500');
      // Step 2 should be inactive
      expect(stepIndicators[1]).not.toHaveClass('bg-primary-500');
    });
  });

  describe('Step 1: Git Repository', () => {
    it('allows entering git repository URL', async () => {
      const user = userEvent.setup();
      render(<WorkspaceCreationWizard {...defaultProps} />);
      
      const gitInput = screen.getByLabelText('Git Repository URL');
      await user.type(gitInput, 'https://github.com/test/repo.git');
      
      expect(gitInput).toHaveValue('https://github.com/test/repo.git');
    });

    it('validates git URL format', async () => {
      const user = userEvent.setup();
      render(<WorkspaceCreationWizard {...defaultProps} />);
      
      const gitInput = screen.getByLabelText('Git Repository URL');
      const continueButton = screen.getByText('Continue with Git');
      
      // Enter invalid URL
      await user.type(gitInput, 'invalid-url');
      await user.click(continueButton);
      
      expect(screen.getByText('Please enter a valid Git repository URL')).toBeInTheDocument();
    });

    it('accepts valid HTTPS git URLs', async () => {
      const user = userEvent.setup();
      render(<WorkspaceCreationWizard {...defaultProps} />);
      
      const gitInput = screen.getByLabelText('Git Repository URL');
      const continueButton = screen.getByText('Continue with Git');
      
      for (const url of generateValidGitUrls().filter(u => u.startsWith('https'))) {
        await user.clear(gitInput);
        await user.type(gitInput, url);
        await user.click(continueButton);
        
        // Should move to step 2 without error
        await waitFor(() => {
          expect(screen.getByText('Workspace Details')).toBeInTheDocument();
        });
        
        // Go back to test next URL
        await user.click(screen.getByText('Back'));
      }
    });

    it('accepts valid SSH git URLs', async () => {
      const user = userEvent.setup();
      render(<WorkspaceCreationWizard {...defaultProps} />);
      
      const gitInput = screen.getByLabelText('Git Repository URL');
      const continueButton = screen.getByText('Continue with Git');
      
      for (const url of generateValidGitUrls().filter(u => u.startsWith('git@'))) {
        await user.clear(gitInput);
        await user.type(gitInput, url);
        await user.click(continueButton);
        
        // Should move to step 2 without error
        await waitFor(() => {
          expect(screen.getByText('Workspace Details')).toBeInTheDocument();
        });
        
        // Go back to test next URL
        await user.click(screen.getByText('Back'));
      }
    });

    it('rejects invalid git URLs', async () => {
      const user = userEvent.setup();
      render(<WorkspaceCreationWizard {...defaultProps} />);
      
      const gitInput = screen.getByLabelText('Git Repository URL');
      const continueButton = screen.getByText('Continue with Git');
      
      for (const url of generateInvalidGitUrls()) {
        await user.clear(gitInput);
        if (url) await user.type(gitInput, url);
        await user.click(continueButton);
        
        if (url) {
          expect(screen.getByText('Please enter a valid Git repository URL')).toBeInTheDocument();
        }
        // Should stay on step 1
        expect(screen.getByText('Connect Git Repository')).toBeInTheDocument();
      }
    });

    it('allows skipping git setup', async () => {
      const user = userEvent.setup();
      render(<WorkspaceCreationWizard {...defaultProps} />);
      
      const skipButton = screen.getByText('Skip Git (Local Only)');
      await user.click(skipButton);
      
      // Should move to step 2
      await waitFor(() => {
        expect(screen.getByText('Workspace Details')).toBeInTheDocument();
      });
    });

    it('shows cancel button', async () => {
      const user = userEvent.setup();
      render(<WorkspaceCreationWizard {...defaultProps} />);
      
      const cancelButton = screen.getByText('Cancel');
      await user.click(cancelButton);
      
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  describe('Step 2: Workspace Details', () => {
    beforeEach(async () => {
      // Navigate to step 2
      const user = userEvent.setup();
      render(<WorkspaceCreationWizard {...defaultProps} />);
      await user.click(screen.getByText('Skip Git (Local Only)'));
    });

    it('shows workspace details form', () => {
      expect(screen.getByText('Workspace Details')).toBeInTheDocument();
      expect(screen.getByLabelText('Workspace Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Description (optional)')).toBeInTheDocument();
      expect(screen.getByLabelText('Local Path')).toBeInTheDocument();
    });

    it('auto-generates local path from workspace name', async () => {
      const user = userEvent.setup();
      
      const nameInput = screen.getByLabelText('Workspace Name');
      const pathInput = screen.getByLabelText('Local Path');
      
      await user.type(nameInput, 'My API Project');
      
      expect(pathInput).toHaveValue('~/Documents/Postgirl/my-api-project');
    });

    it('handles special characters in workspace name', async () => {
      const user = userEvent.setup();
      
      const nameInput = screen.getByLabelText('Workspace Name');
      const pathInput = screen.getByLabelText('Local Path');
      
      await user.type(nameInput, 'E-commerce Backend (v2.0)!');
      
      expect(pathInput).toHaveValue('~/Documents/Postgirl/e-commerce-backend-v2-0');
    });

    it('validates required fields', async () => {
      const user = userEvent.setup();
      
      const createButton = screen.getByText('Create Workspace');
      await user.click(createButton);
      
      expect(screen.getByText('Workspace name is required')).toBeInTheDocument();
      expect(screen.getByText('Local path is required')).toBeInTheDocument();
    });

    it('validates minimum name length', async () => {
      const user = userEvent.setup();
      
      const nameInput = screen.getByLabelText('Workspace Name');
      const createButton = screen.getByText('Create Workspace');
      
      await user.type(nameInput, 'A');
      await user.click(createButton);
      
      expect(screen.getByText('Workspace name must be at least 2 characters')).toBeInTheDocument();
    });

    it('shows summary of workspace configuration', async () => {
      const user = userEvent.setup();
      
      const nameInput = screen.getByLabelText('Workspace Name');
      const descInput = screen.getByLabelText('Description (optional)');
      
      await user.type(nameInput, 'Test Workspace');
      await user.type(descInput, 'Test Description');
      
      expect(screen.getByText('Summary')).toBeInTheDocument();
      expect(screen.getByText('Local-Only Workspace')).toBeInTheDocument();
      expect(screen.getByText('Test Workspace')).toBeInTheDocument();
      expect(screen.getByText('Test Description')).toBeInTheDocument();
    });

    it('allows going back to step 1', async () => {
      const user = userEvent.setup();
      
      const backButton = screen.getByText('Back');
      await user.click(backButton);
      
      expect(screen.getByText('Connect Git Repository')).toBeInTheDocument();
    });
  });

  describe('Git-Connected Workflow', () => {
    beforeEach(async () => {
      // Navigate through with git URL
      const user = userEvent.setup();
      render(<WorkspaceCreationWizard {...defaultProps} />);
      
      const gitInput = screen.getByLabelText('Git Repository URL');
      await user.type(gitInput, 'https://github.com/test/repo.git');
      await user.click(screen.getByText('Continue with Git'));
    });

    it('shows git-connected workspace type in summary', async () => {
      const user = userEvent.setup();
      
      const nameInput = screen.getByLabelText('Workspace Name');
      await user.type(nameInput, 'Test Workspace');
      
      expect(screen.getByText('Git-Connected Workspace')).toBeInTheDocument();
      expect(screen.getByText('https://github.com/test/repo.git')).toBeInTheDocument();
    });
  });

  describe('Auto-Generated Workspace Names', () => {
    it('shows preview of auto-generated name in step 1', async () => {
      const user = userEvent.setup();
      render(<WorkspaceCreationWizard {...defaultProps} />);
      
      const gitInput = screen.getByLabelText('Git Repository URL');
      await user.type(gitInput, 'git@github.com:user/my-awesome-project.git');
      
      expect(screen.getByText(/Workspace name will be auto-generated from repository: "My Awesome Project"/)).toBeInTheDocument();
    });

    it('auto-populates workspace name from HTTPS Git URL', async () => {
      const user = userEvent.setup();
      render(<WorkspaceCreationWizard {...defaultProps} />);
      
      const gitInput = screen.getByLabelText('Git Repository URL');
      await user.type(gitInput, 'https://github.com/company/api-backend-service.git');
      await user.click(screen.getByText('Continue with Git'));
      
      const nameInput = screen.getByLabelText('Workspace Name');
      expect(nameInput).toHaveValue('Api Backend Service');
    });

    it('auto-populates workspace name from SSH Git URL', async () => {
      const user = userEvent.setup();
      render(<WorkspaceCreationWizard {...defaultProps} />);
      
      const gitInput = screen.getByLabelText('Git Repository URL');
      await user.type(gitInput, 'git@gitlab.com:team/frontend_dashboard.git');
      await user.click(screen.getByText('Continue with Git'));
      
      const nameInput = screen.getByLabelText('Workspace Name');
      expect(nameInput).toHaveValue('Frontend Dashboard');
    });

    it('handles complex repository names', async () => {
      const user = userEvent.setup();
      render(<WorkspaceCreationWizard {...defaultProps} />);
      
      const testCases = [
        {
          url: 'git@github.com:user/e-commerce-backend.git',
          expected: 'E Commerce Backend',
        },
        {
          url: 'https://github.com/org/user_management_api.git',
          expected: 'User Management Api',
        },
        {
          url: 'git@bitbucket.org:team/payment-gateway-v2.git',
          expected: 'Payment Gateway V2',
        },
      ];

      for (const { url, expected } of testCases) {
        // Reset form
        await user.click(screen.getByText('Cancel'));
        render(<WorkspaceCreationWizard {...defaultProps} />);
        
        const gitInput = screen.getByLabelText('Git Repository URL');
        await user.type(gitInput, url);
        await user.click(screen.getByText('Continue with Git'));
        
        const nameInput = screen.getByLabelText('Workspace Name');
        expect(nameInput).toHaveValue(expected);
      }
    });

    it('allows manual override of auto-generated name', async () => {
      const user = userEvent.setup();
      render(<WorkspaceCreationWizard {...defaultProps} />);
      
      const gitInput = screen.getByLabelText('Git Repository URL');
      await user.type(gitInput, 'git@github.com:user/auto-generated-name.git');
      await user.click(screen.getByText('Continue with Git'));
      
      const nameInput = screen.getByLabelText('Workspace Name');
      expect(nameInput).toHaveValue('Auto Generated Name');
      
      // User can override the auto-generated name
      await user.clear(nameInput);
      await user.type(nameInput, 'My Custom Name');
      
      expect(nameInput).toHaveValue('My Custom Name');
    });

    it('does not override manually entered names', async () => {
      const user = userEvent.setup();
      render(<WorkspaceCreationWizard {...defaultProps} />);
      
      // First enter a Git URL to go to step 2
      const gitInput = screen.getByLabelText('Git Repository URL');
      await user.type(gitInput, 'git@github.com:user/first-repo.git');
      await user.click(screen.getByText('Continue with Git'));
      
      // Manually enter a name
      const nameInput = screen.getByLabelText('Workspace Name');
      await user.clear(nameInput);
      await user.type(nameInput, 'My Manual Name');
      
      // Go back and change the Git URL
      await user.click(screen.getByText('Back'));
      await user.clear(gitInput);
      await user.type(gitInput, 'git@github.com:user/different-repo.git');
      await user.click(screen.getByText('Continue with Git'));
      
      // Should keep the manually entered name
      expect(nameInput).toHaveValue('My Manual Name');
    });

    it('auto-generates local path from auto-generated name', async () => {
      const user = userEvent.setup();
      render(<WorkspaceCreationWizard {...defaultProps} />);
      
      const gitInput = screen.getByLabelText('Git Repository URL');
      await user.type(gitInput, 'git@github.com:user/complex-project-name.git');
      await user.click(screen.getByText('Continue with Git'));
      
      const pathInput = screen.getByLabelText('Local Path');
      expect(pathInput).toHaveValue('~/Documents/Postgirl/complex-project-name');
    });

    it('handles invalid Git URLs gracefully', async () => {
      const user = userEvent.setup();
      render(<WorkspaceCreationWizard {...defaultProps} />);
      
      const gitInput = screen.getByLabelText('Git Repository URL');
      await user.type(gitInput, 'not-a-valid-git-url');
      
      // Should not show auto-generation preview for invalid URLs
      expect(screen.queryByText(/Workspace name will be auto-generated/)).not.toBeInTheDocument();
      
      // Try to continue (will fail validation)
      await user.click(screen.getByText('Continue with Git'));
      expect(screen.getByText('Please enter a valid Git repository URL')).toBeInTheDocument();
    });

    it('works with real-world repository examples', async () => {
      const user = userEvent.setup();
      
      const realWorldExamples = [
        {
          url: 'git@github.com:xbklairith/postgirl-workspace.git',
          expectedName: 'Postgirl Workspace',
        },
        {
          url: 'https://github.com/facebook/react.git',
          expectedName: 'React',
        },
        {
          url: 'git@gitlab.com:gitlab-org/gitlab.git',
          expectedName: 'Gitlab',
        },
      ];

      for (const { url, expectedName } of realWorldExamples) {
        render(<WorkspaceCreationWizard {...defaultProps} />);
        
        const gitInput = screen.getByLabelText('Git Repository URL');
        await user.type(gitInput, url);
        await user.click(screen.getByText('Continue with Git'));
        
        const nameInput = screen.getByLabelText('Workspace Name');
        expect(nameInput).toHaveValue(expectedName);
        
        // Reset for next test
        await user.click(screen.getByText('Cancel'));
      }
    });
  });

  describe('Workspace Creation', () => {
    beforeEach(async () => {
      // Fill out complete form
      const user = userEvent.setup();
      render(<WorkspaceCreationWizard {...defaultProps} />);
      
      // Step 1: Skip git
      await user.click(screen.getByText('Skip Git (Local Only)'));
      
      // Step 2: Fill details
      const nameInput = screen.getByLabelText('Workspace Name');
      const descInput = screen.getByLabelText('Description (optional)');
      
      await user.type(nameInput, 'Test Workspace');
      await user.type(descInput, 'Test Description');
    });

    it('creates workspace successfully', async () => {
      const user = userEvent.setup();
      mockSuccessfulWorkspaceCreation();
      
      const createButton = screen.getByText('Create Workspace');
      await user.click(createButton);
      
      await waitFor(() => {
        expect(mockWorkspaceStore.createWorkspace).toHaveBeenCalledWith({
          name: 'Test Workspace',
          description: 'Test Description',
          local_path: '~/Documents/Postgirl/test-workspace',
          git_repository_url: undefined,
        });
      });
      
      expect(defaultProps.onSuccess).toHaveBeenCalledWith('test-workspace-123');
      expect(defaultProps.onClose).toHaveBeenCalled();
    });

    it('shows loading state during creation', async () => {
      const user = userEvent.setup();
      mockWorkspaceStore.isLoading = true;
      
      render(<WorkspaceCreationWizard {...defaultProps} />);
      await user.click(screen.getByText('Skip Git (Local Only)'));
      
      const createButton = screen.getByText('Create Workspace');
      expect(createButton).toBeDisabled();
    });

    it('handles creation errors', async () => {
      const user = userEvent.setup();
      mockFailedWorkspaceCreation('Network error');
      mockWorkspaceStore.error = 'Network error';
      
      render(<WorkspaceCreationWizard {...defaultProps} />);
      
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });

    it('creates git-connected workspace', async () => {
      const user = userEvent.setup();
      render(<WorkspaceCreationWizard {...defaultProps} />);
      
      // Step 1: Add git URL
      const gitInput = screen.getByLabelText('Git Repository URL');
      await user.type(gitInput, 'git@github.com:test/repo.git');
      await user.click(screen.getByText('Continue with Git'));
      
      // Step 2: Add details
      const nameInput = screen.getByLabelText('Workspace Name');
      await user.type(nameInput, 'Git Workspace');
      
      mockSuccessfulWorkspaceCreation();
      
      const createButton = screen.getByText('Create Workspace');
      await user.click(createButton);
      
      await waitFor(() => {
        expect(mockWorkspaceStore.createWorkspace).toHaveBeenCalledWith({
          name: 'Git Workspace',
          description: undefined,
          local_path: '~/Documents/Postgirl/git-workspace',
          git_repository_url: 'git@github.com:test/repo.git',
        });
      });
    });
  });

  describe('Form Reset', () => {
    it('resets form when closed', async () => {
      const user = userEvent.setup();
      render(<WorkspaceCreationWizard {...defaultProps} />);
      
      // Fill form
      const gitInput = screen.getByLabelText('Git Repository URL');
      await user.type(gitInput, 'https://github.com/test/repo.git');
      
      // Close and reopen
      await user.click(screen.getByText('Cancel'));
      
      render(<WorkspaceCreationWizard {...defaultProps} />);
      
      // Form should be reset
      expect(screen.getByLabelText('Git Repository URL')).toHaveValue('');
      expect(screen.getByText('Connect Git Repository')).toBeInTheDocument(); // Back to step 1
    });
  });

  describe('Accessibility', () => {
    it('has proper form labels', () => {
      render(<WorkspaceCreationWizard {...defaultProps} />);
      
      expect(screen.getByLabelText('Git Repository URL')).toBeInTheDocument();
    });

    it('shows error messages with proper association', async () => {
      const user = userEvent.setup();
      render(<WorkspaceCreationWizard {...defaultProps} />);
      
      const gitInput = screen.getByLabelText('Git Repository URL');
      await user.type(gitInput, 'invalid');
      await user.click(screen.getByText('Continue with Git'));
      
      const errorMessage = screen.getByText('Please enter a valid Git repository URL');
      expect(errorMessage).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<WorkspaceCreationWizard {...defaultProps} />);
      
      // Tab through form elements
      await user.tab();
      expect(screen.getByLabelText('Git Repository URL')).toHaveFocus();
      
      await user.tab();
      expect(screen.getByText('Cancel')).toHaveFocus();
    });
  });
});