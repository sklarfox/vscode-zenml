// Copyright(c) ZenML GmbH 2024. All Rights Reserved.
// Licensed under the Apache License, Version 2.0(the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at:
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
// or implied.See the License for the specific language governing
// permissions and limitations under the License.

import * as vscode from 'vscode';
import type { ExtensionContext } from 'vscode';

const registerLLMAPIKey = async (context: ExtensionContext) => {
  const options: vscode.QuickPickItem[] = [
    { label: 'Anthropic' },
    { label: 'Gemini' },
    { label: 'OpenAI' },
  ];

  const selectedOption = await vscode.window.showQuickPick(options, {
    placeHolder: 'Please select an LLM.',
    canPickMany: false,
  });

  if (selectedOption === undefined) {
    vscode.window.showWarningMessage('API key input was canceled.');
    return undefined;
  }

  const model = selectedOption.label;
  const secretKey = `zenml.${model.toLowerCase()}.key`;

  let apiKey = await context.secrets.get(secretKey);

  if (apiKey) {
    apiKey = await vscode.window.showInputBox({
      prompt: `${model} API Key already exists, enter a new value to update.`,
      password: true,
    });
  } else {
    apiKey = await vscode.window.showInputBox({
      prompt: `Please enter your ${model} API key`,
      password: true,
    });
  }

  if (apiKey === undefined) {
    vscode.window.showWarningMessage('API key input was canceled.');
    return;
  }

  await context.secrets.store(secretKey, apiKey);

  process.env[`${model.toUpperCase()}_API_KEY`] = apiKey;

  vscode.window.showInformationMessage(`${model} API key stored successfully.`);
};

export const secretsCommands = {
  registerLLMAPIKey,
};
