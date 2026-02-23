# Dart Analysis Panel

A VS Code/Cursor extension that shows Dart/Flutter analysis results in a **sidebar panel**, similar to the Dart Analysis view in Android Studio. Uses the native tree view and your IDE theme—no custom styling.

## Features

- **Sidebar panel**: Dedicated "Dart Analysis" view in the Activity Bar; issues shown in a tree grouped by file.
- **Theme-aware**: Uses the IDE’s theme (icons, colors, fonts); works in light, dark, and high contrast.
- **Click to navigate**: Click an issue to jump to the file and line.
- **Quick Fix (⌘.)**: Per-issue button to run the editor’s Quick Fix at that location (e.g. “Use cascade”, “Use logging”). If no quick fix is available, shows an informational message.
- **View Problem**: Opens the Problems panel and focuses the same issue there (syncs selection when possible).
- **First line only**: Each issue shows the first line of the message in the tree; full text is in the tooltip.
- **Dart + pubspec**: Shows issues from `.dart` files and `pubspec.yaml` / `pubspec.yml` (e.g. “Dependencies not sorted”).
- **Auto-run**: Analysis runs automatically the first time you open the panel.
- **Auto-update**: The panel refreshes when you **save** or **edit** relevant files:
  - **On save**: `.dart`, `pubspec.yaml` / `pubspec.yml`, `analysis_options.yaml`
  - **On edit**: Same files; refresh runs about 1.5 seconds after you stop typing (debounced)
- **Refresh**: Toolbar button to run analysis on demand.
- **Fallback**: If `flutter analyze` / `dart analyze` isn’t available, uses VS Code’s diagnostics (same as the Problems view).

## Requirements

- VS Code 1.74.0 or higher (or Cursor)
- Dart SDK or Flutter SDK in your PATH (optional; falls back to editor diagnostics)
- A Dart/Flutter workspace

## Installation

**From Marketplace**

1. Open Extensions (`Cmd+Shift+X` / `Ctrl+Shift+X`)
2. Search for **Dart Analysis Panel** or `fbernaly.dart-analysis-panel`
3. Click **Install**

**From command line**

```bash
code --install-extension fbernaly.dart-analysis-panel
# or
cursor --install-extension fbernaly.dart-analysis-panel
```

## Usage

1. Click the **Dart Analysis** icon in the Activity Bar (left sidebar).
2. Open the **Analysis** view; it will run analysis the first time it becomes visible.
3. Expand file nodes to see issues; click an issue to go to that location.
4. Use **Quick Fix** (lightbulb) when a fix is available, or **View Problem** to open the Problems panel on that issue.
5. Use the refresh icon in the view title to run analysis on demand. The list also updates when you save or stop editing Dart/pubspec/analysis_options files.

### Commands

- **Dart Analysis: Show Dart Analysis** – Focus the Dart Analysis sidebar.
- **Dart Analysis: Refresh** – Run analysis and update the view.

## Extension settings

This extension does not add any settings.

## Known issues

None at this time. Issues can be reported on the [GitHub repository](https://github.com/fbernaly/dart-analysis-panel).

## Release notes

See [CHANGELOG.md](./CHANGELOG.md) for version history.

---

## Contributing

Contributions are welcome via Pull Requests on the [GitHub repository](https://github.com/fbernaly/dart-analysis-panel).

## Links

- [VS Code Extension API](https://code.visualstudio.com/api)
- [Dart Analysis](https://dart.dev/tools/analysis-server)
- [Flutter](https://flutter.dev/docs)
