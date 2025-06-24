# Postgirl

Modern, Git-based API testing desktop application designed to replace Postman with superior team collaboration, environment management, and developer experience.

## Features

- **Git-First Approach**: API collections stored as Git repositories
- **Team Collaboration**: Version control for all API testing assets
- **Environment Management**: Schema-enforced environment variables
- **Modern UI**: Glassmorphism design with dark/light theme
- **Performance**: Built with Tauri for native performance
- **Cross-Platform**: Windows, macOS, and Linux support

## Development

### Prerequisites

- Rust 1.70+ (with `rustup`)
- Node.js 18+ and npm 8+
- Platform-specific dependencies:
  - **Windows**: Visual Studio Build Tools
  - **macOS**: Xcode Command Line Tools
  - **Linux**: `build-essential`, `libgtk-3-dev`, `webkit2gtk-4.0-dev`

### Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/postgirl/postgirl.git
   cd postgirl
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run in development mode**
   ```bash
   npm run tauri:dev
   ```

4. **Build for production**
   ```bash
   npm run tauri:build
   ```

### Scripts

- `npm run dev` - Start Vite development server
- `npm run build` - Build frontend for production
- `npm run tauri:dev` - Start Tauri in development mode
- `npm run tauri:build` - Build Tauri application
- `npm run lint` - Run ESLint

## Architecture

- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Tauri 2.0 + Rust
- **Database**: SQLite (local app data)
- **Git Integration**: git2-rs
- **HTTP Client**: reqwest
- **UI Components**: Custom glassmorphism design system

## Project Structure

```
.
├── src/                    # React frontend
├── src-tauri/             # Rust backend
├── public/                # Static assets
├── docx/                  # Documentation
├── .github/               # GitHub Actions
└── dist/                  # Built application
```

## Documentation

Comprehensive documentation is available in the `docx/` directory:

- [Master Plan](docx/01-MASTER_PLAN.md) - Project vision and strategy
- [Tech Stack](docx/02-TECH_STACK.md) - Technology decisions
- [Codebase Guide](docx/03-CODEBASE_GUIDE.md) - Architecture overview
- [Critical Knowledge](docx/04-CRITICAL_KNOWLEDGE.md) - Implementation patterns
- [Roadmap](docx/05-DETAILED_ROADMAP.md) - Development timeline
- [Current State](docx/06-CURRENT_STATE.md) - Progress tracking
- [Active Tasks](docx/07-ACTIVE_TASKS.md) - Current work items

## Contributing

1. Read the documentation in `docx/` directory
2. Check current state in `docx/06-CURRENT_STATE.md`
3. Review active tasks in `docx/07-ACTIVE_TASKS.md`
4. Follow the established patterns in `docx/04-CRITICAL_KNOWLEDGE.md`

## License

MIT License - see [LICENSE](LICENSE) file for details.