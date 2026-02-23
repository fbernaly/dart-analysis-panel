import * as vscode from 'vscode';
import {
  DartAnalysisTreeDataProvider,
  viewId,
  openFileAtPosition,
} from './dartAnalysisTree';

export function activate(context: vscode.ExtensionContext) {
  const treeProvider = new DartAnalysisTreeDataProvider();

  const treeView = vscode.window.createTreeView(viewId, {
    treeDataProvider: treeProvider,
    showCollapseAll: true,
  });
  treeProvider.setTreeView(treeView);

  const updateMessage = () => {
    treeView.message = treeProvider.getMessage();
  };
  treeView.onDidChangeVisibility((e) => {
    if (e.visible) updateMessage();
  });

  context.subscriptions.push(treeView);

  context.subscriptions.push(
    vscode.commands.registerCommand('dartAnalysisPanel.show', () => {
      vscode.commands.executeCommand('workbench.view.extension.dart-analysis-panel');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('dartAnalysisPanel.refresh', async () => {
      await treeProvider.refresh('flutter');
      updateMessage();
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand(
      'dartAnalysisPanel.revealIssue',
      async (args: { file: string; line: number; column: number }) => {
        if (args?.file != null && args?.line != null) {
          await openFileAtPosition(args.file, args.line, args.column ?? 1);
        }
      }
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('dartAnalysisPanel.quickFix', async () => {
      const issue = treeProvider.getSelectedIssue();
      if (!issue) return;
      await openFileAtPosition(issue.file, issue.line, issue.column);
      await new Promise((r) => setTimeout(r, 100));
      await vscode.commands.executeCommand('editor.action.quickFix');
    })
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('dartAnalysisPanel.viewProblem', async () => {
      const issue = treeProvider.getSelectedIssue();
      if (issue) {
        await openFileAtPosition(issue.file, issue.line, issue.column);
        // Sync Problems panel to the problem at current editor position (current file only):
        // cycle next then prev so when we open the panel it highlights this problem
        await vscode.commands.executeCommand('editor.action.marker.next');
        await vscode.commands.executeCommand('editor.action.marker.prev');
        await vscode.commands.executeCommand(
          'workbench.panel.markers.view.focus'
        );
      } else {
        await vscode.commands.executeCommand(
          'workbench.panel.markers.view.focus'
        );
      }
    })
  );

  const shouldRefreshForFile = (uri: vscode.Uri): boolean => {
    const p = uri.fsPath;
    return (
      p.endsWith('.dart') ||
      p.endsWith('pubspec.yaml') ||
      p.endsWith('pubspec.yml') ||
      p.endsWith('analysis_options.yaml')
    );
  };

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async (document) => {
      if (shouldRefreshForFile(document.uri)) {
        await treeProvider.refresh('flutter');
        updateMessage();
      }
    })
  );

  let changeDebounceTimer: ReturnType<typeof setTimeout> | undefined;
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      if (!shouldRefreshForFile(e.document.uri)) return;
      if (e.document.uri.scheme !== 'file') return;
      if (changeDebounceTimer) clearTimeout(changeDebounceTimer);
      changeDebounceTimer = setTimeout(async () => {
        changeDebounceTimer = undefined;
        await treeProvider.refresh('flutter');
        updateMessage();
      }, 1500);
    })
  );

  context.subscriptions.push({
    dispose() {
      if (changeDebounceTimer) clearTimeout(changeDebounceTimer);
    },
  });

  // Initial load
  treeProvider.refresh('flutter').then(updateMessage);
}

export function deactivate() {}
