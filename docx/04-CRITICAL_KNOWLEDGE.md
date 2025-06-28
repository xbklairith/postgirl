# 04-CRITICAL_KNOWLEDGE.md
## Essential Patterns and Implementation Rules

### Critical Architecture Decisions

**Framework Choice: Tauri over Electron**
```rust
// Why Tauri is Essential for This Project
Performance:     ~20MB bundle vs ~150MB Electron
Memory:          ~50MB RAM vs ~200MB Electron  
Security:        Rust backend, minimal attack surface
Native:          True native performance and OS integration
Bundle Size:     Significantly smaller distribution
```

**Git-First Architecture (Non-Negotiable)**
- Every workspace MUST be a Git repository
- All API collections stored as standard JSON files in Git
- No proprietary storage formats - complete data ownership
- Git operations must be rock-solid and data-loss proof
- Conflict resolution MUST preserve both sides of data

**Environment Consistency (Core Differentiator)**
- Schema validation enforced across ALL environments
- Variable keys MUST be identical across development/staging/production  
- Adding variable to one environment MUST prompt for all others
- Type safety for all environment variables
- Cross-environment validation before request execution

---

## Tauri-Specific Implementation Patterns

### Rust Backend Architecture

```rust
// src-tauri/src/main.rs - Core structure
#[tauri::command]
async fn execute_http_request(
    config: RequestConfig,
    app_handle: tauri::AppHandle,
) -> Result<ResponseData, String> {
    // HTTP request execution in Rust for maximum performance
    // Async/await for non-blocking operations
    // Proper error handling with Result types
}

#[tauri::command] 
async fn git_clone_repository(
    url: String,
    path: String,
    credentials: Option<GitCredentials>,
) -> Result<CloneResult, GitError> {
    // Git operations using git2-rs crate
    // Progress callbacks to frontend
    // Credential handling with OS keychain
}

#[tauri::command]
async fn store_workspace_data(
    workspace: Workspace,
    db_path: String,
) -> Result<(), DatabaseError> {
    // SQLite operations using rusqlite
    // ACID transactions for data integrity
    // Connection pooling for performance
}
```

### Frontend-Backend Communication

```typescript
// Frontend: invoke Rust commands
import { invoke } from '@tauri-apps/api/tauri';

// Type-safe command invocation
interface RequestConfig {
  method: string;
  url: string;
  headers: Record<string, string>;
  body?: string;
}

const executeRequest = async (config: RequestConfig): Promise<ResponseData> => {
  try {
    return await invoke('execute_http_request', { config });
  } catch (error) {
    // Handle Rust errors properly
    throw new Error(`Request failed: ${error}`);
  }
};

// Event-driven communication for real-time updates
import { listen } from '@tauri-apps/api/event';

await listen('git-progress', (event) => {
  const progress = event.payload as GitProgress;
  updateProgressBar(progress.percentage);
});
```

---

## Git Integration Patterns (CRITICAL)

### Repository Management Rules

```typescript
// NEVER modify Git repository without user awareness
// ALWAYS validate Git operations before execution
// MUST handle merge conflicts gracefully
// REQUIRE explicit user confirmation for destructive operations

interface GitOperationPatterns {
  safety: {
    rule: 'Never auto-commit user data without explicit consent';
    validation: 'Validate all Git operations before execution';
    conflicts: 'Present conflicts in user-friendly UI with resolution options';
    backup: 'Always create backup references before destructive operations';
  };
  
  performance: {
    rule: 'Git operations must not block UI';
    implementation: 'All Git operations run in Rust backend with progress updates';
    caching: 'Cache Git status and repository information intelligently';
    batching: 'Batch multiple Git operations when possible';
  };
  
  reliability: {
    rule: 'Git failures must not corrupt workspace state';
    rollback: 'Implement rollback mechanisms for failed operations';
    verification: 'Verify Git state after operations';
    recovery: 'Provide recovery options for corrupted repositories';
  };
}
```

### Git Conflict Resolution UI

```typescript
// CRITICAL: Git conflicts must be resolved with complete context
interface ConflictResolutionPattern {
  detection: 'Automatically detect conflicts during pull/merge operations';
  presentation: 'Show conflicts in structured, user-friendly format';
  resolution: 'Provide multiple resolution strategies (ours, theirs, manual)';
  validation: 'Validate resolved conflicts maintain JSON structure';
  testing: 'Allow testing resolved conflicts before finalizing';
}

// Example implementation pattern
const resolveGitConflict = async (conflict: GitConflict) => {
  // 1. Parse conflict markers in JSON files
  // 2. Present structured diff view
  // 3. Allow user to choose resolution strategy
  // 4. Validate JSON syntax after resolution
  // 5. Test merged result if possible
  // 6. Commit resolution with descriptive message
};
```

---

## Environment Management Patterns

### Schema Enforcement (Core Feature)

```typescript
// CRITICAL: Environment consistency is a key differentiator
interface EnvironmentSchemaPattern {
  validation: {
    rule: 'All environments MUST have identical variable keys';
    enforcement: 'Block request execution if environments inconsistent';
    prompting: 'Prompt user to add missing variables when detected';
    types: 'Enforce variable types across environments';
  };
  
  synchronization: {
    rule: 'Changes to one environment trigger validation of all';
    implementation: 'Real-time cross-environment validation';
    conflicts: 'Highlight environment inconsistencies prominently';
    resolution: 'Provide bulk update tools for consistency';
  };
  
  security: {
    rule: 'Sensitive variables MUST be stored securely';
    implementation: 'OS keychain integration for secrets';
    masking: 'Mask sensitive values in UI and logs';
    auditing: 'Track access to sensitive environment variables';
  };
}

// Implementation example
const validateEnvironmentConsistency = (environments: Environment[]) => {
  const allKeys = new Set<string>();
  environments.forEach(env => 
    Object.keys(env.variables).forEach(key => allKeys.add(key))
  );
  
  const inconsistencies: EnvironmentInconsistency[] = [];
  environments.forEach(env => {
    allKeys.forEach(key => {
      if (!(key in env.variables)) {
        inconsistencies.push({
          environmentId: env.id,
          missingVariable: key,
          severity: 'error'
        });
      }
    });
  });
  
  return inconsistencies;
};
```

---

## Performance Requirements (Non-Negotiable)

### Startup Performance SLA

```typescript
// CRITICAL: Performance is a key competitive advantage
interface PerformanceRequirements {
  startup: {
    coldStart: '<2000ms';     // First launch (Tauri advantage)
    warmStart: '<500ms';      // Subsequent launches
    workspaceSwitch: '<300ms'; // Between workspaces
  };
  
  runtime: {
    requestExecution: '<50ms';  // HTTP request overhead (Rust benefit)
    uiResponseTime: '<16ms';   // 60fps target
    memoryUsage: '<100MB';     // Tauri memory efficiency
    gitOperations: '<1000ms';  // Git status/commit operations
  };
  
  scalability: {
    maxRequests: 50000;        // Per collection (Git file limits)
    maxEnvironments: 100;      // Per workspace
    concurrentRequests: 100;   // Rust async advantage
    workspaceSize: '1GB';      // Git repository size limit
  };
}
```

### Memory Management Rules

```rust
// Rust backend memory management
use std::sync::Arc;
use tokio::sync::RwLock;

// Shared state pattern
pub struct AppState {
    pub workspaces: Arc<RwLock<HashMap<String, Workspace>>>,
    pub git_repos: Arc<RwLock<HashMap<String, Repository>>>,
    pub http_client: Arc<reqwest::Client>,
}

// Memory-efficient request execution
pub async fn execute_request(
    state: Arc<AppState>,
    config: RequestConfig,
) -> Result<ResponseData, RequestError> {
    // Use Arc for shared data, avoid cloning large structures
    // Stream large responses to avoid memory spikes
    // Clean up resources explicitly
}
```

---

## Security Patterns (CRITICAL)

### Credential Storage

```rust
// NEVER store credentials in plain text
// ALWAYS use OS keychain integration
// MUST support credential rotation

use keyring::Entry;

pub async fn store_credential(
    service: &str,
    account: &str, 
    password: &str,
) -> Result<(), keyring::Error> {
    let entry = Entry::new(service, account)?;
    entry.set_password(password)?;
    Ok(())
}

pub async fn retrieve_credential(
    service: &str,
    account: &str,
) -> Result<String, keyring::Error> {
    let entry = Entry::new(service, account)?;
    entry.get_password()
}
```

### Request Security

```typescript
// CRITICAL: Secure request handling patterns
interface SecurityPatterns {
  certificateValidation: {
    rule: 'Always validate SSL certificates by default';
    override: 'Allow per-request override with explicit user consent';
    storage: 'Store certificate exceptions securely';
    warning: 'Clear warnings for insecure connections';
  };
  
  credentialHandling: {
    rule: 'Never log or cache credentials';
    transmission: 'Secure credential transmission to backend';
    memory: 'Clear credentials from memory after use';
    audit: 'Log credential access (not values)';
  };
  
  dataPrivacy: {
    rule: 'Mask sensitive data in UI and logs';
    patterns: 'Detect common sensitive patterns (API keys, tokens)';
    export: 'Sanitize exports of sensitive data';
    sharing: 'Warn before sharing potentially sensitive collections';
  };
}
```

---

## UI/UX Patterns

### Glassmorphism Design System

```css
/* CRITICAL: Consistent glassmorphism implementation */
.glass-panel {
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
}

.glass-button {
  background: rgba(139, 69, 255, 0.1);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(139, 69, 255, 0.2);
  transition: all 200ms ease;
}

.glass-button:hover {
  background: rgba(139, 69, 255, 0.2);
  transform: translateY(-1px);
  box-shadow: 0 12px 40px rgba(139, 69, 255, 0.2);
}
```

### Keyboard-First Navigation

```typescript
// CRITICAL: Keyboard accessibility for power users
interface KeyboardPatterns {
  globalShortcuts: {
    'Cmd/Ctrl+Enter': 'Execute current request';
    'Cmd/Ctrl+Shift+W': 'Switch workspace';
    'Cmd/Ctrl+Shift+E': 'Switch environment';
    'Cmd/Ctrl+K': 'Command palette';
    'Cmd/Ctrl+N': 'New request';
    'Cmd/Ctrl+S': 'Save current request';
  };
  
  contextualShortcuts: {
    'Tab': 'Navigate form fields intelligently';
    'Escape': 'Close modals/cancel operations';
    'Enter': 'Confirm actions/submit forms';
    'Space': 'Toggle checkboxes/select items';
  };
  
  powerUser: {
    'Cmd/Ctrl+Shift+C': 'Copy as cURL';
    'Cmd/Ctrl+Shift+G': 'Git status';
    'Cmd/Ctrl+Shift+P': 'Push changes';
    'Cmd/Ctrl+Shift+L': 'Pull changes';
  };
}
```

---

## Error Handling Patterns

### Graceful Error Recovery

```typescript
// CRITICAL: Errors must never lose user data
interface ErrorHandlingPatterns {
  gitErrors: {
    pattern: 'Present Git errors with actionable solutions';
    recovery: 'Offer automatic recovery where possible';
    escalation: 'Provide manual resolution guides for complex issues';
    preservation: 'Never lose work-in-progress during Git errors';
  };
  
  networkErrors: {
    pattern: 'Distinguish between network and application errors';
    retry: 'Implement intelligent retry with exponential backoff';
    offline: 'Graceful degradation for offline scenarios';
    timeout: 'Clear timeout handling with user control';
  };
  
  validationErrors: {
    pattern: 'Real-time validation with helpful error messages';
    prevention: 'Prevent invalid states rather than fixing them';
    guidance: 'Provide examples and suggestions for fixes';
    context: 'Show validation errors in context of the data';
  };
}

// Example error handling
const handleGitError = (error: GitError) => {
  switch (error.type) {
    case 'merge_conflict':
      return showConflictResolutionUI(error.conflicts);
    case 'authentication_failed':
      return promptForCredentials(error.repository);
    case 'network_error':
      return offerOfflineMode();
    default:
      return showGenericErrorWithSupport(error);
  }
};
```

---

## Testing Patterns (CRITICAL)

### Test-Driven Development Rules

```typescript
// CRITICAL: High test coverage is non-negotiable
interface TestingPatterns {
  unit: {
    coverage: '>95% for utilities and business logic';
    pattern: 'Test pure functions extensively';
    mocking: 'Mock external dependencies (Git, HTTP, file system)';
    performance: 'Include performance regression tests';
  };
  
  integration: {
    coverage: '>90% for critical user workflows';
    pattern: 'Test component + store interactions';
    realData: 'Use realistic test data and scenarios';
    errorCases: 'Test error handling and edge cases';
  };
  
  e2e: {
    coverage: 'All critical user journeys';
    pattern: 'Full application workflow testing';
    crossPlatform: 'Test on all supported platforms';
    performance: 'Validate performance SLAs in tests';
  };
}

// Example test pattern
describe('Git Operations', () => {
  test('should handle merge conflicts gracefully', async () => {
    // Setup: Create conflicting changes
    const workspace = await createTestWorkspace();
    await createConflictingChanges(workspace);
    
    // Execute: Attempt merge
    const result = await gitService.pullChanges(workspace.path);
    
    // Verify: Conflict detected and handled
    expect(result.hasConflicts).toBe(true);
    expect(result.conflicts).toHaveLength(2);
    expect(result.userDataIntact).toBe(true);
  });
});
```

---

## Data Migration Patterns

### Import/Export Reliability

```typescript
// CRITICAL: Migration tools must be bulletproof
interface MigrationPatterns {
  postmanImport: {
    rule: 'Perfect fidelity for all supported Postman features';
    validation: 'Validate imported data structure and integrity';
    reporting: 'Detailed migration report with any limitations';
    testing: 'Test imported collections automatically';
  };
  
  dataIntegrity: {
    rule: 'Never lose data during migration or export';
    backup: 'Create backup before any migration operation';
    verification: 'Verify data integrity after migration';
    rollback: 'Provide rollback for failed migrations';
  };
  
  formatSupport: {
    rule: 'Support three core API testing tool formats';
    postman: 'Complete Postman Collection v2.1 import/export';
    openapi: 'Full OpenAPI 3.0+ specification import/export';
    curl: 'Perfect cURL command import and export';
  };
}
```

---

## Performance Monitoring

### Real-Time Performance Tracking

```rust
// Performance monitoring in Rust backend
use std::time::Instant;

#[tauri::command]
async fn execute_request_with_metrics(
    config: RequestConfig,
) -> Result<ResponseWithMetrics, RequestError> {
    let start = Instant::now();
    
    let response = http_client.execute(config).await?;
    
    let metrics = RequestMetrics {
        total_time: start.elapsed(),
        dns_lookup_time: response.dns_lookup_time,
        tcp_connect_time: response.tcp_connect_time,
        tls_handshake_time: response.tls_handshake_time,
        transfer_time: response.transfer_time,
    };
    
    Ok(ResponseWithMetrics { response, metrics })
}
```

---

## Deployment and Distribution

### Cross-Platform Build Patterns

```yaml
# CRITICAL: Reliable cross-platform distribution
name: Build and Release
on: [push, pull_request]

jobs:
  build:
    strategy:
      matrix:
        platform: [ubuntu-latest, windows-latest, macos-latest]
        arch: [x86_64, aarch64]
    
    steps:
      - name: Setup Tauri
        uses: tauri-apps/tauri-action@v0
        
      - name: Build Application
        run: |
          npm run build
          cargo tauri build
          
      - name: Test Built Application
        run: |
          npm run test:e2e:built
          
      - name: Sign and Notarize (macOS)
        if: matrix.platform == 'macos-latest'
        run: |
          # Code signing and notarization
          
      - name: Create Release
        uses: tauri-apps/tauri-action@v0
        with:
          tagName: ${{ github.ref_name }}
          releaseName: 'Postgirl v${{ github.ref_name }}'
```

---

*These critical patterns and rules form the foundation for building a reliable, performant, and user-friendly API testing application. Every implementation decision should be evaluated against these patterns to ensure consistency and quality.*