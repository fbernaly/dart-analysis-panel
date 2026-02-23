import * as vscode from 'vscode';
import * as path from 'path';
import {
  AnalysisIssue,
  runFlutterAnalyze,
  runDartAnalyze,
} from './dartAnalyzer';

export const viewId = 'dartAnalysisView';

/** Tree node: either a file (parent) or an issue (leaf) */
type DartNode = FileNode | IssueNode;

class FileNode {
  constructor(
    public readonly file: string,
    public readonly issues: AnalysisIssue[]
  ) {}
}

class IssueNode {
  constructor(public readonly issue: AnalysisIssue) {}
}

function isFileNode(node: DartNode): node is FileNode {
  return node instanceof FileNode;
}

/** Theme-aware icons using built-in codicons (follow IDE theme) */
function severityIcon(severity: AnalysisIssue['severity']): vscode.ThemeIcon {
  const id =
    severity === 'error'
      ? 'error'
      : severity === 'warning'
        ? 'warning'
        : 'info';
  return new vscode.ThemeIcon(id);
}

export class DartAnalysisTreeDataProvider
  implements vscode.TreeDataProvider<DartNode>
{
  private _onDidChangeTreeData = new vscode.EventEmitter<void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private _issues: AnalysisIssue[] = [];
  private _isAnalyzing = false;
  private _selectedIssue: AnalysisIssue | undefined;
  private _treeView: vscode.TreeView<DartNode> | undefined;

  constructor() {}

  setTreeView(treeView: vscode.TreeView<DartNode>) {
    this._treeView = treeView;
    treeView.onDidChangeSelection((e) => {
      const sel = e.selection[0];
      if (sel && sel instanceof IssueNode) {
        this._selectedIssue = sel.issue;
      } else {
        this._selectedIssue = undefined;
      }
    });
  }

  getSelectedIssue(): AnalysisIssue | undefined {
    return this._selectedIssue;
  }

  getTreeItem(element: DartNode): vscode.TreeItem {
    if (element instanceof FileNode) {
      const item = new vscode.TreeItem(
        element.file,
        vscode.TreeItemCollapsibleState.Expanded
      );
      item.description = `${element.issues.length} issue${element.issues.length !== 1 ? 's' : ''}`;
      item.iconPath = new vscode.ThemeIcon('document');
      return item;
    }
    const issue = element.issue;
    const firstLine = issue.message.split(/\r?\n/)[0].trim();
    const label =
      firstLine.length > 60 ? firstLine.slice(0, 57) + '...' : firstLine;
    const item = new vscode.TreeItem(label);
    item.description = `L${issue.line}:${issue.column} • ${issue.code}`;
    item.tooltip = `${issue.severity} • ${issue.code}\n${issue.message}`;
    item.iconPath = severityIcon(issue.severity);
    item.contextValue = 'dartIssue';
    item.command = {
      command: 'dartAnalysisPanel.revealIssue',
      title: '',
      arguments: [
        { file: issue.file, line: issue.line, column: issue.column },
      ],
    };
    return item;
  }

  getChildren(element?: DartNode): DartNode[] {
    if (!element) {
      if (this._issues.length === 0) return [];
      const byFile = new Map<string, AnalysisIssue[]>();
      for (const issue of this._issues) {
        const list = byFile.get(issue.file) ?? [];
        list.push(issue);
        byFile.set(issue.file, list);
      }
      return Array.from(byFile.entries())
        .map(([file, issues]) => new FileNode(file, issues))
        .sort((a, b) => a.file.localeCompare(b.file));
    }
    if (isFileNode(element)) {
      return element.issues
        .slice()
        .sort((a, b) => a.line - b.line || a.column - b.column)
        .map((i) => new IssueNode(i));
    }
    return [];
  }

  async refresh(analyzer: 'dart' | 'flutter' = 'flutter'): Promise<void> {
    if (this._isAnalyzing) return;
    this._isAnalyzing = true;
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders?.length) {
      this._isAnalyzing = false;
      return;
    }
    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    try {
      this._issues =
        analyzer === 'flutter'
          ? await runFlutterAnalyze(workspaceRoot)
          : await runDartAnalyze(workspaceRoot);
      this._onDidChangeTreeData.fire();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      vscode.window.showErrorMessage(`Dart Analysis: ${msg}`);
    } finally {
      this._isAnalyzing = false;
    }
  }

  getIssueCount(): number {
    return this._issues.length;
  }

  getMessage(): string {
    if (this._isAnalyzing) return 'Analyzing...';
    if (this._issues.length === 0) return 'No issues';
    return `Found ${this._issues.length} issue${this._issues.length !== 1 ? 's' : ''}`;
  }
}

export async function openFileAtPosition(
  file: string,
  line: number,
  column: number
): Promise<void> {
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders?.length) return;
  const workspaceRoot = workspaceFolders[0].uri.fsPath;
  const fullPath = path.isAbsolute(file)
    ? file
    : path.join(workspaceRoot, file);
  const uri = vscode.Uri.file(fullPath);
  const document = await vscode.workspace.openTextDocument(uri);
  const editor = await vscode.window.showTextDocument(document);
  const pos = new vscode.Position(line - 1, (column || 1) - 1);
  editor.selection = new vscode.Selection(pos, pos);
  editor.revealRange(
    new vscode.Range(pos, pos),
    vscode.TextEditorRevealType.InCenter
  );
}
