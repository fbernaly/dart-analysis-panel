import * as vscode from 'vscode';
import { DartAnalysisPanel } from './dartAnalysisPanel';

export function activate(context: vscode.ExtensionContext) {
  console.log('Dart Analysis Panel extension is now active');

  // Register commands
  const showCommand = vscode.commands.registerCommand(
    'dartAnalysisPanel.show',
    () => {
      DartAnalysisPanel.createOrShow(context.extensionUri);
    }
  );

  const refreshCommand = vscode.commands.registerCommand(
    'dartAnalysisPanel.refresh',
    () => {
      if (DartAnalysisPanel.currentPanel) {
        DartAnalysisPanel.currentPanel.refresh('flutter');
      } else {
        DartAnalysisPanel.createOrShow(context.extensionUri);
      }
    }
  );

  context.subscriptions.push(showCommand, refreshCommand);

  // Auto-refresh when documents are saved
  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument(async (document) => {
      if (document.languageId === 'dart' && DartAnalysisPanel.currentPanel) {
        await DartAnalysisPanel.currentPanel.refresh('flutter');
      }
    })
  );
}

export function deactivate() {}
