# Change Log

All notable changes to the "dart-analysis-panel" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [0.0.3] - 2026-02-23

### Added

- **Sidebar panel**: Dedicated "Dart Analysis" view in the Activity Bar with a native tree view (replaces the webview panel)
- **Theme-aware UI**: Uses the IDE's theme for icons, colors, and fonts; works in light, dark, and high contrast
- **Quick Fix (⌘.)**: Per-issue action to run the editor's Quick Fix at that location (e.g. "Use cascade", "Use logging")
- **View Problem**: Opens the Problems panel and focuses the same issue (syncs selection when possible)
- **First line in tree**: Each issue shows the first line of the message in the tree; full text is in the tooltip
- **Dart + pubspec**: Shows issues from `.dart` files and `pubspec.yaml` / `pubspec.yml` (e.g. "Dependencies not sorted")
- **Auto-run**: Analysis runs automatically the first time you open the panel
- **Auto-update on edit**: Panel refreshes when you save or edit relevant files, with debounced refresh (~1.5s) after typing stops
- **Activity Bar icon**: Custom icon for the Dart Analysis view container

### Changed

- **Refresh triggers**: Auto-update now runs on save and on edit for `.dart`, `pubspec.yaml` / `pubspec.yml`, and `analysis_options.yaml` (replaces previous 30-second interval and save-only behavior)
- **Command**: "Show Panel" renamed to "Show Dart Analysis"
- **Architecture**: Analysis logic moved to `dartAnalyzer.ts`; tree view implemented in `dartAnalysisTree.ts`

### Removed

- Custom webview panel (replaced by native tree view)
- Summary bar and 30-second auto-refresh (replaced by file-based and debounced refresh)

## [0.0.2] - 2026-02-06

### Fixed

- Lowered minimum VS Code version requirement from ^1.109.0 to ^1.74.0 for better compatibility with Cursor and older VS Code versions

## [0.0.1] - 2026-02-06

### Added

- Initial release of Dart Analysis Panel extension
- Custom webview panel to display Dart/Flutter analysis results
- Support for `flutter analyze` and `dart analyze` commands
- JSON and text output parsing
- Fallback to VSCode diagnostics when command-line analysis fails
- Issues grouped by file with collapsible sections
- Severity indicators (error, warning, info, hint)
- Click-to-navigate functionality for issues
- Auto-refresh on file save
- Manual refresh command
- Summary bar showing issue counts
- Auto-refresh every 30 seconds