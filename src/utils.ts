// languageUtils.ts

import * as vscode from 'vscode';

/**
 * Function to identify if the current file's language is supported.
 * @param editor - The VSCode editor object.
 * @returns {string | null} - Returns the language ID if supported, otherwise null.
 */
export function identifyProgrammingLanguage(editor: vscode.TextEditor): string | null {
    const supportedLanguages = ['javascript', 'typescript', 'python', 'java'];
    const languageId = editor.document.languageId; // Get the programming language from the document

    // Check if the language is supported
    if (supportedLanguages.includes(languageId)) {
        return languageId;
    }

    return null; // Return null if the language is not supported
}
