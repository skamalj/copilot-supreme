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

1. **Activate the Extension:**
   - After installing the extension, you can activate it manually by running the command:
     ```
     Copilot Supreme: Activate
     ```
     You can access this command either from the command palette (`Ctrl+Shift+P`) or by right-clicking inside the editor window and selecting **"Copilot Supreme: Activate"** from the context menu.

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
```

## Configuration

The extension provides a variety of configuration options that can be set either through the settings menu or by editing the `settings.json` file in VSCode. These configurations are split into sections for common settings and provider-specific settings.

### Common Settings

| Parameter                          | Type   | Default | Description                               |
|-------------------------------------|--------|---------|-------------------------------------------|
| `genai.assistant.provider`          | string | openai  | Select the AI provider you want to use. Possible values: `openai`, `aws`, `azure`, `google`, `anthropic`. |
| `genai.assistant.temperature`       | string | 0       | LLM temperature to control creativity of responses. |
| `genai.assistant.timeout`           | string | 10      | Timeout value for LLM API calls (in seconds). |

### OpenAI Settings

| Parameter                          | Type   | Default | Description                               |
|-------------------------------------|--------|---------|-------------------------------------------|
| `genai.assistant.openai.apiKey`     | string |         | Your OpenAI API Key or set environment variable `OPENAI_API_KEY`. |
| `genai.assistant.openai.modelName`  | string | gpt-4   | The LLM model name (e.g., gpt-4). |

### Azure Settings

| Parameter                          | Type   | Default              | Description                               |
|-------------------------------------|--------|----------------------|-------------------------------------------|
| `genai.assistant.azure.deployment`  | string |                      | Azure OpenAI Deployment Name.             |
| `genai.assistant.azure.endpoint`    | string |                      | Azure OpenAI endpoint.                    |
| `genai.assistant.azure.version`     | string | 2023-03-15-preview   | Azure OpenAI API version.                 |
| `genai.assistant.azure.apiKey`      | string |                      | Your Azure API Key or set environment variable `AZURE_API_KEY`. |
| `genai.assistant.azure.modelName`   | string | gpt-35-turbo         | The LLM model name (e.g., gpt-35-turbo). |

### AWS Settings

| Parameter                          | Type   | Default | Description                               |
|-------------------------------------|--------|---------|-------------------------------------------|
| `genai.assistant.aws.profile`       | string |         | AWS environment profile to use for connection. |
| `genai.assistant.aws.region`        | string |         | AWS region to use for Bedrock.            |
| `genai.assistant.aws.modelName`     | string | gpt-3.5-turbo | The LLM model name (e.g., gpt-3.5-turbo). |

### Google Settings

| Parameter                          | Type   | Default | Description                               |
|-------------------------------------|--------|---------|-------------------------------------------|
| `genai.assistant.google.apiKey`     | string |         | Google AIStudio Key or set environment variable `GOOGLE_GENAI_API_KEY`. |
| `genai.assistant.google.modelName`  | string | gemini-1.5-flash-latest | The LLM model name (e.g., gemini-1.5-flash-latest). |

### Anthropic Settings

| Parameter                             | Type   | Default | Description                               |
|----------------------------------------|--------|---------|-------------------------------------------|
| `genai.assistant.anthropic.apiKey`     | string |         | Your API Key or set environment variable `ANTHROPIC_API_KEY`. |
| `genai.assistant.anthropic.modelName`  | string | claude-3-5-sonnet-20240620 | The LLM model name (e.g., claude-3-5-sonnet-20240620). |

### Comment Configuration for Other Languages

| Parameter                          | Type   | Default | Description                               |
|-------------------------------------|--------|---------|-------------------------------------------|
| `genai.assistant.comment.singleLine`     | string | //      | Single-line comment format.               |
| `genai.assistant.comment.multiLineStart` | string | /*      | Multi-line start format for comments.     |
| `genai.assistant.comment.multiLineEnd`   | string | */      | Multi-line end format for comments.       |
