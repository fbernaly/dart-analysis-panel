import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execAsync = promisify(exec);

export interface AnalysisIssue {
  severity: 'error' | 'warning' | 'info' | 'hint';
  code: string;
  message: string;
  file: string;
  line: number;
  column: number;
}

export class DartAnalysisPanel {
  public static currentPanel: DartAnalysisPanel | undefined;
  public static readonly viewType = 'dartAnalysisView';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];
  private _analysisResults: AnalysisIssue[] = [];
  private _isAnalyzing = false;

  public static createOrShow(extensionUri: vscode.Uri): DartAnalysisPanel | undefined {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    // If we already have a panel, show it
    if (DartAnalysisPanel.currentPanel) {
      DartAnalysisPanel.currentPanel._panel.reveal(column);
      return DartAnalysisPanel.currentPanel;
    }

    // Otherwise, create a new panel
    const panel = vscode.window.createWebviewPanel(
      DartAnalysisPanel.viewType,
      'Dart Analysis',
      column || vscode.ViewColumn.Two,
      {
        enableScripts: true,
        localResourceRoots: [extensionUri],
        retainContextWhenHidden: true,
      }
    );

    DartAnalysisPanel.currentPanel = new DartAnalysisPanel(
      panel,
      extensionUri
    );
    return DartAnalysisPanel.currentPanel;
  }

  public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    DartAnalysisPanel.currentPanel = new DartAnalysisPanel(
      panel,
      extensionUri
    );
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    // Set the webview's initial html content
    this._update();

    // Listen for when the panel is disposed
    // This happens when the user closes the panel or when the panel is closed programmatically
    this._panel.onDidDispose(
      () => this.dispose(),
      null,
      this._disposables
    );

    // Handle messages from the webview
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'refresh':
            await this.refresh('flutter');
            return;
          case 'flutterAnalyze':
            await this.refresh('flutter');
            return;
          case 'openFile':
            if (message.file && message.line) {
              const workspaceFolders = vscode.workspace.workspaceFolders;
              if (workspaceFolders && workspaceFolders.length > 0) {
                const workspaceRoot = workspaceFolders[0].uri.fsPath;
                const fullPath = path.isAbsolute(message.file)
                  ? message.file
                  : path.join(workspaceRoot, message.file);
                const uri = vscode.Uri.file(fullPath);
                const document =
                  await vscode.workspace.openTextDocument(uri);
                const editor = await vscode.window.showTextDocument(document);
                const position = new vscode.Position(
                  message.line - 1,
                  message.column - 1 || 0
                );
                editor.selection = new vscode.Selection(position, position);
                editor.revealRange(
                  new vscode.Range(position, position),
                  vscode.TextEditorRevealType.InCenter
                );
              }
            }
            return;
        }
      },
      null,
      this._disposables
    );

    // Initial refresh
    this.refresh('flutter');
  }

  public async refresh(analyzer: 'dart' | 'flutter' = 'flutter') {
    if (this._isAnalyzing) {
      return;
    }

    this._isAnalyzing = true;
    const analyzerName = analyzer === 'flutter' ? 'Flutter' : 'Dart';
    this._updateStatus(`${analyzerName} Analyzing...`);

    try {
      const workspaceFolders = vscode.workspace.workspaceFolders;
      if (!workspaceFolders || workspaceFolders.length === 0) {
        this._updateStatus('No workspace folder found');
        return;
      }

      const workspaceRoot = workspaceFolders[0].uri.fsPath;
      const analysisResults =
        analyzer === 'flutter'
          ? await this._runFlutterAnalyze(workspaceRoot)
          : await this._runDartAnalyze(workspaceRoot);

      this._analysisResults = analysisResults;
      this._update();
      this._updateStatus(
        `Found ${analysisResults.length} issue${
          analysisResults.length !== 1 ? 's' : ''
        }`
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this._updateStatus(`Error: ${errorMessage}`);
      vscode.window.showErrorMessage(
        `Dart Analysis Error: ${errorMessage}`
      );
    } finally {
      this._isAnalyzing = false;
    }
  }

  private _updateStatus(message: string) {
    this._panel.title = `Dart Analysis - ${message}`;
  }

  private async _runDartAnalyze(
    workspaceRoot: string
  ): Promise<AnalysisIssue[]> {
    try {
      // Try to use dart analyze with JSON output
      const { stdout, stderr } = await execAsync(
        'dart analyze --format=json',
        {
          cwd: workspaceRoot,
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        }
      );

      if (stderr && !stdout) {
        // Fallback to regular dart analyze
        return await this._parseTextOutput(workspaceRoot, 'dart');
      }

      try {
        const jsonOutput = JSON.parse(stdout);
        return this._parseJsonOutput(jsonOutput, workspaceRoot);
      } catch {
        // If JSON parsing fails, fall back to text parsing
        return await this._parseTextOutput(workspaceRoot, 'dart');
      }
      } catch (error) {
      // If dart analyze fails, try parsing from diagnostics
      return await this._getDiagnosticsFromEditor();
    }
  }

  private async _runFlutterAnalyze(
    workspaceRoot: string
  ): Promise<AnalysisIssue[]> {
    try {
      // Try to use flutter analyze with JSON output
      const { stdout, stderr } = await execAsync(
        'flutter analyze --format=json',
        {
          cwd: workspaceRoot,
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        }
      );

      if (stderr && !stdout) {
        // Fallback to regular flutter analyze
        return await this._parseTextOutput(workspaceRoot, 'flutter');
      }

      try {
        const jsonOutput = JSON.parse(stdout);
        return this._parseJsonOutput(jsonOutput, workspaceRoot);
      } catch {
        // If JSON parsing fails, fall back to text parsing
        return await this._parseTextOutput(workspaceRoot, 'flutter');
      }
      } catch (error) {
      // If flutter analyze fails, try parsing from diagnostics
      return await this._getDiagnosticsFromEditor();
    }
  }

  private _parseJsonOutput(
    jsonOutput: any,
    workspaceRoot: string
  ): AnalysisIssue[] {
    const issues: AnalysisIssue[] = [];

    if (jsonOutput.severity && jsonOutput.code) {
      // Single issue format
      issues.push(this._parseIssue(jsonOutput, workspaceRoot));
    } else if (Array.isArray(jsonOutput)) {
      // Array of issues
      jsonOutput.forEach((issue) => {
        issues.push(this._parseIssue(issue, workspaceRoot));
      });
    } else if (jsonOutput.diagnostics) {
      // Diagnostics format
      jsonOutput.diagnostics.forEach((issue: any) => {
        issues.push(this._parseIssue(issue, workspaceRoot));
      });
    }

    return issues;
  }

  private _parseIssue(issue: any, workspaceRoot: string): AnalysisIssue {
    const severity = this._mapSeverity(issue.severity || issue.level);
    const file = issue.location?.file || issue.file || '';
    const relativeFile = file.startsWith(workspaceRoot)
      ? path.relative(workspaceRoot, file)
      : file;

    return {
      severity,
      code: issue.code || issue.errorCode || 'unknown',
      message: issue.message || issue.problemMessage || '',
      file: relativeFile,
      line: issue.location?.startLine || issue.line || 1,
      column: issue.location?.startColumn || issue.column || 1,
    };
  }

  private _mapSeverity(
    severity: string
  ): 'error' | 'warning' | 'info' | 'hint' {
    const lower = severity.toLowerCase();
    if (lower === 'error' || lower === 'fatal') {
      return 'error';
    }
    if (lower === 'warning' || lower === 'warn') {
      return 'warning';
    }
    if (lower === 'info' || lower === 'information') {
      return 'info';
    }
    return 'hint';
  }

  private async _parseTextOutput(
    workspaceRoot: string,
    analyzer: 'dart' | 'flutter' = 'dart'
  ): Promise<AnalysisIssue[]> {
    try {
      const command = analyzer === 'flutter' ? 'flutter analyze' : 'dart analyze';
      const { stdout } = await execAsync(command, {
        cwd: workspaceRoot,
        maxBuffer: 10 * 1024 * 1024,
      });

      const issues: AnalysisIssue[] = [];
      const lines = stdout.split('\n');

      let currentIssue: Partial<AnalysisIssue> | null = null;

      for (const line of lines) {
        // Match patterns like: "error • message • file:line:column"
        const errorMatch = line.match(
          /^(error|warning|info|hint)\s+•\s+(.+?)\s+•\s+(.+?):(\d+):(\d+)/
        );
        if (errorMatch) {
          if (currentIssue) {
            issues.push(currentIssue as AnalysisIssue);
          }
          currentIssue = {
            severity: this._mapSeverity(errorMatch[1]),
            message: errorMatch[2].trim(),
            file: path.relative(workspaceRoot, errorMatch[3]),
            line: parseInt(errorMatch[4], 10),
            column: parseInt(errorMatch[5], 10),
            code: 'analyzer',
          };
        } else if (currentIssue && line.trim()) {
          // Append to message if it's a continuation
          currentIssue.message += ' ' + line.trim();
        }
      }

      if (currentIssue) {
        issues.push(currentIssue as AnalysisIssue);
      }

      return issues;
    } catch {
      return await this._getDiagnosticsFromEditor();
    }
  }

  private async _getDiagnosticsFromEditor(): Promise<AnalysisIssue[]> {
    const issues: AnalysisIssue[] = [];
    const diagnostics = vscode.languages.getDiagnostics();

    for (const [uri, diags] of diagnostics) {
      if (uri.scheme !== 'file' || !uri.fsPath.endsWith('.dart')) {
        continue;
      }

      const workspaceFolders = vscode.workspace.workspaceFolders;
      const workspaceRoot =
        workspaceFolders && workspaceFolders.length > 0
          ? workspaceFolders[0].uri.fsPath
          : '';

      const relativeFile = workspaceRoot
        ? path.relative(workspaceRoot, uri.fsPath)
        : uri.fsPath;

      for (const diagnostic of diags) {
        const severity = this._mapDiagnosticSeverity(diagnostic.severity);
        let code = 'unknown';
        if (typeof diagnostic.code === 'string') {
          code = diagnostic.code;
        } else if (typeof diagnostic.code === 'number') {
          code = String(diagnostic.code);
        } else if (diagnostic.code && typeof diagnostic.code === 'object') {
          code =
            typeof diagnostic.code.value === 'string'
              ? diagnostic.code.value
              : String(diagnostic.code.value);
        }
        issues.push({
          severity,
          code,
          message: diagnostic.message,
          file: relativeFile,
          line: diagnostic.range.start.line + 1,
          column: diagnostic.range.start.character + 1,
        });
      }
    }

    return issues;
  }

  private _mapDiagnosticSeverity(
    severity: vscode.DiagnosticSeverity
  ): 'error' | 'warning' | 'info' | 'hint' {
    switch (severity) {
      case vscode.DiagnosticSeverity.Error:
        return 'error';
      case vscode.DiagnosticSeverity.Warning:
        return 'warning';
      case vscode.DiagnosticSeverity.Information:
        return 'info';
      case vscode.DiagnosticSeverity.Hint:
        return 'hint';
      default:
        return 'info';
    }
  }

  public dispose() {
    DartAnalysisPanel.currentPanel = undefined;

    // Clean up our resources
    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }

  private _update() {
    const webview = this._panel.webview;
    this._panel.webview.html = this._getHtmlForWebview(webview);
  }

  private _getHtmlForWebview(webview: vscode.Webview): string {
    const issues = this._analysisResults;

    // Group issues by severity
    const errors = issues.filter((i) => i.severity === 'error');
    const warnings = issues.filter((i) => i.severity === 'warning');
    const infos = issues.filter((i) => i.severity === 'info');
    const hints = issues.filter((i) => i.severity === 'hint');

    // Group by file
    const issuesByFile = new Map<string, AnalysisIssue[]>();
    issues.forEach((issue) => {
      const fileIssues = issuesByFile.get(issue.file) || [];
      fileIssues.push(issue);
      issuesByFile.set(issue.file, fileIssues);
    });

    const fileGroups = Array.from(issuesByFile.entries())
      .map(([file, fileIssues]) => ({
        file,
        issues: fileIssues.sort((a, b) => a.line - b.line),
      }))
      .sort((a, b) => a.file.localeCompare(b.file));

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dart Analysis</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 10px;
        }
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid var(--vscode-panel-border);
        }
        .summary {
            display: flex;
            gap: 15px;
            flex-wrap: wrap;
        }
        .summary-item {
            display: flex;
            align-items: center;
            gap: 5px;
            padding: 5px 10px;
            border-radius: 3px;
            font-size: 12px;
        }
        .summary-item.error {
            background-color: var(--vscode-inputValidation-errorBackground);
            color: var(--vscode-inputValidation-errorForeground);
        }
        .summary-item.warning {
            background-color: var(--vscode-inputValidation-warningBackground);
            color: var(--vscode-inputValidation-warningForeground);
        }
        .summary-item.info {
            background-color: var(--vscode-inputValidation-infoBackground);
            color: var(--vscode-inputValidation-infoForeground);
        }
        .refresh-btn {
            padding: 5px 10px;
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 3px;
            cursor: pointer;
            font-size: 12px;
        }
        .refresh-btn:hover {
            background-color: var(--vscode-button-hoverBackground);
        }
        .file-group {
            margin-bottom: 20px;
        }
        .file-header {
            font-weight: bold;
            padding: 8px;
            background-color: var(--vscode-list-hoverBackground);
            cursor: pointer;
            user-select: none;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .file-header:hover {
            background-color: var(--vscode-list-activeSelectionBackground);
        }
        .file-header::before {
            content: '▶';
            margin-right: 5px;
            transition: transform 0.2s;
        }
        .file-header.collapsed::before {
            transform: rotate(-90deg);
        }
        .file-issues {
            display: block;
        }
        .file-issues.collapsed {
            display: none;
        }
        .issue {
            padding: 8px 8px 8px 30px;
            border-left: 3px solid transparent;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        .issue:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        .issue.error {
            border-left-color: var(--vscode-inputValidation-errorBorder);
        }
        .issue.warning {
            border-left-color: var(--vscode-inputValidation-warningBorder);
        }
        .issue.info {
            border-left-color: var(--vscode-inputValidation-infoBorder);
        }
        .issue.hint {
            border-left-color: var(--vscode-inputValidation-infoBorder);
            opacity: 0.8;
        }
        .issue-header {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 4px;
        }
        .issue-severity {
            font-size: 11px;
            font-weight: bold;
            text-transform: uppercase;
            padding: 2px 6px;
            border-radius: 3px;
        }
        .issue-severity.error {
            background-color: var(--vscode-inputValidation-errorBackground);
            color: var(--vscode-inputValidation-errorForeground);
        }
        .issue-severity.warning {
            background-color: var(--vscode-inputValidation-warningBackground);
            color: var(--vscode-inputValidation-warningForeground);
        }
        .issue-severity.info {
            background-color: var(--vscode-inputValidation-infoBackground);
            color: var(--vscode-inputValidation-infoForeground);
        }
        .issue-code {
            font-family: var(--vscode-editor-font-family);
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
        }
        .issue-location {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin-left: auto;
        }
        .issue-message {
            font-size: 12px;
            color: var(--vscode-foreground);
            line-height: 1.4;
        }
        .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: var(--vscode-descriptionForeground);
        }
        .empty-state-icon {
            font-size: 48px;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="summary">
            <div class="summary-item error">
                <span>${errors.length}</span>
                <span>Error${errors.length !== 1 ? 's' : ''}</span>
            </div>
            <div class="summary-item warning">
                <span>${warnings.length}</span>
                <span>Warning${warnings.length !== 1 ? 's' : ''}</span>
            </div>
            <div class="summary-item info">
                <span>${infos.length + hints.length}</span>
                <span>Info</span>
            </div>
        </div>
        <button class="refresh-btn" onclick="refresh()">Flutter Analyze</button>
    </div>
    ${
      issues.length === 0
        ? `<div class="empty-state">
            <div class="empty-state-icon">✓</div>
            <div>No analysis issues found</div>
        </div>`
        : fileGroups
            .map(
              (group) => `
        <div class="file-group">
            <div class="file-header" onclick="toggleFile('${this._escapeHtml(
              group.file
            )}')">
                <span>${this._escapeHtml(group.file)}</span>
                <span>${group.issues.length} issue${
                group.issues.length !== 1 ? 's' : ''
              }</span>
            </div>
            <div class="file-issues" id="file-${this._escapeHtml(
              group.file
            )}">
                ${group.issues
                  .map(
                    (issue) => `
                <div class="issue ${issue.severity}" onclick="openFile('${this._escapeHtml(
                      group.file
                    )}', ${issue.line}, ${issue.column})">
                    <div class="issue-header">
                        <span class="issue-severity ${issue.severity}">${issue.severity}</span>
                        <span class="issue-code">${this._escapeHtml(
                          issue.code
                        )}</span>
                        <span class="issue-location">Line ${issue.line}:${issue.column}</span>
                    </div>
                    <div class="issue-message">${this._escapeHtml(
                      issue.message
                    )}</div>
                </div>
                `
                  )
                  .join('')}
            </div>
        </div>
        `
            )
            .join('')
    }
    <script>
        const vscode = acquireVsCodeApi();
        
        function refresh() {
            vscode.postMessage({ command: 'refresh' });
        }
        
        function toggleFile(file) {
            const element = document.getElementById('file-' + file);
            const header = element.previousElementSibling;
            if (element) {
                element.classList.toggle('collapsed');
                header.classList.toggle('collapsed');
            }
        }
        
        function openFile(file, line, column) {
            vscode.postMessage({
                command: 'openFile',
                file: file,
                line: line,
                column: column
            });
        }
        
        // Auto-refresh every 30 seconds
        setInterval(refresh, 30000);
    </script>
</body>
</html>`;
  }

  private _escapeHtml(text: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}
