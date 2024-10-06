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
const aws_1 = require("@langchain/aws");
const google_genai_1 = require("@langchain/google-genai");
const anthropic_1 = require("@langchain/anthropic");
const vscode = __importStar(require("vscode"));
function getModelHandle(providerOverride, modelNameOverride) {
    const config = vscode.workspace.getConfiguration('genai.assistant');
    // Use the provider from the arguments, or fall back to the config
    const provider = (providerOverride || config.get('provider').trim()).toLowerCase();
    // Common config
    const temperature = Number(config.get('temperature', '0.5'));
    try {
        switch (provider) {
            case 'openai': {
                vscode.window.showInformationMessage(`Creating model for provider ${provider}`);
                const openaiConfig = {
                    temperature,
                    openAIApiKey: config.get('openai.apiKey').trim() || '',
                    modelName: modelNameOverride || config.get('openai.modelName').trim(),
                };
                return new openai_1.ChatOpenAI(openaiConfig);
            }
            case 'azure': {
                vscode.window.showInformationMessage(`Creating model for provider ${provider}`);
                const azureConfig = {
                    temperature,
                    azureOpenAIApiKey: config.get('azure.apiKey').trim() || '',
                    azureOpenAIApiDeploymentName: config.get('azure.deployment').trim() || '',
                    azureOpenAIEndpoint: config.get('azure.endpoint').trim() || '',
                    azureOpenAIApiVersion: config.get('azure.version').trim(),
                    modelName: modelNameOverride || config.get('azure.modelName').trim(),
                };
                return new openai_2.AzureChatOpenAI(azureConfig);
            }
            case 'aws': {
                vscode.window.showInformationMessage(`Creating model for provider ${provider}`);
                const awsConfig = {
                    temperature,
                    model: modelNameOverride || config.get('aws.modelName').trim(),
                    region: config.get('aws.region').trim(),
                    profile: config.get('aws.profile').trim()
                };
                return new aws_1.ChatBedrockConverse(awsConfig);
            }
            case 'google': {
                vscode.window.showInformationMessage(`Creating model for provider ${provider}`);
                const googleConfig = {
                    temperature,
                    model: modelNameOverride || config.get('google.modelName').trim(),
                    apiKey: config.get('google.apiKey').trim() || '',
                };
                return new google_genai_1.ChatGoogleGenerativeAI(googleConfig);
            }
            case 'anthropic': {
                vscode.window.showInformationMessage(`Creating model for provider ${provider}`);
                const anthropicConfig = {
                    temperature,
                    apiKey: config.get('anthropic.apiKey').trim() || '',
                    model: modelNameOverride || config.get('anthropic.modelName').trim(),
                };
                return new anthropic_1.ChatAnthropic(anthropicConfig);
            }
            default:
                throw new Error(`Unsupported provider: ${provider}`);
        }
    }
    catch (error) {
        vscode.window.showErrorMessage(`Error initializing model for provider "${provider}": ${error.message}`);
        throw error;
    }
}
//# sourceMappingURL=modelProvider.js.map