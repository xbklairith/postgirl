# CLAUDE COMMANDS

## Custom Claude Code Commands for Postgirl Project

### `/wtf` - What's The Flow (Enhanced Debug Command)

**Purpose:** Comprehensive debug analysis with enhanced "sugar" formatting and deep analytical insights.

**Usage:** 
```
/wtf [optional context]
```

**What it does:**
- Echoes received prompt with detailed analysis
- Provides meta-cognitive reasoning about user intent
- Analyzes behavioral patterns and project context
- Offers predictive insights about next steps
- Writes comprehensive debug log to DEBUG.md

**Output Includes:**
- 🍬 Raw prompt analysis with character/word counts
- 🔍 Enhanced message characteristics breakdown
- 🧠 Contextual intelligence and pattern recognition
- ⚡ System state snapshot (project status, active tasks)
- 🎯 Response strategy and reasoning
- 💡 Technical observations and insights
- 🚀 Predictive analysis of user intentions
- 🤔 Meta-cognitive self-assessment

**Examples:**

```bash
# Basic debug
/wtf

# With context
/wtf checking import system status

# Testing specific functionality
/wtf analyzing tab system performance
```

**Implementation:**
The `/wtf` command triggers Claude Code to:
1. Capture and analyze the full prompt
2. Apply enhanced formatting with emojis and structure
3. Provide deep analytical reasoning
4. Update DEBUG.md with comprehensive logging
5. Maintain session context and project awareness

**Integration with Postgirl:**
- Monitors project status (96% complete, import/export phase)
- Tracks active tasks and documentation updates
- Provides insights relevant to current development focus
- Maintains awareness of Git-first architecture and goals

**Debug Output Location:**
All `/wtf` command outputs are automatically logged to:
- `DEBUG.md` - Main debug log with timestamps
- Console output with enhanced formatting
- Context-aware project status updates

---

## Implementation Notes

This command leverages Claude Code's:
- Advanced pattern recognition
- Context retention across sessions  
- Meta-cognitive analysis capabilities
- File system integration for persistent logging
- Project-specific knowledge base

Perfect for debugging complex development scenarios, understanding AI reasoning, and maintaining detailed interaction logs during the Postgirl development process.