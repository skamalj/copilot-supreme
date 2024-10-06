"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const modelProvider_js_1 = require("./modelProvider.js");
const utils_js_1 = require("./utils.js");
// Global LLM model instance
let llmModel;
const contexts = new Map(); // To store context for each document
function activate(context) {
    let enableCommand = vscode.commands.registerCommand('extension.activateLLMCompletion', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const languageId = (0, utils_js_1.identifyProgrammingLanguage)(editor);
            if (!languageId) {
                vscode.window.showErrorMessage(`Unsupported programming language: ${editor.document.languageId}`);
                return;
            }
            const patterns = (0, utils_js_1.getCommentPatterns)(languageId);
            llmModel = (0, modelProvider_js_1.getModelHandle)();
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
        if (changes.length === 0) {
            return;
        }
        const change = changes[0];
        const changedLineText = document.lineAt(change.range.start.line).text.trim();
        // Handle single-line comment
        if (changedLineText.startsWith(patterns.singleLine + ' @!') && change.text.includes('\n')) {
            const question = await (0, utils_js_1.collectConsecutiveComments)(document, change.range.start.line, patterns.singleLine);
            const { provider, modelName } = (0, utils_js_1.extractProviderAndModel)(question);
            const cleanedQuestion = question
                .replace(/provider=([^\s]+)/, '')
                .replace(/model=([^\s]+)/, '')
                .trim();
            let modelHandle;
            if (provider || modelName) {
                modelHandle = (0, modelProvider_js_1.getModelHandle)(provider, modelName);
            }
            if (question) {
                await fetchCompletion(document, document.getText(), cleanedQuestion, change.range.start, modelHandle);
            }
        }
        // Check for multi-line comment closure
        else if (changedLineText.includes(patterns.multiLineTrigger) && change.text.includes('\n')) {
            const startLine = await (0, utils_js_1.findStartOfMultiLineComment)(document, change.range.start.line, patterns.multiLineStart, patterns.multiLineEnd);
            if (startLine !== -1) {
                const question = (0, utils_js_1.extractQuestionFromMultiLine)(document, startLine, change.range.start.line, patterns.multiLineStart, patterns.multiLineEnd);
                if (question) {
                    const { provider, modelName } = (0, utils_js_1.extractProviderAndModel)(question);
                    const cleanedQuestion = question
                        .replace(/provider=([^\s]+)/, '')
                        .replace(/model=([^\s]+)/, '')
                        .trim();
                    let modelHandle;
                    if (provider || modelName) {
                        modelHandle = (0, modelProvider_js_1.getModelHandle)(provider, modelName);
                    }
                    if (cleanedQuestion) {
                        await fetchCompletion(document, document.getText(), cleanedQuestion, change.range.start, modelHandle);
                    }
                }
            }
        }
    });
}
async function fetchCompletion(document, contextText, question, position, localModel) {
    const config = vscode.workspace.getConfiguration('genai.assistant');
    try {
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
                              - Code must not be commented out
                              - Must NOT include any comments, explanations, or non-executable text.
                              - If the requested code can be directly inferred from the question, generate the relevant code only.`
            },
            {
                "role": "user",
                "content": `FileName: ${vscode.workspace.asRelativePath(document.uri)}
                            Current-Code: ${contextText}
                            Question: ${question}`
            }
        ];
        const modelToUse = localModel || llmModel;
        vscode.window.showInformationMessage(`Model Object: ${JSON.stringify(modelToUse, null, 2)}`);
        const response = await modelToUse.invoke(messages);
        const completionText = response.content || '';
        if (completionText) {
            const edit = new vscode.WorkspaceEdit();
            edit.insert(document.uri, position.translate(1, 0), `\n${completionText}`);
            await vscode.workspace.applyEdit(edit);
        }
    }
    catch (error) {
        vscode.window.showErrorMessage(`Failed to fetch completion: ${error}`);
    }
}
function deactivate() { }
//# sourceMappingURL=extension.js.map