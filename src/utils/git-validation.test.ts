import { describe, it, expect } from 'vitest';

// Extract the validation function for isolated testing
const isValidGitUrl = (url: string) => {
  if (!url.trim()) return false;
  
  // Check for SSH format: git@hostname:username/repo.git
  const sshPattern = /^git@[a-zA-Z0-9.-]+:[a-zA-Z0-9._/-]+\.git$/;
  if (sshPattern.test(url)) {
    return true;
  }
  
  // Check for HTTPS/HTTP format
  try {
    const urlObj = new URL(url);
    return (urlObj.protocol === 'https:' || urlObj.protocol === 'http:') && 
           urlObj.pathname.endsWith('.git');
  } catch {
    return false;
  }
};

describe('Git URL Validation', () => {
  describe('Valid SSH URLs', () => {
    const validSshUrls = [
      'git@github.com:user/repo.git',
      'git@gitlab.com:user/project.git',
      'git@bitbucket.org:team/repository.git',
      'git@example.com:namespace/project.git',
      'git@server.company.com:dev/api-service.git',
      'git@192.168.1.10:user/repo.git',
      'git@git.example.org:user_name/repo-name.git',
      'git@github.com:org/repo_with_underscores.git',
      'git@gitlab.example.com:group/subgroup/project.git',
    ];

    it.each(validSshUrls)('should accept valid SSH URL: %s', (url) => {
      expect(isValidGitUrl(url)).toBe(true);
    });
  });

  describe('Valid HTTPS URLs', () => {
    const validHttpsUrls = [
      'https://github.com/user/repo.git',
      'https://gitlab.com/user/project.git',
      'https://bitbucket.org/team/repository.git',
      'https://git.example.com/user/repo.git',
      'https://code.company.com/dev/api-service.git',
      'http://git.local.dev/user/repo.git',
      'https://github.com/org/repo-with-dashes.git',
      'https://gitlab.example.com/group/subgroup/project.git',
    ];

    it.each(validHttpsUrls)('should accept valid HTTPS URL: %s', (url) => {
      expect(isValidGitUrl(url)).toBe(true);
    });
  });

  describe('Invalid URLs', () => {
    const invalidUrls = [
      // Empty/whitespace
      '',
      '   ',
      '\t\n',
      
      // Not git URLs
      'https://example.com',
      'https://github.com/user/repo', // missing .git
      'ftp://github.com/user/repo.git',
      'ssh://git@github.com/user/repo.git',
      
      // Malformed SSH
      'git@github.com',
      'git@github.com:',
      'git@:user/repo.git',
      'git@github.com/user/repo.git', // should use : not /
      'git@github.com:user/repo', // missing .git
      'git@github.com:user/.git', // empty repo name
      'git@:user/repo.git', // empty hostname
      
      // Malformed HTTPS
      'https://',
      'https://github.com/',
      'https://github.com/.git',
      'https://github.com/user/.git',
      'https://github.com/.git/repo',
      
      // Invalid protocols
      'git://github.com/user/repo.git',
      'file:///path/to/repo.git',
      'rsync://server/repo.git',
      
      // Other invalid formats
      'not-a-url',
      'user@server:repo.git', // missing git@ prefix
      'git@github.com:user repo.git', // space in path
      'git@github.com:user/repo.txt', // wrong extension
      'https://github.com/user/repo.zip',
      'git@github.com:user/repo.git.backup',
    ];

    it.each(invalidUrls)('should reject invalid URL: %s', (url) => {
      expect(isValidGitUrl(url)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle URLs with special characters in SSH format', () => {
      expect(isValidGitUrl('git@github.com:user-name/repo_name.git')).toBe(true);
      expect(isValidGitUrl('git@github.com:user.name/repo-name.git')).toBe(true);
      expect(isValidGitUrl('git@github.com:123user/456repo.git')).toBe(true);
    });

    it('should handle URLs with ports in HTTPS format', () => {
      expect(isValidGitUrl('https://git.example.com:8080/user/repo.git')).toBe(true);
      expect(isValidGitUrl('http://localhost:3000/user/repo.git')).toBe(true);
    });

    it('should handle deeply nested paths in HTTPS format', () => {
      expect(isValidGitUrl('https://gitlab.com/group/subgroup/project/repo.git')).toBe(true);
      expect(isValidGitUrl('https://git.company.com/team/product/service/api.git')).toBe(true);
    });

    it('should be case sensitive for protocols', () => {
      expect(isValidGitUrl('HTTPS://github.com/user/repo.git')).toBe(false);
      expect(isValidGitUrl('Git@github.com:user/repo.git')).toBe(false);
    });

    it('should handle international domain names', () => {
      expect(isValidGitUrl('git@xn--bcher-kva.example:user/repo.git')).toBe(true);
      expect(isValidGitUrl('https://xn--bcher-kva.example.com/user/repo.git')).toBe(true);
    });
  });

  describe('Security Considerations', () => {
    it('should reject potentially malicious URLs', () => {
      const maliciousUrls = [
        'javascript:alert("xss")',
        'data:text/html,<script>alert("xss")</script>',
        'vbscript:msgbox("xss")',
        'file:///etc/passwd',
        'git@github.com:user/repo.git;rm -rf /',
        'https://github.com/user/repo.git#<script>alert("xss")</script>',
      ];

      maliciousUrls.forEach(url => {
        expect(isValidGitUrl(url)).toBe(false);
      });
    });

    it('should not allow command injection in SSH URLs', () => {
      const injectionAttempts = [
        'git@github.com:user/repo.git; rm -rf /',
        'git@github.com:user/repo.git && malicious-command',
        'git@github.com:user/repo.git | cat /etc/passwd',
        'git@github.com:user/repo.git`whoami`',
        'git@github.com:user/repo.git$(whoami)',
      ];

      injectionAttempts.forEach(url => {
        expect(isValidGitUrl(url)).toBe(false);
      });
    });
  });

  describe('Real-world Examples', () => {
    it('should accept common Git hosting services', () => {
      const realWorldUrls = [
        // GitHub
        'git@github.com:facebook/react.git',
        'https://github.com/microsoft/typescript.git',
        
        // GitLab
        'git@gitlab.com:gitlab-org/gitlab.git',
        'https://gitlab.com/gitlab-org/gitlab-foss.git',
        
        // Bitbucket
        'git@bitbucket.org:atlassian/localstack.git',
        'https://bitbucket.org/atlassian/jira-software.git',
        
        // Azure DevOps
        'https://dev.azure.com/organization/project/_git/repo.git',
        
        // Self-hosted
        'git@git.company.com:team/project.git',
        'https://git.company.com/team/project.git',
      ];

      realWorldUrls.forEach(url => {
        expect(isValidGitUrl(url)).toBe(true);
      });
    });
  });
});