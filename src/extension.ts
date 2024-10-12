import * as vscode from 'vscode';
import { getModelHandle } from './modelProvider.js';
const { explainCode } = require('./explainCode');
import { extractKeyValuePairsAndCleanComment, processIncludedFiles, getCommentPatterns, identifyProgrammingLanguage, collectConsecutiveComments, extractQuestionFromMultiLine, findStartOfMultiLineComment } from './utils.js';

// Global LLM model instance
let llmModel;

export function activate(context: vscode.ExtensionContext) {

    // Register the "Copilot Supreme: Activate" command
    let activateCommand = vscode.commands.registerCommand('copilotSupreme.activate', function () {
        vscode.window.showInformationMessage('Copilot Supreme Activated!');
    });
    context.subscriptions.push(activateCommand);

    let explainCommand = vscode.commands.registerCommand('copilotSupreme.explainCode', function () {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const selection = editor.selection;
            const selectedText = editor.document.getText(selection);

            // Call the function from explainCode.js
            explainCode(selectedText);
        }
    });

    context.subscriptions.push(explainCommand);

    // Listener for document changes
    vscode.workspace.onDidChangeTextDocument(async (event) => {
        const editor = vscode.window.activeTextEditor;
        const document = event.document;
        const changes = event.contentChanges;

        let patterns: any;
        if (editor) {
            const languageId = identifyProgrammingLanguage(editor);

            if (!languageId) {
                vscode.window.showErrorMessage(`Unsupported programming language or extension`);
                return;
            }
            patterns = getCommentPatterns(languageId);

            if (!llmModel) {
                llmModel = getModelHandle();
            }
        }


        if (changes.length === 0) { return; }

        const change = changes[0];
        const changedLineText = document.lineAt(change.range.start.line).text.trim();

        // Handle single-line comment
        if (changedLineText.startsWith(patterns.singleLine + ' @!') && change.text.includes('\n')) {
            const question = await collectConsecutiveComments(document, change.range.start.line, patterns.singleLine);
            const { keyValuePairs, cleanedComment: cleanedQuestion } = extractKeyValuePairsAndCleanComment(question);

            const provider = keyValuePairs['provider'] as string;
            const modelName = keyValuePairs['model'] as string;
            const includes = keyValuePairs['include'] as string[];

            let modelHandle;
            if (provider || modelName) {
                modelHandle = getModelHandle(provider, modelName);
            }
            if (question) {
                await fetchCompletion(document, document.getText(), cleanedQuestion, change.range.start, modelHandle, includes);
            }
        }
        // Check for multi-line comment closure
        else if (changedLineText.includes(patterns.multiLineTrigger) && change.text.includes('\n')) {
            const startLine = await findStartOfMultiLineComment(document, change.range.start.line, patterns.multiLineStart, patterns.multiLineEnd);
            if (startLine !== -1) {
                const question = extractQuestionFromMultiLine(document, startLine, change.range.start.line, patterns.multiLineStart, patterns.multiLineEnd);
                if (question) {
                    const { keyValuePairs, cleanedComment: cleanedQuestion } = extractKeyValuePairsAndCleanComment(question);

                    const provider = keyValuePairs['provider'] as string;
                    const modelName = keyValuePairs['model'] as string;
                    const includes = keyValuePairs['include'] as string[];
                    let modelHandle;
                    if (provider || modelName) {
                        modelHandle = getModelHandle(provider, modelName);
                    }
                    if (cleanedQuestion) {
                        await fetchCompletion(document, document.getText(), cleanedQuestion, change.range.start, modelHandle, includes);
                    }
                }
            }
        }
    });
    vscode.window.showInformationMessage('Copilot Supreme Activated');
}

// @! wrap function fetchCompletion in withProgress. Provide clean code only. provider=anthropic

async function fetchCompletion(document: vscode.TextDocument, contextText: string, cleanedQuestion: string, position: vscode.Position, localModel?: any, includes?: string[]) {
    return vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Asking LLM...",
        cancellable: false
    }, async (progress) => {
        try {
            const includesArray: string[] = typeof includes === 'string' ? [includes] : includes;
            const includedFilesContent = await processIncludedFiles(includesArray);
            const messages = [
                {
                    "role": "system",
                    "content": `You are a coding assistant for developers. You are provided with the following inputs:
                              1. Filename - Name of the file being edited, used to identify the programming language.
                              2. Included Files - Content from other files specified by the user for additional information. These files provide additional context or code dependencies that you should consider while generating the response.
                              3. Current Code - The code immediately preceding this request for context.
                              4. Question - The question or help requested by the user related to the current code.
                            Your task is to:
                              1. Understand the user question.
                              2. If the user has asked for README generation:
                                - Return content in markdown format.
                                - Provide clear, concise explanations or descriptions of the code, its purpose, and usage, describe any configuration options for usage.
                              3. If the user has asked for code generation:
                                - Detect the programming language from the file extension.
                                - Return only the necessary code to address the user's request.
                                - Return clean, executable code without comments, explanations, markdown, or any non-executable text.
                                - Returned code MUST NOT be part of string representations.`
                },
                {
                    "role": "user",
                    "content": `FileName: ${vscode.workspace.asRelativePath(document.uri)}
                            ${includedFilesContent ? `Included Files Content:\n${includedFilesContent}\n` : ''}
                            Current-Code: ${contextText}
                            Question: ${cleanedQuestion}`
                }
            ];
            const modelToUse = localModel || llmModel;
            const response = await modelToUse.invoke(messages);
            const completionText = response.content || '';
            if (completionText) {
                const edit = new vscode.WorkspaceEdit();
                edit.insert(document.uri, position.translate(1, 0), `\n${completionText}`);
                await vscode.workspace.applyEdit(edit);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to fetch completion: ${error}`);
        }
    });
}


export function deactivate() { }
