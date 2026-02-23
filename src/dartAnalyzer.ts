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

function mapSeverity(
  severity: string
): 'error' | 'warning' | 'info' | 'hint' {
  const lower = severity.toLowerCase();
  if (lower === 'error' || lower === 'fatal') return 'error';
  if (lower === 'warning' || lower === 'warn') return 'warning';
  if (lower === 'info' || lower === 'information') return 'info';
  return 'hint';
}

function mapDiagnosticSeverity(
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

function parseIssue(issue: any, workspaceRoot: string): AnalysisIssue {
  const severity = mapSeverity(issue.severity || issue.level);
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

function parseJsonOutput(jsonOutput: any, workspaceRoot: string): AnalysisIssue[] {
  const issues: AnalysisIssue[] = [];
  if (jsonOutput.severity && jsonOutput.code) {
    issues.push(parseIssue(jsonOutput, workspaceRoot));
  } else if (Array.isArray(jsonOutput)) {
    jsonOutput.forEach((issue: any) => issues.push(parseIssue(issue, workspaceRoot)));
  } else if (jsonOutput.diagnostics) {
    jsonOutput.diagnostics.forEach((issue: any) =>
      issues.push(parseIssue(issue, workspaceRoot))
    );
  }
  return issues;
}

async function parseTextOutput(
  workspaceRoot: string,
  analyzer: 'dart' | 'flutter'
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
      const errorMatch = line.match(
        /^(error|warning|info|hint)\s+•\s+(.+?)\s+•\s+(.+?):(\d+):(\d+)/
      );
      if (errorMatch) {
        if (currentIssue) issues.push(currentIssue as AnalysisIssue);
        currentIssue = {
          severity: mapSeverity(errorMatch[1]),
          message: errorMatch[2].trim(),
          file: path.relative(workspaceRoot, errorMatch[3]),
          line: parseInt(errorMatch[4], 10),
          column: parseInt(errorMatch[5], 10),
          code: 'analyzer',
        };
      } else if (currentIssue && line.trim()) {
        currentIssue.message += ' ' + line.trim();
      }
    }
    if (currentIssue) issues.push(currentIssue as AnalysisIssue);
    return issues;
  } catch {
    return getDiagnosticsFromEditor();
  }
}

async function getDiagnosticsFromEditor(): Promise<AnalysisIssue[]> {
  const issues: AnalysisIssue[] = [];
  const diagnostics = vscode.languages.getDiagnostics();
  const workspaceRoot =
    vscode.workspace.workspaceFolders?.[0]?.uri.fsPath ?? '';
  for (const [uri, diags] of diagnostics) {
    if (uri.scheme !== 'file') continue;
    const isDart = uri.fsPath.endsWith('.dart');
    const isPubspec = uri.fsPath.endsWith('pubspec.yaml') || uri.fsPath.endsWith('pubspec.yml');
    if (!isDart && !isPubspec) continue;
    const relativeFile = workspaceRoot
      ? path.relative(workspaceRoot, uri.fsPath)
      : uri.fsPath;
    for (const diagnostic of diags) {
      const severity = mapDiagnosticSeverity(diagnostic.severity);
      let code = 'unknown';
      if (typeof diagnostic.code === 'string') code = diagnostic.code;
      else if (typeof diagnostic.code === 'number') code = String(diagnostic.code);
      else if (diagnostic.code && typeof diagnostic.code === 'object')
        code =
          typeof (diagnostic.code as { value?: string }).value === 'string'
            ? (diagnostic.code as { value: string }).value
            : String((diagnostic.code as { value: unknown }).value);
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

export async function runFlutterAnalyze(
  workspaceRoot: string
): Promise<AnalysisIssue[]> {
  try {
    const { stdout } = await execAsync('flutter analyze --format=json', {
      cwd: workspaceRoot,
      maxBuffer: 10 * 1024 * 1024,
    });
    const jsonOutput = JSON.parse(stdout);
    return parseJsonOutput(jsonOutput, workspaceRoot);
  } catch {
    return parseTextOutput(workspaceRoot, 'flutter').catch(() =>
      getDiagnosticsFromEditor()
    );
  }
}

export async function runDartAnalyze(
  workspaceRoot: string
): Promise<AnalysisIssue[]> {
  try {
    const { stdout } = await execAsync('dart analyze --format=json', {
      cwd: workspaceRoot,
      maxBuffer: 10 * 1024 * 1024,
    });
    const jsonOutput = JSON.parse(stdout);
    return parseJsonOutput(jsonOutput, workspaceRoot);
  } catch {
    return parseTextOutput(workspaceRoot, 'dart').catch(() =>
      getDiagnosticsFromEditor()
    );
  }
}
