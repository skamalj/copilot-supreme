import * as vscode from 'vscode';
import { getModelHandle } from './modelProvider.js';
import { identifyProgrammingLanguage } from './utils.js';

// Global LLM model instance
let llmModel;

export function activate(context: vscode.ExtensionContext) {
    let enableCommand = vscode.commands.registerCommand('extension.enableOpenAISuggestions', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const languageId = identifyProgrammingLanguage(editor);

            if (!languageId) {
                vscode.window.showErrorMessage(`Unsupported programming language: ${editor.document.languageId}`);
                return;
            }
            llmModel = getModelHandle();
        }
    });

    context.subscriptions.push(enableCommand);

    // Listener for document changes
    vscode.workspace.onDidChangeTextDocument(async (event) => {
        const document = event.document;
        const changes = event.contentChanges;

        if (changes.length === 0) {return;}

        const change = changes[0];
        const changedLineText = document.lineAt(change.range.start.line).text.trim();

        // Handle single-line comment
        if (changedLineText.startsWith('// @!') && change.text.includes('\n')) {
            const question = changedLineText.substring(4).trim();
            await fetchCompletion(document, document.getText(), question, change.range.start);
        }
        // Check for multi-line comment closure
        else if (changedLineText === '*/') {
            const startLine = await findStartOfMultiLineComment(document, change.range.start.line);
            if (startLine !== -1) {
                // Only fetch completion if the comment starts with /* @!            
                if (document.lineAt(startLine).text.includes('/* @!')) {
                    const question = extractQuestionFromMultiLine(document, startLine, change.range.start.line);
                    if (question) {
                        await fetchCompletion(document, document.getText(), question, change.range.start);
                    }
                }
            }
        }
    });
}

async function findStartOfMultiLineComment(document: vscode.TextDocument, endLine: number): Promise<number> {
    // Scan backwards to find the start of the multi-line comment
    for (let line = endLine; line >= 0; line--) {
        const lineText = document.lineAt(line).text.trim();
        if (lineText.endsWith('/*') || lineText.endsWith('/* @!')) {
            return line; // Return the line number where the comment starts
        }
        if (lineText.includes('*/')) {
            break; // Exit if we reach a closing comment without finding the opening
        }
    }
    return -1; // Not found
}

function extractQuestionFromMultiLine(document: vscode.TextDocument, startLine: number, endLine: number): string | null {
    let question = '';

    // Iterate over the lines of the multi-line comment
    for (let line = startLine; line <= endLine; line++) {
        const lineText = document.lineAt(line).text;
        if (line === startLine) {
            // Start capturing after '@!' or '/*'
            const index = lineText.indexOf('@!');
            question += index !== -1 ? lineText.substring(index + 2).trim() : lineText.trim();
        } else {
            question += lineText.trim() + ' '; // Append subsequent lines
        }
    }

    return question ? question.trim() : null; // Return the full question
}

async function fetchCompletion(document: vscode.TextDocument, contextText: string, question: string, position: vscode.Position) {
    try {
        const model = getModelHandle();
        const messages = [
            {
                "role": "system",
                "content": `You are a coding assistant for developers. You are provided with the following inputs:
                              1. Filename - Name of the file being edited, used to identify the programming language.
                              2. Current Code - The code immediately preceding this request for context.
                              3. Question - The question or help requested by the user related to the current code.
                            Your task is to:
                              - Detect the programming language from the file extension.
                              - ONLY generate executable code in response.
                              - DO NOT include any comments, explanations, or non-executable text.
                              - If the requested code can be directly inferred from the question, generate the relevant code only.`
            },
            {
                "role": "user",
                "content": `FileName: ${vscode.workspace.asRelativePath(document.uri)}
                            Current-Code: ${contextText}
                            Question: ${question}`
            }
        ];

        const response = await model.invoke(messages);
        const completionText = response.content || '';

        if (completionText) {
            const edit = new vscode.WorkspaceEdit();
            edit.insert(document.uri, position.translate(1, 0), `\n${completionText}`);
            await vscode.workspace.applyEdit(edit);
        }
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to fetch completion: ${error}`);
    }
}

export function deactivate() { }
