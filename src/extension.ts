import * as vscode from 'vscode';
import { getModelHandle } from './modelProvider.js';
import { processIncludedFiles, getCommentPatterns, identifyProgrammingLanguage, collectConsecutiveComments, extractProviderAndModel, extractQuestionFromMultiLine, findStartOfMultiLineComment } from './utils.js';

// Global LLM model instance
let llmModel;
const contexts = new Map(); // To store context for each document

export function activate(context: vscode.ExtensionContext) {
    let enableCommand = vscode.commands.registerCommand('extension.activateLLMCompletion', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const languageId = identifyProgrammingLanguage(editor);

            if (!languageId) {
                vscode.window.showErrorMessage(`Unsupported programming language: ${editor.document.languageId}`);
                return;
            }
            const patterns = getCommentPatterns(languageId);
            llmModel = getModelHandle();
            // Set the context for the current document
            contexts.set(editor.document.uri.toString(), {
                patterns: patterns
            });
        }
    });

    context.subscriptions.push(enableCommand);

    // Listener for document changes
    vscode.workspace.onDidChangeTextDocument(async (event) => {
        const document = event.document;
        const changes = event.contentChanges;

        const contextData = contexts.get(document.uri.toString());
        if (!contextData) {
            return; // No context available for the current document
        }
        const patterns = contextData.patterns;

        if (changes.length === 0) { return; }

        const change = changes[0];
        const changedLineText = document.lineAt(change.range.start.line).text.trim();

        // Handle single-line comment
        if (changedLineText.startsWith(patterns.singleLine + ' @!') && change.text.includes('\n')) {
            const question = await collectConsecutiveComments(document, change.range.start.line, patterns.singleLine);
            const { provider, modelName } = extractProviderAndModel(question);
            const cleanedQuestion = question
                .replace(/provider=([^\s]+)/, '')
                .replace(/model=([^\s]+)/, '')
                .trim();

            let modelHandle;
            if (provider || modelName) {
                modelHandle = getModelHandle(provider, modelName);
            }
            if (question) {
                await fetchCompletion(document, document.getText(), cleanedQuestion, change.range.start, modelHandle);
            }
        }
        // Check for multi-line comment closure
        else if (changedLineText.includes(patterns.multiLineTrigger) && change.text.includes('\n')) {
            const startLine = await findStartOfMultiLineComment(document, change.range.start.line, patterns.multiLineStart, patterns.multiLineEnd);
            if (startLine !== -1) {
                const question = extractQuestionFromMultiLine(document, startLine, change.range.start.line, patterns.multiLineStart, patterns.multiLineEnd);
                if (question) {
                    const { provider, modelName } = extractProviderAndModel(question);
                    const cleanedQuestion = question
                        .replace(/provider=([^\s]+)/, '')
                        .replace(/model=([^\s]+)/, '')
                        .trim();

                    let modelHandle;
                    if (provider || modelName) {
                        modelHandle = getModelHandle(provider, modelName);
                    }
                    if (cleanedQuestion) {
                        await fetchCompletion(document, document.getText(), cleanedQuestion, change.range.start, modelHandle);
                    }
                }
            }
        }
    });
}

async function fetchCompletion(document: vscode.TextDocument, contextText: string, question: string, position: vscode.Position, localModel?: any) {
    const config = vscode.workspace.getConfiguration('genai.assistant');

    try {
        // Use the new function to process included files and get the cleaned question
        const { includedFilesContent, cleanedQuestion } = await processIncludedFiles(question);

        const messages = [
            {
                "role": "system",
                "content": `You are a coding assistant for developers. You are provided with the following inputs:
                              1. Filename - Name of the file being edited, used to identify the programming language.
                              2. Included Files - Content from other files specified by the user for additional information. These files provide additional context or code dependencies that you should consider while generating the response. 
                              3. Current Code - The code immediately preceding this request for context.
                              4. Question - The question or help requested by the user related to the current code.
                            Your task is to:
                              - Detect the programming language from the file extension.
                              - Please provide only the necessary code needed to address the user's request.
                              - Code must not be commented out.
                              - Must NOT include any comments, explanations, or non-executable text.
                              - If the requested code can be directly inferred from the question, generate the relevant code only.`
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
}

export function deactivate() { }
