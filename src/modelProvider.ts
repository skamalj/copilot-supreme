import { ChatOpenAI } from "@langchain/openai";
import { AzureChatOpenAI } from "@langchain/openai";
import * as vscode from 'vscode';  // For error notification

export function getModelHandle() {
    const config = vscode.workspace.getConfiguration('genai.assistant');
    
    const modelName = config.get<string>('modelName', 'text-davinci-003');
    const modelTemperature = Number(config.get<string>('temperature', '0.5'));
    const provider = config.get<string>('provider', 'openai');
    try {
        switch (provider.toLowerCase()) {
            case 'openai':
                return new ChatOpenAI({ 
                    apiKey:  config.get<string>('openai.apiKey'),
                    model: modelName, 
                    temperature: modelTemperature 
                });
            case 'azure':
                return new AzureChatOpenAI({
                    azureOpenAIApiKey: config.get<string>('azure.apiKey'),
                    model: modelName,
                    temperature: modelTemperature,
                    azureOpenAIApiDeploymentName: config.get<string>('azure.deployment'),
                    azureOpenAIEndpoint: config.get<string>('azure.endpoint'),
                    azureOpenAIApiVersion: config.get<string>('azure.version'),
                });
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    } catch (error) {
        // Show a user-friendly error message in VSCode
        vscode.window.showErrorMessage(`Error initializing model for provider "${provider}": ${error.message}`);
        throw error;  // Re-throw to ensure the caller is aware of the failure
    }
}
