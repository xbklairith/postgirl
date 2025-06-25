import { describe, it, expect } from 'vitest';

// Extract the functions for isolated testing
const extractRepoNameFromGitUrl = (gitUrl: string): string => {
  if (!gitUrl) return '';
  
  try {
    // Handle SSH format: git@github.com:user/repo.git
    if (gitUrl.startsWith('git@')) {
      const sshMatch = gitUrl.match(/git@[^:]+:(.+)\.git$/);
      if (sshMatch) {
        const fullPath = sshMatch[1];
        const parts = fullPath.split('/');
        return parts[parts.length - 1]; // Get the last part (repo name)
      }
    }
    
    // Handle HTTPS format: https://github.com/user/repo.git
    if (gitUrl.startsWith('http')) {
      const url = new URL(gitUrl);
      const pathParts = url.pathname.split('/').filter(part => part);
      if (pathParts.length > 0) {
        const lastPart = pathParts[pathParts.length - 1];
        // Remove .git extension if present
        return lastPart.replace(/\.git$/, '');
      }
    }
  } catch (error) {
    // If parsing fails, return empty string
    console.warn('Could not extract repo name from Git URL:', gitUrl);
  }
  
  return '';
};

const generateWorkspaceNameFromGit = (gitUrl: string): string => {
  const repoName = extractRepoNameFromGitUrl(gitUrl);
  if (!repoName) return '';
  
  // Convert to human-readable format
  return repoName
    .replace(/[-_]/g, ' ') // Replace dashes and underscores with spaces
    .replace(/\b\w/g, l => l.toUpperCase()); // Capitalize first letter of each word
};

describe('Git Repository Name Extraction', () => {
  describe('extractRepoNameFromGitUrl', () => {
    describe('SSH URLs', () => {
      const sshTestCases = [
        {
          url: 'git@github.com:user/repo.git',
          expected: 'repo',
        },
        {
          url: 'git@gitlab.com:username/my-project.git',
          expected: 'my-project',
        },
        {
          url: 'git@bitbucket.org:team/api-service.git',
          expected: 'api-service',
        },
        {
          url: 'git@github.com:organization/nested/deep-repo.git',
          expected: 'deep-repo',
        },
        {
          url: 'git@example.com:user/repo_with_underscores.git',
          expected: 'repo_with_underscores',
        },
        {
          url: 'git@git.company.com:group/subgroup/project.git',
          expected: 'project',
        },
      ];

      it.each(sshTestCases)('should extract repo name from SSH URL: $url', ({ url, expected }) => {
        expect(extractRepoNameFromGitUrl(url)).toBe(expected);
      });
    });

    describe('HTTPS URLs', () => {
      const httpsTestCases = [
        {
          url: 'https://github.com/user/repo.git',
          expected: 'repo',
        },
        {
          url: 'https://gitlab.com/username/my-project.git',
          expected: 'my-project',
        },
        {
          url: 'https://bitbucket.org/team/api-service.git',
          expected: 'api-service',
        },
        {
          url: 'https://github.com/organization/nested-repo.git',
          expected: 'nested-repo',
        },
        {
          url: 'https://git.example.com/user/repo_with_underscores.git',
          expected: 'repo_with_underscores',
        },
        {
          url: 'https://dev.azure.com/org/project/_git/repo-name.git',
          expected: 'repo-name',
        },
        {
          url: 'http://localhost:8080/user/local-repo.git',
          expected: 'local-repo',
        },
      ];

      it.each(httpsTestCases)('should extract repo name from HTTPS URL: $url', ({ url, expected }) => {
        expect(extractRepoNameFromGitUrl(url)).toBe(expected);
      });
    });

    describe('Edge Cases', () => {
      it('should return empty string for empty input', () => {
        expect(extractRepoNameFromGitUrl('')).toBe('');
      });

      it('should return empty string for invalid URLs', () => {
        expect(extractRepoNameFromGitUrl('not-a-url')).toBe('');
        expect(extractRepoNameFromGitUrl('https://github.com')).toBe('');
        expect(extractRepoNameFromGitUrl('git@github.com')).toBe('');
      });

      it('should handle URLs without .git extension', () => {
        expect(extractRepoNameFromGitUrl('https://github.com/user/repo')).toBe('repo');
      });

      it('should handle deeply nested paths', () => {
        expect(extractRepoNameFromGitUrl('https://gitlab.com/group/subgroup/project/repo.git')).toBe('repo');
        expect(extractRepoNameFromGitUrl('git@gitlab.com:group/subgroup/project/repo.git')).toBe('repo');
      });

      it('should handle special characters in repo names', () => {
        expect(extractRepoNameFromGitUrl('git@github.com:user/repo-with-dashes.git')).toBe('repo-with-dashes');
        expect(extractRepoNameFromGitUrl('https://github.com/user/repo_with_underscores.git')).toBe('repo_with_underscores');
        expect(extractRepoNameFromGitUrl('git@github.com:user/repo.with.dots.git')).toBe('repo.with.dots');
      });
    });
  });

  describe('generateWorkspaceNameFromGit', () => {
    describe('Name Formatting', () => {
      const formatTestCases = [
        {
          url: 'git@github.com:user/simple-repo.git',
          expected: 'Simple Repo',
        },
        {
          url: 'https://github.com/user/my_awesome_project.git',
          expected: 'My Awesome Project',
        },
        {
          url: 'git@gitlab.com:team/api-service-backend.git',
          expected: 'Api Service Backend',
        },
        {
          url: 'https://github.com/org/e-commerce-frontend.git',
          expected: 'E Commerce Frontend',
        },
        {
          url: 'git@github.com:user/user_management_api.git',
          expected: 'User Management Api',
        },
        {
          url: 'https://bitbucket.org/team/payment-gateway-service.git',
          expected: 'Payment Gateway Service',
        },
        {
          url: 'git@github.com:org/cms-backend-v2.git',
          expected: 'Cms Backend V2',
        },
        {
          url: 'https://github.com/user/single.git',
          expected: 'Single',
        },
      ];

      it.each(formatTestCases)('should format workspace name from $url', ({ url, expected }) => {
        expect(generateWorkspaceNameFromGit(url)).toBe(expected);
      });
    });

    describe('Edge Cases', () => {
      it('should return empty string for empty input', () => {
        expect(generateWorkspaceNameFromGit('')).toBe('');
      });

      it('should return empty string for invalid URLs', () => {
        expect(generateWorkspaceNameFromGit('not-a-url')).toBe('');
        expect(generateWorkspaceNameFromGit('https://github.com')).toBe('');
      });

      it('should handle repo names with mixed separators', () => {
        expect(generateWorkspaceNameFromGit('git@github.com:user/mixed-name_format.git')).toBe('Mixed Name Format');
      });

      it('should handle single character repo names', () => {
        expect(generateWorkspaceNameFromGit('https://github.com/user/a.git')).toBe('A');
      });

      it('should handle repo names with numbers', () => {
        expect(generateWorkspaceNameFromGit('git@github.com:user/api-v2.git')).toBe('Api V2');
        expect(generateWorkspaceNameFromGit('https://github.com/user/project123.git')).toBe('Project123');
      });

      it('should handle consecutive separators', () => {
        expect(generateWorkspaceNameFromGit('git@github.com:user/repo--with--dashes.git')).toBe('Repo With Dashes');
        expect(generateWorkspaceNameFromGit('https://github.com/user/repo__with__underscores.git')).toBe('Repo With Underscores');
      });
    });

    describe('Real-world Examples', () => {
      const realWorldCases = [
        {
          url: 'git@github.com:facebook/react.git',
          expected: 'React',
        },
        {
          url: 'https://github.com/microsoft/typescript.git',
          expected: 'Typescript',
        },
        {
          url: 'git@github.com:vercel/next.js.git',
          expected: 'Next.js',
        },
        {
          url: 'https://github.com/tailwindlabs/tailwindcss.git',
          expected: 'Tailwindcss',
        },
        {
          url: 'git@github.com:prisma/prisma.git',
          expected: 'Prisma',
        },
        {
          url: 'https://github.com/nestjs/nest.git',
          expected: 'Nest',
        },
        {
          url: 'git@gitlab.com:gitlab-org/gitlab.git',
          expected: 'Gitlab',
        },
        {
          url: 'https://github.com/elastic/elasticsearch.git',
          expected: 'Elasticsearch',
        },
      ];

      it.each(realWorldCases)('should format real-world repo: $url', ({ url, expected }) => {
        expect(generateWorkspaceNameFromGit(url)).toBe(expected);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should work end-to-end for common Git URLs', () => {
      const testCases = [
        {
          input: 'git@github.com:xbklairith/postgirl-workspace.git',
          expectedName: 'Postgirl Workspace',
        },
        {
          input: 'https://github.com/company/api-backend-service.git',
          expectedName: 'Api Backend Service',
        },
        {
          input: 'git@gitlab.com:team/frontend_dashboard.git',
          expectedName: 'Frontend Dashboard',
        },
      ];

      testCases.forEach(({ input, expectedName }) => {
        const repoName = extractRepoNameFromGitUrl(input);
        const workspaceName = generateWorkspaceNameFromGit(input);
        
        expect(repoName).toBeTruthy();
        expect(workspaceName).toBe(expectedName);
      });
    });
  });
});