# 02-TECH_STACK.md
## Technology Foundation and Development Standards

### Core Technology Stack

**Desktop Application Framework**
```typescript
// Primary Stack
Tauri 2.0+                      // Rust-based cross-platform desktop framework
React 18+                        // UI framework with concurrent features
TypeScript 5.2+                  // Type safety and developer experience
Vite 5+                         // Build tool and dev server
```

**UI & Styling**
```typescript
// Modern UI Stack
Tailwind CSS 3.4+               // Utility-first CSS framework
Headless UI                     // Accessible UI components
Framer Motion                   // Animation library
@radix-ui/react-*               // Low-level UI primitives
Lucide React                    // Icon library
```

**State Management & Data Flow**
```typescript
// Application State
Zustand                         // Lightweight state management
React Query (TanStack Query)    // Server state management
Immer                          // Immutable state updates
```

**Storage & Persistence**
```rust
// Rust Backend Data Layer
sqlx                           // Async SQL toolkit for SQLite
serde                         // Serialization framework
tokio                         // Async runtime
git2                          // Git operations
keyring                       // Secure credential storage
```

**HTTP & Network**
```rust
// Request Engine (Rust)
reqwest                       // HTTP client with async support
tokio-tungstenite            // WebSocket client
```

**Code Editor & Monaco**
```typescript
// Editor Integration
@monaco-editor/react         // React wrapper for Monaco
monaco-editor               // VS Code editor engine
prettier                   // Code formatting
```

---

## Tauri Architecture Advantages

### Why Tauri Over Electron

**Performance Benefits:**
```rust
// Bundle Size Comparison
Tauri:    ~15-30MB (including WebView)
Electron: ~130-200MB (includes Chromium)

// Memory Usage Comparison  
Tauri:    ~30-80MB RAM (shared system WebView)
Electron: ~150-300MB RAM (dedicated Chromium instance)

// Startup Performance
Tauri:    ~500ms-1s (native binary startup)
Electron: ~2-4s (Node.js + Chromium initialization)
```

**Security Advantages:**
```rust
// Tauri Security Model
- Rust memory safety (no buffer overflows)
- Minimal attack surface (no Node.js runtime)
- Process isolation between frontend and backend
- Capability-based permissions system
- Code signing and sandboxing support
```

**Native Integration:**
```rust
// Deep OS Integration
- Native file dialogs and system tray
- True native performance for intensive operations
- Direct access to system APIs via Rust
- Smaller resource footprint
- Better battery life on mobile devices
```

---

## Rust Backend Architecture

### Core Backend Structure
```rust
// src-tauri/src/main.rs
use tauri::{Command, Manager, State, Window};
use std::sync::Arc;
use tokio::sync::RwLock;

// Application state management
#[derive(Debug)]
pub struct AppState {
    pub workspaces: Arc<RwLock<HashMap<String, Workspace>>>,
    pub git_manager: Arc<GitManager>,
    pub http_client: Arc<HttpClient>,
    pub database: Arc<Database>,
}

// Main Tauri commands
#[tauri::command]
async fn execute_http_request(
    config: RequestConfig,
    state: State<'_, AppState>,
) -> Result<ResponseData, String> {
    state.http_client.execute(config).await
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn git_clone_repository(
    url: String,
    path: String,
    credentials: Option<GitCredentials>,
    state: State<'_, AppState>,
) -> Result<CloneResult, String> {
    state.git_manager.clone_repository(url, path, credentials).await
        .map_err(|e| e.to_string())
}

fn main() {
    tauri::Builder::default()
        .manage(AppState::new())
        .invoke_handler(tauri::generate_handler![
            execute_http_request,
            git_clone_repository,
            workspace_operations,
            environment_management
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

### Git Operations with git2-rs
```rust
// src-tauri/src/git/mod.rs
use git2::{Repository, Signature, Oid, BranchType};
use std::path::Path;

pub struct GitManager {
    repositories: Arc<RwLock<HashMap<String, Repository>>>,
}

impl GitManager {
    pub async fn clone_repository(
        &self,
        url: String,
        path: String,
        credentials: Option<GitCredentials>,
    ) -> Result<CloneResult, GitError> {
        let mut builder = git2::build::RepoBuilder::new();
        
        // Setup authentication if provided
        if let Some(creds) = credentials {
            builder.fetch_options(self.create_fetch_options(creds)?);
        }
        
        // Clone with progress callback
        let repo = builder.clone(&url, Path::new(&path))?;
        
        // Store repository reference
        let mut repos = self.repositories.write().await;
        repos.insert(path.clone(), repo);
        
        Ok(CloneResult {
            path,
            success: true,
            message: "Repository cloned successfully".to_string(),
        })
    }
    
    pub async fn get_status(&self, repo_path: &str) -> Result<GitStatus, GitError> {
        let repos = self.repositories.read().await;
        let repo = repos.get(repo_path)
            .ok_or(GitError::RepositoryNotFound)?;
            
        let statuses = repo.statuses(None)?;
        
        Ok(GitStatus {
            staged: self.extract_staged_files(&statuses),
            unstaged: self.extract_unstaged_files(&statuses),
            untracked: self.extract_untracked_files(&statuses),
            current_branch: self.get_current_branch(repo)?,
        })
    }
}
```

### HTTP Client Implementation
```rust
// src-tauri/src/http/mod.rs
use reqwest::{Client, Method, Request, Response};
use std::time::Duration;

pub struct HttpClient {
    client: Client,
    default_timeout: Duration,
}

impl HttpClient {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .user_agent("Postgirl/1.0.0")
            .build()
            .expect("Failed to create HTTP client");
            
        Self {
            client,
            default_timeout: Duration::from_secs(30),
        }
    }
    
    pub async fn execute(&self, config: RequestConfig) -> Result<ResponseData, HttpError> {
        let mut request_builder = self.client
            .request(
                Method::from_bytes(config.method.as_bytes())?,
                &config.url
            );
            
        // Add headers
        for (key, value) in config.headers {
            request_builder = request_builder.header(key, value);
        }
        
        // Add body if present
        if let Some(body) = config.body {
            request_builder = request_builder.body(body);
        }
        
        // Execute request with timing
        let start_time = std::time::Instant::now();
        let response = request_builder.send().await?;
        let duration = start_time.elapsed();
        
        // Extract response data
        let status = response.status().as_u16();
        let headers = self.extract_headers(&response);
        let body = response.text().await?;
        
        Ok(ResponseData {
            status,
            headers,
            body,
            response_time: duration.as_millis() as u64,
            size: body.len() as u64,
        })
    }
}
```

---

## Frontend React Architecture

### Component Structure with Tauri
```typescript
// src/components/request/RequestBuilder.tsx
import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';

interface RequestBuilderProps {
  workspace: Workspace;
  onResponse: (response: ResponseData) => void;
}

export const RequestBuilder: React.FC<RequestBuilderProps> = ({
  workspace,
  onResponse
}) => {
  const [request, setRequest] = useState<RequestConfig>({
    method: 'GET',
    url: '',
    headers: {},
    body: null
  });
  
  const [isExecuting, setIsExecuting] = useState(false);
  
  const executeRequest = async () => {
    setIsExecuting(true);
    
    try {
      // Invoke Rust backend command
      const response = await invoke<ResponseData>('execute_http_request', {
        config: request
      });
      
      onResponse(response);
    } catch (error) {
      console.error('Request failed:', error);
      // Handle error appropriately
    } finally {
      setIsExecuting(false);
    }
  };
  
  // Listen for progress updates
  useEffect(() => {
    const unlisten = listen('request-progress', (event) => {
      const progress = event.payload as RequestProgress;
      // Update progress UI
    });
    
    return () => {
      unlisten.then(fn => fn());
    };
  }, []);
  
  return (
    <div className="request-builder">
      {/* Request builder UI */}
    </div>
  );
};
```

### State Management with Zustand
```typescript
// src/stores/workspace.ts
import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/tauri';

interface WorkspaceStore {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  loading: boolean;
  error: string | null;
  
  // Actions
  setCurrentWorkspace: (workspace: Workspace) => void;
  loadWorkspaces: () => Promise<void>;
  createWorkspace: (config: WorkspaceConfig) => Promise<Workspace>;
  cloneWorkspace: (url: string, path: string) => Promise<Workspace>;
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  currentWorkspace: null,
  workspaces: [],
  loading: false,
  error: null,
  
  setCurrentWorkspace: (workspace) => set({ currentWorkspace: workspace }),
  
  loadWorkspaces: async () => {
    set({ loading: true, error: null });
    
    try {
      const workspaces = await invoke<Workspace[]>('load_workspaces');
      set({ workspaces, loading: false });
    } catch (error) {
      set({ error: error as string, loading: false });
    }
  },
  
  createWorkspace: async (config) => {
    const workspace = await invoke<Workspace>('create_workspace', { config });
    set(state => ({ 
      workspaces: [...state.workspaces, workspace],
      currentWorkspace: workspace 
    }));
    return workspace;
  },
  
  cloneWorkspace: async (url, path) => {
    set({ loading: true, error: null });
    
    try {
      const result = await invoke<CloneResult>('git_clone_repository', {
        url,
        path,
        credentials: null
      });
      
      if (result.success) {
        const workspace = await invoke<Workspace>('load_workspace', { 
          path: result.path 
        });
        
        set(state => ({
          workspaces: [...state.workspaces, workspace],
          currentWorkspace: workspace,
          loading: false
        }));
        
        return workspace;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      set({ error: error as string, loading: false });
      throw error;
    }
  }
}));
```

---

## Build and Development Configuration

### Tauri Configuration
```json
// src-tauri/tauri.conf.json
{
  "build": {
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build",
    "devPath": "http://localhost:1420",
    "distDir": "../dist",
    "withGlobalTauri": false
  },
  "package": {
    "productName": "Postgirl",
    "version": "0.1.0"
  },
  "tauri": {
    "allowlist": {
      "all": false,
      "shell": {
        "all": false,
        "open": true
      },
      "dialog": {
        "all": false,
        "open": true,
        "save": true
      },
      "fs": {
        "all": false,
        "readFile": true,
        "writeFile": true,
        "createDir": true,
        "removeDir": true,
        "scope": ["$APPDATA/postgirl/*", "$HOME/postgirl-workspaces/*"]
      },
      "path": {
        "all": true
      },
      "process": {
        "all": false,
        "exit": true,
        "relaunch": true
      }
    },
    "bundle": {
      "active": true,
      "targets": "all",
      "identifier": "com.postgirl",
      "icon": [
        "icons/32x32.png",
        "icons/128x128.png",
        "icons/128x128@2x.png",
        "icons/icon.icns",
        "icons/icon.ico"
      ]
    },
    "security": {
      "csp": null
    },
    "windows": [
      {
        "fullscreen": false,
        "resizable": true,
        "title": "Postgirl",
        "width": 1400,
        "height": 900,
        "minWidth": 1200,
        "minHeight": 700
      }
    ]
  }
}
```

### Cargo.toml Dependencies
```toml
# src-tauri/Cargo.toml
[package]
name = "postgirl"
version = "0.1.0"
description = "Git-based API testing desktop application"
authors = ["AubitX Team"]
license = ""
repository = ""
default-run = "postgirl"
edition = "2021"
rust-version = "1.70"

[build-dependencies]
tauri-build = { version = "2.0", features = [] }

[dependencies]
serde_json = "1.0"
serde = { version = "1.0", features = ["derive"] }
tauri = { version = "2.0", features = ["shell-open"] }
tokio = { version = "1.0", features = ["full"] }
sqlx = { version = "0.7", features = ["runtime-tokio-rustls", "sqlite"] }
git2 = "0.18"
reqwest = { version = "0.11", features = ["json", "stream"] }
keyring = "2.0"
uuid = { version = "1.0", features = ["v4"] }
thiserror = "1.0"
anyhow = "1.0"
```

---

## Performance Optimizations

### Rust Backend Performance
```rust
// Performance-optimized patterns
use std::sync::Arc;
use tokio::sync::RwLock;
use once_cell::sync::Lazy;

// Global HTTP client instance
static HTTP_CLIENT: Lazy<reqwest::Client> = Lazy::new(|| {
    reqwest::Client::builder()
        .pool_max_idle_per_host(10)
        .pool_idle_timeout(Duration::from_secs(90))
        .timeout(Duration::from_secs(30))
        .build()
        .expect("Failed to create HTTP client")
});

// Connection pooling for SQLite
pub struct DatabasePool {
    pool: sqlx::SqlitePool,
}

impl DatabasePool {
    pub async fn new(database_url: &str) -> Result<Self, sqlx::Error> {
        let pool = sqlx::SqlitePool::connect_with(
            sqlx::sqlite::SqliteConnectOptions::from_str(database_url)?
                .create_if_missing(true)
                .journal_mode(sqlx::sqlite::SqliteJournalMode::Wal)
                .synchronous(sqlx::sqlite::SqliteSynchronous::Normal)
        ).await?;
        
        Ok(Self { pool })
    }
}
```

### Frontend Performance
```typescript
// React performance optimizations
import { memo, useMemo, useCallback } from 'react';

export const RequestList = memo<RequestListProps>(({ requests, onSelect }) => {
  const sortedRequests = useMemo(() => 
    requests.sort((a, b) => a.name.localeCompare(b.name)),
    [requests]
  );
  
  const handleSelect = useCallback((request: Request) => {
    onSelect(request);
  }, [onSelect]);
  
  return (
    <VirtualizedList
      items={sortedRequests}
      itemHeight={60}
      renderItem={({ item }) => (
        <RequestItem 
          key={item.id}
          request={item} 
          onSelect={handleSelect}
        />
      )}
    />
  );
});
```

---

## Security Implementation

### Credential Management
```rust
// src-tauri/src/security/credentials.rs
use keyring::Entry;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct CredentialManager {
    service_name: String,
}

impl CredentialManager {
    pub fn new() -> Self {
        Self {
            service_name: "com.postgirl".to_string(),
        }
    }
    
    pub async fn store_credential(
        &self,
        key: &str,
        value: &str,
    ) -> Result<(), CredentialError> {
        let entry = Entry::new(&self.service_name, key)?;
        entry.set_password(value)?;
        Ok(())
    }
    
    pub async fn retrieve_credential(
        &self,
        key: &str,
    ) -> Result<String, CredentialError> {
        let entry = Entry::new(&self.service_name, key)?;
        let password = entry.get_password()?;
        Ok(password)
    }
    
    pub async fn delete_credential(
        &self,
        key: &str,
    ) -> Result<(), CredentialError> {
        let entry = Entry::new(&self.service_name, key)?;
        entry.delete_password()?;
        Ok(())
    }
}
```

### Data Sanitization
```rust
// Sensitive data detection and masking
use regex::Regex;
use once_cell::sync::Lazy;

static SENSITIVE_PATTERNS: Lazy<Vec<Regex>> = Lazy::new(|| {
    vec![
        Regex::new(r"(?i)(api[_-]?key|apikey)\s*[=:]\s*['\"]?([^'\"\\s]+)").unwrap(),
        Regex::new(r"(?i)(password|passwd|pwd)\s*[=:]\s*['\"]?([^'\"\\s]+)").unwrap(),
        Regex::new(r"(?i)(bearer|token)\s+([a-zA-Z0-9._-]+)").unwrap(),
        Regex::new(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}").unwrap(),
    ]
});

pub fn sanitize_sensitive_data(input: &str) -> String {
    let mut result = input.to_string();
    
    for pattern in SENSITIVE_PATTERNS.iter() {
        result = pattern.replace_all(&result, "***REDACTED***").to_string();
    }
    
    result
}
```

---

## Testing Strategy

### Rust Backend Testing
```rust
// src-tauri/src/tests/mod.rs
#[cfg(test)]
mod tests {
    use super::*;
    use tokio_test;
    
    #[tokio::test]
    async fn test_http_request_execution() {
        let client = HttpClient::new();
        let config = RequestConfig {
            method: "GET".to_string(),
            url: "https://httpbin.org/get".to_string(),
            headers: HashMap::new(),
            body: None,
        };
        
        let response = client.execute(config).await.unwrap();
        assert_eq!(response.status, 200);
        assert!(response.response_time > 0);
    }
    
    #[tokio::test]
    async fn test_git_operations() {
        let temp_dir = tempfile::tempdir().unwrap();
        let git_manager = GitManager::new();
        
        let result = git_manager.clone_repository(
            "https://github.com/octocat/Hello-World.git".to_string(),
            temp_dir.path().to_string_lossy().to_string(),
            None,
        ).await;
        
        assert!(result.is_ok());
        assert!(result.unwrap().success);
    }
}
```

### Frontend Testing with Tauri
```typescript
// src/tests/tauri-integration.test.ts
import { mockIPC } from '@tauri-apps/api/mocks';
import { invoke } from '@tauri-apps/api/tauri';

// Mock Tauri commands for testing
beforeAll(() => {
  mockIPC((cmd, args) => {
    switch (cmd) {
      case 'execute_http_request':
        return Promise.resolve({
          status: 200,
          headers: {},
          body: '{"success": true}',
          response_time: 123,
          size: 18
        });
      default:
        return Promise.reject(new Error(`Unknown command: ${cmd}`));
    }
  });
});

test('should execute HTTP request via Tauri', async () => {
  const config = {
    method: 'GET',
    url: 'https://api.example.com/test',
    headers: {},
    body: null
  };
  
  const response = await invoke('execute_http_request', { config });
  
  expect(response.status).toBe(200);
  expect(response.body).toBe('{"success": true}');
});
```

---

*This technology foundation leverages Tauri's performance advantages while maintaining a rich React frontend, providing the optimal balance of native performance, security, and developer experience.*