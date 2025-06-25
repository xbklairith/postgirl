# Copilot Instructions

## Purpose

This file provides guidelines for using GitHub Copilot within the Postgirl project. It ensures that Copilot-generated code and suggestions align with our architecture, coding standards, and documentation practices.

## Usage Guidelines

- **Context Awareness:** Always reference the project’s architecture and patterns as described in [`03-CODEBASE_GUIDE.md`](./03-CODEBASE_GUIDE.md) and [`04-CRITICAL_KNOWLEDGE.md`](./04-CRITICAL_KNOWLEDGE.md).
- **File Placement:** Place new code in the correct directory as per the [Project Structure Overview](./03-CODEBASE_GUIDE.md).
- **Documentation:** Update relevant documentation after implementing new features or making significant changes.
- **Testing:** Ensure all Copilot-generated code is covered by unit and integration tests as described in [`03-CODEBASE_GUIDE.md`](./03-CODEBASE_GUIDE.md#testing-architecture).
- **Security & Performance:** Follow the critical rules in [`04-CRITICAL_KNOWLEDGE.md`](./04-CRITICAL_KNOWLEDGE.md) for security and performance.
- **Task Alignment:** Align code changes with active tasks in [`07-ACTIVE_TASKS.md`](./07-ACTIVE_TASKS.md).

## Copilot Prompts

- When requesting code, specify the target file and function or component name.
- For new features, reference the relevant requirement or task ID.
- For refactoring, describe the intended improvement and expected outcome.

## Example Prompts

- "Implement the import/export service as described in `07-ACTIVE_TASKS.md`."
- "Add unit tests for the `GitService` in `src-tauri/src/services/git_service.rs`."
- "Refactor the environment management logic for better validation (see `04-CRITICAL_KNOWLEDGE.md`)."

## Common Issues & Solutions

### Database Initialization Problems
- **Issue**: Database not initialized on fresh install
- **Solution**: Database is automatically initialized on app startup. Use `workspace_database_health_check` command to verify.
- **Troubleshooting**: Check app data directory permissions and disk space.

### Migration Failures
- **Issue**: Database migrations fail on startup
- **Solution**: Application continues with existing schema. Check migration files in `src-tauri/migrations/`.
- **Recovery**: Delete database file to force recreation, or run `workspace_initialize_database` manually.

### Git Repository Issues
- **Issue**: Workspace creation fails due to Git errors
- **Solution**: Ensure Git is installed and accessible. Check repository URL and credentials.
- **Prevention**: Always validate Git repository before workspace creation.

---

*Update this file as Copilot usage patterns evolve or project standards change.*
