# Documentation Organization Guide

## Quick Start Navigation

### 📖 For First-Time Readers (Complete Understanding)
**Read these documents in order for full project context:**

1. **`01-MASTER_PLAN.md`** - WHY we're building this, WHAT success looks like
2. **`02-TECH_STACK.md`** - HOW we build (technologies and standards)  
3. **`03-CODEBASE_GUIDE.md`** - WHERE things live (architecture and files)
4. **`04-CRITICAL_KNOWLEDGE.md`** - PATTERNS you must follow (rules and gotchas)
5. **`05-DETAILED_ROADMAP.md`** - COMPLETE development plan with phases and tasks
6. **`06-CURRENT_STATE.md`** - WHERE we are now (progress and context)
7. **`07-ACTIVE_TASKS.md`** - WHAT to do next (specific implementation)

### ⚡ For Daily Development Work (Quick Resume)
**Jump directly to these for immediate productivity:**

- **`06-CURRENT_STATE.md`** - Current progress and what I'm working on
- **`07-ACTIVE_TASKS.md`** - Specific tasks with implementation details
- **`04-CRITICAL_KNOWLEDGE.md`** - When you need to check patterns or rules

### 📋 For Project Planning (Strategic Work)
**For sprint planning and roadmap review:**

- **`01-MASTER_PLAN.md`** - Overall vision and development phases
- **`05-DETAILED_ROADMAP.md`** - Comprehensive development plan with tasks
- **`06-CURRENT_STATE.md`** - Current development status and milestones



### Conceptual → Explicit Information Flow
This documentation is ordered by **cognitive complexity** - from high-level understanding to specific implementation:

```
Strategic Vision (WHY)
    ↓
Technical Foundation (HOW)
    ↓  
System Architecture (WHERE)
    ↓
Implementation Rules (PATTERNS)
    ↓
Current Progress (STATUS)
    ↓
Specific Actions (TASKS)
```

### Why This Order Matters
- **Context before content**: Understanding the purpose enables better implementation decisions
- **Principles before specifics**: Knowing the rules prevents common mistakes
- **Status before action**: Current context informs what to do next

## Document Purposes and Update Frequency

### Strategic Level (Monthly Updates)
- **`01-MASTER_PLAN.md`**: Project vision, phases, success criteria
- **`05-DETAILED_ROADMAP.md`**: Complete development plan with task breakdown

### Foundation Level (Quarterly Updates)  
- **`02-TECH_STACK.md`**: Technology choices and development standards
- **`03-CODEBASE_GUIDE.md`**: System architecture and code organization
- **`04-CRITICAL_KNOWLEDGE.md`**: Essential patterns and implementation rules

### Operational Level (Daily/Weekly Updates)
- **`06-CURRENT_STATE.md`**: Current progress, blockers, next priorities
- **`07-ACTIVE_TASKS.md`**: Specific implementation tasks with code references

## Reading Patterns by Role

### AI Assistant (Claude) - Primary Reader
**Daily Resume**: 
1. `06-CURRENT_STATE.md` - What was I working on?
2. `07-ACTIVE_TASKS.md` - What exactly needs to be done?
3. `04-CRITICAL_KNOWLEDGE.md` - What patterns must I follow?

**Full Context**: Read 01-07 in sequence for complete understanding

### New Developer Onboarding
**Week 1**: Read `01-MASTER_PLAN.md` → `02-TECH_STACK.md` → `03-CODEBASE_GUIDE.md`
**Week 2**: Study `04-CRITICAL_KNOWLEDGE.md` thoroughly
**Ongoing**: Daily check of `06-CURRENT_STATE.md` → `07-ACTIVE_TASKS.md`

### Project Manager  
**Weekly**: `01-MASTER_PLAN.md` → `06-CURRENT_STATE.md`
**Monthly**: `05-DETAILED_ROADMAP.md` for milestone tracking
**Planning**: All documents for comprehensive overview

### DevOps/Infrastructure
**Primary**: `02-TECH_STACK.md` → `03-CODEBASE_GUIDE.md`
**Production**: `04-CRITICAL_KNOWLEDGE.md` for deployment patterns

## Maintenance Guidelines

### Document Ownership
- **Strategic (01, 05)**: Project Lead updates monthly
- **Foundation (02, 03, 04)**: Senior Developer updates as architecture evolves  
- **Operational (06, 07)**: Daily developer updates during active work

### Update Triggers
- **After completing any task**: Update progress in `06-CURRENT_STATE.md`
- **After sprint planning**: Update priorities in `07-ACTIVE_TASKS.md`
- **After architecture decisions**: Update `02-TECH_STACK.md` or `03-CODEBASE_GUIDE.md`
- **After learning lessons**: Add to `04-CRITICAL_KNOWLEDGE.md`

### Cross-Reference Maintenance
- All documents link to relevant code files with line numbers
- Task IDs (e.g., ARBI-002) used consistently across documents
- File paths updated when code is moved or refactored

## Integration with Development Workflow

### Git Integration
- Document updates included in feature branch commits
- Task completion requires updating both code and documentation
- Pull requests validate documentation accuracy

### IDE Integration  
- File paths in documentation are clickable in most IDEs
- Task IDs can be used for issue tracking integration
- Code snippets in docs are syntax highlighted

### Automation Opportunities
- Task completion status can be auto-updated from git commits
- Progress percentages can be calculated from task completion
- Cross-references can be validated automatically

## Document Quality Standards

### Content Requirements
- **Actionable**: Every document should enable specific actions
- **Current**: Status documents updated within 24 hours
- **Complete**: New team member can resume work from documentation alone
- **Concise**: Optimize for scanning and quick understanding

### Technical Standards
- Code examples are tested and current
- File paths are verified and up-to-date  
- Performance numbers are based on actual measurements
- Links and references are validated

### Review Process
- Weekly documentation review during team meetings
- Monthly comprehensive review of all documents
- Quarterly architectural alignment review

---/

## Quick Reference Links

### Most Frequently Accessed
- **Current Work**: [`06-CURRENT_STATE.md`](./06-CURRENT_STATE.md)
- **Next Tasks**: [`07-ACTIVE_TASKS.md`](./07-ACTIVE_TASKS.md)
- **Critical Rules**: [`04-CRITICAL_KNOWLEDGE.md`](./04-CRITICAL_KNOWLEDGE.md)

### Complete Documentation Set
1. [`01-MASTER_PLAN.md`](./01-MASTER_PLAN.md) - Project Vision
2. [`02-TECH_STACK.md`](./02-TECH_STACK.md) - Technology Foundation  
3. [`03-CODEBASE_GUIDE.md`](./03-CODEBASE_GUIDE.md) - System Architecture
4. [`04-CRITICAL_KNOWLEDGE.md`](./04-CRITICAL_KNOWLEDGE.md) - Implementation Rules
5. [`05-DETAILED_ROADMAP.md`](./05-DETAILED_ROADMAP.md) - Development Roadmap
6. [`06-CURRENT_STATE.md`](./06-CURRENT_STATE.md) - Current Progress
7. [`07-ACTIVE_TASKS.md`](./07-ACTIVE_TASKS.md) - Implementation Tasks


---

*This documentation system is designed for AI-first development workflow, optimizing for context efficiency and resume capability.*