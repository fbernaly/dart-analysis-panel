# Dart Analysis Panel

A VS Code/Cursor extension that provides a custom panel to view Dart/Flutter analysis results, similar to the "Dart Analysis" panel in Android Studio. Displays issues grouped by file with severity indicators and click-to-navigate functionality.

## Features

- **Analysis Panel**: Custom webview panel that displays Dart/Flutter analysis results in an organized, easy-to-read format
- **Grouped by File**: Issues are grouped by file with collapsible sections for better organization
- **Severity Indicators**: Visual indicators for errors, warnings, info, and hints with color coding
- **Click to Navigate**: Click on any issue to jump directly to the file and line number
- **Auto-refresh**: Automatically refreshes analysis when Dart files are saved
- **Manual Refresh**: Refresh button to manually trigger analysis
- **Multiple Analyzers**: Supports both `flutter analyze` and `dart analyze` commands
- **Fallback Support**: Falls back to VSCode diagnostics if command-line analysis fails

## Requirements

- VS Code 1.109.0 or higher (or Cursor)
- Dart SDK or Flutter SDK installed and available in your PATH
- A Dart/Flutter project workspace

## Installation

### Quick Install

**VS Code/Cursor Marketplace:**
1. Open Extensions view (`Cmd+Shift+X` or `Ctrl+Shift+X`)
2. Search for: `Dart Analysis Panel` or `fbernaly.dart-analysis-panel`
3. Click **Install**

**Command Line:**
```bash
# VS Code
code --install-extension fbernaly.dart-analysis-panel

# Cursor
cursor --install-extension fbernaly.dart-analysis-panel
```

## Usage

### Opening the Panel

1. Open the Command Palette (`Cmd+Shift+P` on macOS or `Ctrl+Shift+P` on Windows/Linux)
2. Run the command: **"Dart Analysis: Show Panel"**
3. The panel will open and automatically start analyzing your project

### Commands

- **Dart Analysis: Show Panel** - Opens or reveals the Dart Analysis panel
- **Dart Analysis: Refresh** - Refreshes the analysis results (or opens the panel if not already open)

### Panel Features

- **Summary Bar**: Shows counts of errors, warnings, and info issues at the top
- **File Groups**: Issues are organized by file with collapsible sections
- **Issue Details**: Each issue shows:
  - Severity badge (error/warning/info/hint)
  - Issue code
  - Line and column number
  - Full error message
- **Navigation**: Click any issue to navigate to its location in the code
- **Auto-refresh**: Panel automatically refreshes every 30 seconds and when Dart files are saved

## Extension Settings

This extension does not currently add any VS Code settings.

## Known Issues

None at this time. Please report any issues on the [GitHub repository](https://github.com/fbernaly/dart-analysis-panel).

## Release Notes

See [CHANGELOG.md](./CHANGELOG.md) for detailed release notes.

---

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## For more information

* [VS Code Extension API](https://code.visualstudio.com/api)
* [Dart Analysis Server](https://dart.dev/tools/analysis-server)
* [Flutter Documentation](https://flutter.dev/docs)
* [GitHub Repository](https://github.com/fbernaly/dart-analysis-panel)

**Enjoy!**
