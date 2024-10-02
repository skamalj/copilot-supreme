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
exports.getModelHandle = getModelHandle;
const openai_1 = require("@langchain/openai");
const openai_2 = require("@langchain/openai");
const vscode = __importStar(require("vscode")); // For error notification
function getModelHandle() {
    const config = vscode.workspace.getConfiguration('genai.assistant');
    const modelName = config.get('modelName', 'text-davinci-003');
    const modelTemperature = Number(config.get('temperature', '0.5'));
    const provider = config.get('provider', 'openai');
    try {
        switch (provider.toLowerCase()) {
            case 'openai':
                return new openai_1.ChatOpenAI({
                    apiKey: config.get('openai.apiKey'),
                    model: modelName,
                    temperature: modelTemperature
                });
            case 'azure':
                return new openai_2.AzureChatOpenAI({
                    azureOpenAIApiKey: config.get('azure.apiKey'),
                    model: modelName,
                    temperature: modelTemperature,
                    azureOpenAIApiDeploymentName: config.get('azure.deployment'),
                    azureOpenAIEndpoint: config.get('azure.endpoint'),
                    azureOpenAIApiVersion: config.get('azure.version'),
                });
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    }
    catch (error) {
        // Show a user-friendly error message in VSCode
        vscode.window.showErrorMessage(`Error initializing model for provider "${provider}": ${error.message}`);
        throw error; // Re-throw to ensure the caller is aware of the failure
    }
}
//# sourceMappingURL=modelProvider.js.map