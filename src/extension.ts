import * as vscode from 'vscode';
import { getModelHandle } from './modelProvider.js';

// Set to track enabled files
const enabledFiles = new Set<string>();

export function activate(context: vscode.ExtensionContext) {
    // Command to enable OpenAI suggestions for the current file
    let enableCommand = vscode.commands.registerCommand('extension.enableOpenAISuggestions', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const filePath = editor.document.uri.toString();

            if (!enabledFiles.has(filePath)) {
                // Retrieve API key and model name from the settings
                const config = vscode.workspace.getConfiguration('genai.assistant');
                const apiKey = config.get<string>('apiKey');
                const modelName = config.get<string>('modelName', 'text-davinci-003');

                if (!apiKey) {
                    vscode.window.showErrorMessage('Please set your OpenAI API Key in the VSCode settings.');
                    return;
                }

                enabledFiles.add(filePath);
                vscode.window.showInformationMessage('OpenAI suggestions enabled for this file.');
            }
        }
    });

    context.subscriptions.push(enableCommand);

    // Register an inline completion provider for all file types
    const provider = vscode.languages.registerInlineCompletionItemProvider({ pattern: '**' }, {
        async provideInlineCompletionItems(document: vscode.TextDocument, position: vscode.Position, context: vscode.InlineCompletionContext, token: vscode.CancellationToken) {
            const filePath = document.uri.toString();
            if (!enabledFiles.has(filePath)) return { items: [] };

            // Retrieve the current line
            const currentLineText = document.lineAt(position.line).text;

            // Check if user starts a comment with "@!"
            if (currentLineText.trim().startsWith('// @!') || currentLineText.trim().startsWith('/* @!')) {
                const question = currentLineText.trim().substring(4).trim();
                const contextText = document.getText().substring(0, document.offsetAt(position));
                // Only make the call when user moves to next line or completes the multi-line comment
                if (context.triggerKind === vscode.InlineCompletionTriggerKind.Invoke && question) {
                    await fetchCompletion(document, contextText, question, position);
                }
            }
        }
    });

    context.subscriptions.push(provider);

    // Listener for document changes
    vscode.workspace.onDidChangeTextDocument(async (event) => {
        const document = event.document;
        const filePath = document.uri.toString();

        if (!enabledFiles.has(filePath)) return;

        const changes = event.contentChanges;
        if (changes.length === 0) return;

        const change = changes[0];
        const changedLineText = document.lineAt(change.range.start.line).text;

        // Single-line comment finished
        if (changedLineText.trim().startsWith('// @!') && change.text.includes('\n')) {
            const question = changedLineText.trim().substring(4).trim();
            await fetchCompletion(document, document.getText(), question, change.range.start);
        }
        // Multi-line comment closed
        else if (changedLineText.trim().endsWith('*/') && !change.text.includes('\n')) {
            const multiLineStartLine = change.range.start.line - 1; // Previous line where multi-line comment started
            const question = extractQuestionFromMultiLine(document, multiLineStartLine, change.range.start.line);
            if (question) {
                await fetchCompletion(document, document.getText(), question, change.range.start);
            }
        }
    });
}

function extractQuestionFromMultiLine(document: vscode.TextDocument, startLine: number, endLine: number): string | null {
    let question = '';

    // Iterate over the lines of the multi-line comment
    for (let line = startLine; line <= endLine; line++) {
        const lineText = document.lineAt(line).text;
        if (line === startLine) {
            question += lineText.substring(lineText.indexOf('@!') + 2).trim(); // Start capturing after '@!'
        } else {
            question += lineText.trim();
        }
    }

    return question ? question.trim() : null;
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
