# CleanMyPC 🧹

A professional cross-platform CLI tool for comprehensive system cleanup. Works seamlessly on Windows, macOS, and Linux with intelligent OS detection and safe cleanup operations.

## ✨ Features

### Core Cleanup Tasks
- 🗂️ **Temporary Files**: Removes OS-specific temp files and directories
- 💾 **Cache Files**: Cleans application and system caches
- 🌐 **Browser Caches**: Supports Chrome, Firefox, Edge, and Safari
- 🗑️ **Trash/Recycle Bin**: Empties system trash across all platforms
- 📁 **Downloads Organization**: Sorts files by type into organized folders
- 📊 **Large File Detection**: Finds files larger than configurable threshold (default: 1GB)

### Safety & Control
- 🧪 **Dry Run Mode**: Preview what will be cleaned with `--dry-run`
- ⚙️ **Configurable**: Customize paths, thresholds, and exclusions
- 🛡️ **OS-Safe**: Avoids system files and checks permissions
- 📋 **Detailed Reporting**: Generate cleanup reports in TXT or JSON format

### User Experience
- 🎯 **Interactive Mode**: Guided CLI experience with Inquirer
- 🤖 **Silent Mode**: Perfect for automation with `--silent`
- 🎨 **Colorized Output**: Beautiful CLI with Chalk
- ⚡ **Progress Indicators**: Real-time feedback with Ora spinners


## 📖 Usage

### Interactive Mode (Default)

```bash
npm install
```

```bash
# Development mode (recommended for testing)
npm run dev

# Production mode (after building)
npm run build
npm start

# Or run the built version directly
node dist/cli.js
```

### Non-Interactive Mode with Flags
```bash
# Build first for production use
npm run build

# Dry run (preview only) - ALWAYS TEST WITH THIS FIRST
node dist/cli.js --dry-run

# Clean specific tasks
node dist/cli.js --temp --cache --browsers

# Silent mode for automation
node dist/cli.js --silent --temp --cache

# Generate a report
node dist/cli.js --report cleanup-report.json

# Use custom config
node dist/cli.js --config /path/to/custom-config.json

# Development mode examples (during development)
npm run dev -- --dry-run
npm run dev -- --temp --cache
```

### Available Flags
- `--dry-run, -d`: Show what would be cleaned without performing actions
- `--silent, -s`: Run without prompts (automation-friendly)
- `--debug`: Enable debug logging for troubleshooting
- `--report <path>`: Save cleanup report (.txt or .json)
- `--config <path>`: Use custom configuration file
- `--temp`: Clean temporary files only
- `--cache`: Clean cache files only
- `--browsers`: Clean browser caches only
- `--trash`: Empty trash/recycle bin only
- `--downloads`: Organize downloads folder only
- `--large-files`: Find large files only

## ⚙️ Configuration

CleanMyPC uses a configuration file located at `~/.cleanmypc/config.json`. You can customize:

### File Size Thresholds
```json
{
  "largeFileThreshold": 1073741824  // 1GB in bytes
}
```

### Custom Paths
```json
{
  "customTempPaths": ["/custom/temp/path"],
  "customCachePaths": ["/custom/cache/path"],
  "downloadsPath": "/custom/downloads/path"
}
```

### Exclusions
```json
{
  "exclusions": [
    "important-folder",
    "do-not-delete.txt"
  ]
}
```

### Browser Selection
```json
{
  "browsers": {
    "chrome": true,
    "firefox": true,
    "edge": true,
    "safari": false
  }
}
```

### Downloads Organization
```json
{
  "organizeDownloads": {
    "enabled": true,
    "categories": {
      "Images": [".jpg", ".png", ".gif"],
      "Documents": [".pdf", ".docx", ".txt"],
      "Videos": [".mp4", ".avi", ".mov"]
    }
  }
}
```

## 🏗️ Project Structure

```
src/
├── cli.ts                    # Main CLI entry point
├── CleanupManager.ts         # Core cleanup orchestrator
├── InteractiveMode.ts        # Interactive CLI interface
├── modules/                  # Cleanup task modules
│   ├── BaseCleaner.ts       # Base class for all cleaners
│   ├── TempCleaner.ts       # Temporary files cleanup
│   ├── CacheCleaner.ts      # Cache files cleanup
│   ├── BrowserCleaner.ts    # Browser cache cleanup
│   ├── TrashCleaner.ts      # Trash/recycle bin cleanup
│   ├── DownloadsOrganizer.ts # Downloads folder organization
│   └── LargeFileFinder.ts   # Large file detection
└── utils/                   # Utility classes
    ├── OSDetector.ts        # Operating system detection
    ├── ConfigManager.ts     # Configuration management
    ├── Logger.ts            # Logging utilities
    └── ReportGenerator.ts   # Report generation
```

## 🎯 Platform Support

### Windows
- Temp folders: `%TEMP%`, `%LOCALAPPDATA%\\Temp`, `C:\\Windows\\Temp`
- Browser caches: Chrome, Firefox, Edge
- Recycle Bin: All drives with `$Recycle.Bin`
- System caches: Windows prefetch, software distribution

### macOS
- Temp folders: `/tmp`, `~/Library/Caches`, `/var/tmp`
- Browser caches: Chrome, Firefox, Safari, Edge
- Trash: `~/.Trash`, `/Volumes/*/.Trashes`
- System caches: Library caches, diagnostic reports

### Linux
- Temp folders: `/tmp`, `/var/tmp`, `~/.cache`
- Browser caches: Chrome, Firefox
- Trash: XDG specification (`~/.local/share/Trash`)
- System caches: User and system cache directories

## 🔒 Safety Features

- **Permission Checks**: Validates write access before deletion
- **System File Protection**: Avoids critical system directories
- **Exclusion Patterns**: Configurable file/folder exclusions
- **Age Filtering**: Optional file age limits for deletion
- **Dry Run Preview**: See what will be deleted before action
- **Error Handling**: Graceful handling of access denied scenarios

## 📊 Reporting

Generate detailed cleanup reports in multiple formats:

### Text Report
```
=============================================================
CleanMyPC - Cleanup Report
=============================================================
Generated: 2024-12-07 10:30:00

SUMMARY:
------------------------------
Total files cleaned: 1,234
Total space freed: 2.5 GB
Total files organized: 89
Total errors: 0

DETAILED RESULTS:
------------------------------
TEMP:
  Files deleted: 456
  Space saved: 1.2 GB
...
```

### JSON Report
```json
{
  "timestamp": "2024-12-07T10:30:00.000Z",
  "summary": {
    "totalFiles": 1234,
    "totalSpace": 2684354560,
    "totalOrganized": 89,
    "totalErrors": 0
  },
  "results": [...]
}
```

## 🚦 Development

### Prerequisites
- Node.js 14+ 
- npm or yarn

### Adding New Cleanup Modules

1. Create a new class extending `BaseCleaner`
2. Implement the `clean()` method
3. Add OS-specific logic using `OSDetector`
4. Register in `CleanupManager`
5. Add CLI flag support in `cli.ts`

## 📝 License

ISC License - feel free to use and modify!

## 🤝 Contributing

Contributions welcome! Please ensure:
- TypeScript compilation passes
- Follow existing code patterns
- Test on multiple platforms
- Update documentation

---

**⚠️ Important**: Always test with `--dry-run` before running actual cleanup operations. While CleanMyPC includes safety features, it's always better to preview changes first.
