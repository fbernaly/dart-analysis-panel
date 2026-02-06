# Change Log

All notable changes to the "dart-analysis-panel" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

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