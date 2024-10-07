// languageUtils.ts

import * as vscode from 'vscode';

/**
 * Function to identify if the current file's language is supported.
 * @param editor - The VSCode editor object.
 * @returns {string | null} - Returns the language ID if supported, otherwise null.
 */
export function identifyProgrammingLanguage(editor: vscode.TextEditor): string | null {
    const supportedLanguages = ['javascript', 'typescript', 'python', 'java', 'rust'];
    const languageId = editor.document.languageId; // Get the programming language from the document

    // Check if the language is supported
    if (supportedLanguages.includes(languageId)) {
        return languageId;
    }

    return null; // Return null if the language is not supported
}

// utils.js
export function getCommentPatterns(languageId) {
    const commentPatterns = {
        javascript: {
            singleLine: '//',
            multiLineStart: '/*',
            multiLineEnd: '*/',
            multiLineTrigger: '@! */'
        },
        typescript: {
            singleLine: '//',
            multiLineStart: '/*',
            multiLineEnd: '*/',
            multiLineTrigger: '@! */'
        },
        python: {
            singleLine: '#',
            multiLineStart: "'''",
            multiLineEnd: "'''",
            multiLineTrigger: "@! '''"
        },
        java: {
            singleLine: '//',
            multiLineStart: '/*',
            multiLineEnd: '*/',
            multiLineTrigger: '@! */'
        },
    };

    return commentPatterns[languageId] || null;
}


export async function collectConsecutiveComments(document: vscode.TextDocument, currentLine: number, singleLinePattern: string): Promise<string | null> {
    let question = '';

    // Traverse upwards to collect consecutive comment lines
    for (let line = currentLine; line >= 0; line--) {
        const lineText = document.lineAt(line).text.trim();

        // Ignore blank lines
        if (lineText === '') {
            continue;
        }

        // Stop if a non-comment line is encountered
        if (!lineText.startsWith(singleLinePattern)) {
            break;
        }

        // Extract text after `//`
        const commentText = lineText.substring(singleLinePattern.length).trim();
        question = commentText + ' ' + question;
    }

    vscode.window.showInformationMessage(`Question to ask to LLM:  ${question}`);

    // Return the final concatenated question or null if no comments found
    return question ? question.trim() : null;
}

export function extractProviderAndModel(comment: string): { provider?: string; modelName?: string } {
    const providerMatch = comment.match(/provider=([^\s]+)/);
    const modelNameMatch = comment.match(/model=([^\s]+)/);
    
    const provider = providerMatch ? providerMatch[1] : undefined;
    const modelName = modelNameMatch ? modelNameMatch[1] : undefined;
    
    return { provider, modelName };
}

export function extractQuestionFromMultiLine(document: vscode.TextDocument, startLine: number, endLine: number, multiLineStart: string, multiLineEnd: string): string | null {
    let question = '';

    // Iterate over the lines of the multi-line comment
    for (let line = startLine; line <= endLine; line++) {
        const lineText = document.lineAt(line).text;

        // Start capturing the question only between /* and @! */
        if (line === startLine) {
            const index = lineText.indexOf(multiLineStart);
            const questionStart = index !== -1 ? lineText.substring(index + multiLineStart.length).trim() : '';
            question += questionStart;
            vscode.window.showInformationMessage(`Question Start:  ${questionStart} at line ${line}`);
        } else if (line === endLine) {
            const index = lineText.indexOf(multiLineEnd);
            const questionEnd = index !== -1 ? lineText.substring(0, index).trim() : '';
            question += questionEnd;
            vscode.window.showInformationMessage(`Question Start:  ${questionEnd} at line ${line}`);
        } else {
            question += lineText.trim() + ' '; // Append subsequent lines
            vscode.window.showInformationMessage(`Question append:  ${lineText.trim()} at line ${line}`);
        }
    }
    vscode.window.showInformationMessage(`Question to ask to LLM:  ${question}`);
    return question ? question.trim() : null; // Return the full question
}

export async function findStartOfMultiLineComment(document: vscode.TextDocument, endLine: number, multiLineStart: string, multiLineEnd: string): Promise<number> {
    // Scan backwards to find the start of the multi-line comment
    for (let line = endLine; line >= 0; line--) {
        const lineText = document.lineAt(line).text.trim();
        if (multiLineStart === multiLineEnd) {
            if ( line === endLine && lineText.split(multiLineEnd).length - 1 > 1) {
                return line;
            } else {
                if (line !== endLine && lineText.includes(multiLineStart)) {
                    return line; // Return the line number where the comment starts
                } 
            }

        }
        else {
            if (lineText.includes(multiLineStart)) {
                return line; // Return the line number where the comment starts
            }
            if (lineText.includes(multiLineEnd) && line !== endLine) {
                break; // Exit if we reach a closing comment without finding the opening
            }
        }
    }
    return -1; // Not found
}

/**
 * Function to process the `include-<file>` directives in the question and fetch their content.
 * @param {string} question - The user's question containing the `include-<file>` directives.
 * @returns {Promise<{includedFilesContent: string, cleanedQuestion: string}>} - An object containing concatenated included file contents and the cleaned question.
 */
export  async function processIncludedFiles(question: string): Promise<{includedFilesContent: string, cleanedQuestion: string}> {
    const includeFileMatches = [...question.matchAll(/include=([^\s]+)/g)];
    let includedFilesContent = '';
    let cleanedQuestion = question;

    // If there are include patterns, fetch each file's content
    if (includeFileMatches.length > 0) {
        for (const match of includeFileMatches) {
            const fileName = match[1].trim();
            const fileContent = await getFileContent(fileName);

            if (!fileContent) {
                vscode.window.showErrorMessage(`File ${fileName} could not be found or is empty.`);
                continue; // Skip to the next file if there's an error
            }

            // Append file content under a "Filename" heading
            includedFilesContent += `\nFilename: ${fileName}\n${fileContent}\n`;

            // Remove the include directive from the question text
            cleanedQuestion = cleanedQuestion.replace(match[0], '').trim();
        }
    }

    return { includedFilesContent, cleanedQuestion };
}

/**
 * Function to read the content of a file within the workspace.
 * @param {string} fileName - The file name to be read.
 * @returns {Promise<string | null>} - Returns the content of the file or null if not found.
 */
export async function getFileContent(fileName: string): Promise<string | null> {
    try {
        const workspaceFolder = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri : null;
        if (!workspaceFolder) {
            vscode.window.showErrorMessage('No workspace folder found.');
            return null;
        }

        // Create a URI for the file to be included
        const fileUri = vscode.Uri.joinPath(workspaceFolder, fileName);

        // Check if the file exists
        const fileData = await vscode.workspace.fs.readFile(fileUri);
        const fileContent = Buffer.from(fileData).toString('utf-8');

        return fileContent;
    } catch (error) {
        vscode.window.showErrorMessage(`Error reading file ${fileName}: ${error.message}`);
        return null;
    }
}
