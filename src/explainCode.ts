import * as vscode from 'vscode';
import { getModelHandle } from './modelProvider.js';


// Function to call OpenAI and display explanation in a webview panel
export async function explainCode(selectedText: string | undefined): Promise<void> {
    if (!selectedText) {
        vscode.window.showInformationMessage("No code selected");
        return;
    }

    const explanation = await callOpenAIForExplanation(selectedText);

    // Display the explanation in a webview panel
    const panel = vscode.window.createWebviewPanel(
        'explainCodePanel',   // Internal identifier
        'Code Explanation',   // Title of the panel
        vscode.ViewColumn.Beside, // Editor column to show the new panel in
        {}                    // Webview options
    );

    panel.webview.html = getWebviewContent(explanation);
}

// Function to call OpenAI API
async function callOpenAIForExplanation(selectedText: string) {
    const editor = vscode.window.activeTextEditor;
    const document = editor.document;
    return vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: "Asking LLM...",
        cancellable: false
    }, async (progress) => {
        try {
            
            const messages = [
                {
                    "role": "system",
                    "content": `You are a coding assistant for developers. You are provided with the following inputs:
                              1. Filename - Name of the file being edited, used to identify the programming language.
                              2. Selected Code - The code selected for which explanation is needed.
                              3. Question - The question or help requested by the user related to the current code.
                              Your task is to:
                              1. Provide a detailed explanation of the selected code.
                              2. Format the explanation text normally, but any code snippets should be wrapped in <code> tags, and larger blocks of code should be wrapped in <pre><code> tags.
                              3. Ensure that the code is separated clearly from the text to improve readability.`
                },
                {
                    "role": "user",
                    "content": `FileName: ${vscode.workspace.asRelativePath(document.uri)}
                            Selected Code: ${selectedText}
                            Question: Provide a detailed explanation for the selected code, ensuring that code snippets are formatted distinctly from the text.`
                }
            ];
            const modelToUse = getModelHandle();
            const response = await modelToUse.invoke(messages);
            const completionText = response.content || '';
            return completionText as string;
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to fetch completion: ${error}`);
        }
    });
}

// Function to return HTML content for the webview
function getWebviewContent(explanation: string): string {
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Code Explanation</title>
        </head>
        <body>
            <h1>Explanation</h1>
            <pre>${explanation}</pre>
        </body>
        </html>
    `;
}
