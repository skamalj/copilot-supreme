# VSCode Extension for AI Code Assistance

This VSCode extension provides AI-assisted code suggestions based on user comments in supported programming languages.

Two reasons why this is created:
- This provides a pay-as-you-go option, rather than monthly payments for various copilots.
- You have flexibility to use any chat model from any provider — supports 5 providers as of today.

## Features

- **Language Support:** Any language you can use in VSCode.
- **AI Suggestions:** Fetches code suggestions based on user-defined questions in comments.
- **Multi-line Comment Handling:** Supports multi-line comments with customizable start and end tokens.
- **Dynamic Suggestions:** If a user modifies a comment, they can navigate to the last line of the comment and press Enter to fetch updated code suggestions.
- **Provider and Model Overriding:** Users can specify a different AI provider or model by including `provider=` and `model=` in their comments.
- **Include File Content in Queries:** Users can reference and include code from external files in their AI queries, useful for test cases or including function definitions.

## Supported AI Providers

This extension supports multiple AI providers. Configure settings to specify default models and authentication:
- OpenAI
- AWS (Bedrock)
- Azure
- Google GenAI (Vertex not supported yet)
- Anthropic

## Usage

1. **Enable Suggestions:**
   - Execute the command `Activate` from the context menu. This needs to be done for every file you want to use extension on.

2. **Add Comments:**
   - For single-line comments: Use the format `// @! Your question` (or any single-line comment format specific to your programming language).
   - For multi-line comments: Use the format (or `'''` for Python):
     ```javascript
     /* 
       Your question 
       @! */
     ```

3. **Include External Files in AI Query (New Feature):**
   - You can now reference and include content from other files in your AI query by using the `include=<file>` directive. This is particularly useful when you want the AI to consider code from multiple files, such as including the definition of functions or creating test cases based on file contents.
     ```javascript
     // @! Write test cases for this function include=utils.js
     ```

4. **AI Interaction:**
   - The extension captures the question, appends the code prior to the comment as context, and retrieves a code suggestion from the AI model.

5. **Updating Suggestions:**
   - After modifying a comment, press Enter at the last line to request a new code suggestion.

6. **Customizing Provider and Model:**
   - Override the default AI provider and model by specifying them in your comment, like so:
     ```javascript
     // @! Your question provider=yourProvider model=yourModel
     ```

### Example Use Case: Creating Test Cases with the Include Feature or Convert to another language

Suppose you have a function defined in `utils.js` and you want to write test cases for it. You can use the **include** feature to pull the content from `utils.js` and get test case suggestions from the AI:

```javascript
// @! Write unit tests for this function include=utils.js
```

## Example Use Case: Code Conversion from JavaScript to Python

If you have JavaScript code in a file (e.g., `example.js`) and you want to convert it to Python, you can use the **include** feature to fetch the content from the file, in your python file (say example.py) and ask the AI for a conversion suggestion:

```python
# @! Convert the JavaScript code to Python include=example.js