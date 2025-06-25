# Setup Guide - Postgirl Desktop

## First-Time Installation

### Prerequisites
- Git installed and configured
- Rust toolchain (for development)
- Node.js 18+ (for development)

### Automatic Database Initialization

Postgirl automatically initializes its SQLite database on first startup:

1. **Database Location**: `{app_data_dir}/postgirl.db`
   - Windows: `%APPDATA%/Postgirl/postgirl.db`
   - macOS: `~/Library/Application Support/Postgirl/postgirl.db`
   - Linux: `~/.local/share/Postgirl/postgirl.db`

2. **Automatic Setup**: On first launch, the application will:
   - Create the app data directory if it doesn't exist
   - Initialize a new SQLite database
   - Run all database migrations
   - Set up default configurations

### Troubleshooting Database Issues

#### Database Initialization Fails

**Symptoms:**
- Application starts but workspace operations fail
- Error messages about database not being initialized

**Solutions:**
1. Check app data directory permissions
2. Ensure sufficient disk space (minimum 10MB)
3. Verify SQLite can create files in the target directory

**Manual Recovery:**
```bash
# Delete corrupted database (will be recreated on next startup)
rm -f "{app_data_dir}/postgirl.db"
```

#### Migration Errors

**Symptoms:**
- Database exists but schema is outdated
- Migration errors in application logs

**Solutions:**
1. Application will continue with existing schema
2. For clean slate: delete database file and restart
3. Check migration files in `src-tauri/migrations/` for syntax errors

#### Permission Issues

**Symptoms:**
- Cannot create database file
- Access denied errors

**Solutions:**
1. Check directory permissions for app data folder
2. Run application with appropriate user permissions
3. Ensure antivirus isn't blocking file creation

### Development Setup

For developers working on the codebase:

1. **Database Service State**: Managed in `src-tauri/src/main.rs`
2. **Migrations**: Located in `src-tauri/migrations/`
3. **Service Implementation**: `src-tauri/src/services/database_service.rs`

### Health Check Commands

Use these Tauri commands for debugging:

- `workspace_database_health_check`: Verify database connectivity
- `workspace_initialize_database`: Manual database initialization
- `health_check`: General application health

### Common Issues

1. **Database Locked**: Another instance may be running
2. **Corrupted Database**: Delete and recreate
3. **Migration Conflicts**: Check migration file numbering
4. **Performance Issues**: Consider database optimization

### Backup and Recovery

**Backup**: Copy the database file from app data directory
**Recovery**: Replace database file and restart application
**Reset**: Delete database file for fresh installation

---

For additional help, see the project documentation or create an issue on GitHub.
