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
const openai_1 = require("openai");
// Set to track enabled files
const enabledFiles = new Set();
function activate(context) {
    // Command to enable OpenAI suggestions for the current file
    let enableCommand = vscode.commands.registerCommand('extension.enableOpenAISuggestions', async () => {
        const editor = vscode.window.activeTextEditor;
        if (editor) {
            const filePath = editor.document.uri.toString();
            if (!enabledFiles.has(filePath)) {
                // Retrieve API key and model name from the settings
                const config = vscode.workspace.getConfiguration('openai');
                const apiKey = config.get('apiKey');
                const modelName = config.get('modelName', 'text-davinci-003');
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
        async provideInlineCompletionItems(document, position, context, token) {
            const filePath = document.uri.toString();
            if (!enabledFiles.has(filePath))
                return { items: [] };
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
        if (!enabledFiles.has(filePath))
            return;
        const changes = event.contentChanges;
        if (changes.length === 0)
            return;
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
function extractQuestionFromMultiLine(document, startLine, endLine) {
    let question = '';
    // Iterate over the lines of the multi-line comment
    for (let line = startLine; line <= endLine; line++) {
        const lineText = document.lineAt(line).text;
        if (line === startLine) {
            question += lineText.substring(lineText.indexOf('@!') + 2).trim(); // Start capturing after '@!'
        }
        else {
            question += lineText.trim();
        }
    }
    return question ? question.trim() : null;
}
async function fetchCompletion(document, contextText, question, position) {
    // Retrieve API key and model name from settings
    const config = vscode.workspace.getConfiguration('openai');
    const apiKey = config.get('apiKey');
    const modelName = config.get('modelName', 'text-davinci-003');
    const modelTemperature = Number(config.get('temperature', '0.5'));
    if (!apiKey) {
        vscode.window.showErrorMessage('OpenAI API Key is missing. Please set it in the VSCode settings.');
        return;
    }
    try {
        const openai = new openai_1.OpenAI({ apiKey });
        // Make the OpenAI API call
        const response = await openai.chat.completions.create({
            model: modelName,
            messages: [
                { role: "system", content: `You are a coding assistant to developers. 
					Identify programming language from file extension.
					Utilize current code for completion context. 
					User's next question is provided as 'Question'. 
					Return only executable code without any COMMENTS.` },
                { role: "user", content: `FileName: ${vscode.workspace.asRelativePath(document.uri)}\nCurrent-Code: ${contextText}\nQuestion: ${question}` }
            ],
            max_tokens: 150,
            temperature: modelTemperature,
        });
        const completionText = response.choices[0]?.message?.content?.trim() || '';
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