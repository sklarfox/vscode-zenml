import * as vscode from 'vscode';
import { LSClient } from '../../services/LSClient';
import { findFirstLineNumber } from '../../common/utilities';
import fs from 'fs/promises';
import { JsonObject } from '../../views/panel/panelView/PanelTreeItem';
import { integer } from 'vscode-languageclient';
// import { StepData } from '../../types/PipelineTypes';

export default new (class AIStepFixer {
  private codeRecommendations: {
    filePath: string;
    code: string[];
    sourceCode: string;
    currentCodeIndex: integer;
  }[] = [];
  /**
   * name
   */
  public async createVirtualDocument(id: string, content: string) {
    const provider = new (class implements vscode.TextDocumentContentProvider {
      provideTextDocumentContent(uri: vscode.Uri): string {
        return Array.isArray(content) ? content[0] : content;
        // return chatCompletion.choices[0].message.content || 'Something went wrong';
      }
    })();

    vscode.workspace.registerTextDocumentContentProvider('fix-my-pipeline', provider);
    const uri = vscode.Uri.parse('fix-my-pipeline:' + id + '.md');
    await vscode.workspace.openTextDocument(uri);

    vscode.commands.executeCommand('markdown.showPreviewToSide', uri);

    return uri;
  }

  public createCodeRecommendation(filePath: string, code: string[], sourceCode: string) {
    this.codeRecommendations.push({ filePath, code, sourceCode, currentCodeIndex: 0 });
    this.editStepFile(filePath, code[0], sourceCode);
  }

  public async updateCodeRecommendation(filePath: string) {
    const rec = this.codeRecommendations.find(rec => rec.filePath === filePath);
    if (!rec) return;

    this.editStepFile(
      filePath,
      rec.code[rec.currentCodeIndex + 1 < rec.code.length ? rec.currentCodeIndex + 1 : 0],
      rec.sourceCode,
      false
    );
  }

  private async editStepFile(
    filePath: string,
    newContent: string,
    oldContent: string,
    open = true
  ) {
    const fileContents = await fs.readFile(filePath, { encoding: 'utf-8' });
    // TODO update to throw error if oldContent is not found in fileContents
    const firstLine = new vscode.Position(findFirstLineNumber(fileContents, oldContent) || 0, 0);
    const lastLine = new vscode.Position(firstLine.line + oldContent.split('\n').length, 0);
    const oldRange = new vscode.Range(firstLine, lastLine);
    const fileUri = vscode.Uri.file(filePath);

    const edit = new vscode.WorkspaceEdit();
    edit.replace(fileUri, oldRange, newContent);

    return vscode.workspace.applyEdit(edit).then(async success => {
      if (success && open) {
        vscode.commands.executeCommand('workbench.files.action.compareWithSaved', fileUri);
      } else if (!success) {
        // TODO proper error handling
        vscode.window.showInformationMessage('Error!');
      }
    });
  }
})();