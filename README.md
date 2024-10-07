# VSCode Extension for AI Code Assistance

This VSCode extension provides AI-assisted code suggestions based on user comments in supported programming languages.

Two reasons why this is created:-
- This provides you pay-as-you-go option, rather than monthly payments for various copilots. Basis the usage one or the other option will turn out cheaper.
- You have flexibility to use any chat model from any provider - supports 5 providers as of today.

## Features

- **Language Support:** Currently supports JavaScript, TypeScript, Python, and Java.
- **AI Suggestions:** Fetches code suggestions based on user-defined questions in comments.
- **Multi-line Comment Handling:** Supports multi-line comments with customizable start and end tokens.
- **Dynamic Suggestions:** If a user modifies a comment, they can navigate to the last line of the comment and press Enter to fetch updated code suggestions.
- **Provider and Model Overriding:** Users can specify a different AI provider or model by including `provider=` and `model=` in their comments.

## Supported AI Providers

This extension supports multiple AI providers, configure settings to specify defaults models and authentication:
- OpenAI
- AWS (Bedrock)
- Azure
- Google GenAI (Vertex not supported yet)
- Anthropic

## Usage

1. **Enable Suggestions:**
   - Execute the command `Enable OpenAI Suggestions` from the command palette.

2. **Add Comments:**
   - For single-line comments: Use the format `// @! Your question` (or any single-line comment format specific to your programming language).
   - For multi-line comments: Use the format(or ''' for python):
     ```javascript
     /* 
       Your question 
       @! */
     ```

3. **AI Interaction:**
   - The extension captures the question, appends the code prior to comment as context,   and retrieves a code suggestion from the AI model.

4. **Updating Suggestions:**
   - After modifying a comment, press Enter at the last line to request a new code suggestion.

5. **Customizing Provider and Model:**
   - Override the default AI provider and model by specifying them in your comment, like so:
     ```
     // @! Your question provider=yourProvider model=yourModel
     ```
