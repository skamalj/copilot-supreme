import * as vscode from 'vscode';

export function identifyProgrammingLanguage(editor: vscode.TextEditor): string | null { 
    const languageId = editor.document.languageId; 
    if (languageId) {
        return languageId;
    }
    return null;
}

export function getCommentPatterns(languageId) {
    let commentPatterns = {};

    // Use a case statement to handle languages with similar comment patterns
    switch (languageId) {
        case 'javascript':
        case 'typescript':
        case 'java':
        case 'rust': 
        case 'csharp':
            commentPatterns = {
                singleLine: '//',
                multiLineStart: '/*',
                multiLineEnd: '*/',
                multiLineTrigger: '@! */', 
            };
            break;

        case 'python':
            commentPatterns = {
                singleLine: '#',
                multiLineStart: "'''",
                multiLineEnd: "'''",
                multiLineTrigger: "@! '''", 
            };
            break;

        default:
            const config = vscode.workspace.getConfiguration('genai.assistant');
            const multiLineEnd = config.get<string>('comment.multiLineEnd') || '*/';

            commentPatterns = {
                singleLine: config.get<string>('comment.singleLine') || '//',
                multiLineStart: config.get<string>('comment.multiLineStart') || '/*',
                multiLineEnd: multiLineEnd,
                multiLineTrigger: `@! ${multiLineEnd}`
            };
            break;
    }

    return commentPatterns;
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
    // Return the final concatenated question or null if no comments found
    return question ? question.trim() : null;
}

// Create a version of function xtractKeyValuePairsAndCleanComment, with same name to  handle keyvalue where same key is repeated
// .In that case return all values in array for that key 
// @! provider=anthropic

export function extractKeyValuePairsAndCleanComment(comment: string): { keyValuePairs: { [key: string]: string | string[] }, cleanedComment: string } {
    const keyValuePairs: { [key: string]: string | string[] } = {};
    const matches = comment.match(/(\w+)=([^\s]+)/g);
    let cleanedComment = comment;

    if (matches) {
        for (const match of matches) {
            const [key, value] = match.split('=');
            if (key in keyValuePairs) {
                if (Array.isArray(keyValuePairs[key])) {
                    (keyValuePairs[key] as string[]).push(value);
                } else {
                    keyValuePairs[key] = [keyValuePairs[key] as string, value];
                }
            } else {
                keyValuePairs[key] = value;
            }
            cleanedComment = cleanedComment.replace(match, '').trim();
        }
    }

    return { keyValuePairs, cleanedComment };
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
        } else if (line === endLine) {
            const index = lineText.indexOf(multiLineEnd);
            const questionEnd = index !== -1 ? lineText.substring(0, index).trim() : '';
            question += questionEnd;
        } else {
            question += lineText.trim() + ' '; // Append subsequent lines
        }
    }
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
 * @returns {Promise<string>} - An object containing concatenated included file contents and the cleaned question.
 */
export  async function processIncludedFiles(includedFiles: string[]): Promise<string> {
    
    let includedFilesContent = '';

    // If there are include patterns, fetch each file's content
    if (includedFiles.length > 0) {
        for (const file of includedFiles) {
            const fileName = file.trim();
            const fileContent = await getFileContent(fileName);

            if (!fileContent) {
                vscode.window.showErrorMessage(`File ${fileName} could not be found or is empty.`);
                continue; // Skip to the next file if there's an error
            }

            // Append file content under a "Filename" heading
            includedFilesContent += `\nFilename: ${fileName}\n${fileContent}\n`;

        }
    }

    return includedFilesContent;
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
