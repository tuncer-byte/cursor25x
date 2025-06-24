import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface TaskLoopResult {
  success: boolean;
  message: string;
  userInput?: string;
  error?: string;
}

export class InteractiveTaskLoop {
  private workingDirectory: string;
  private currentIteration: number = 0;
  
  constructor(workingDirectory: string = process.cwd()) {
    this.workingDirectory = workingDirectory;
  }

  public ensureUserInputFile(): boolean {
    try {
      const userInputPath = path.join(this.workingDirectory, 'cursor25xinput.cjs');
      
      if (fs.existsSync(userInputPath)) {
        return true;
      }
      
      const content = `// cursor25xinput.cjs - CURSOR25X Interactive Input Handler
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('🚀 CURSOR25X prompt: ', (answer) => {
    console.log(answer);
    rl.close();
});
`;
      
      fs.writeFileSync(userInputPath, content, 'utf8');
      return fs.existsSync(userInputPath);
        
    } catch (error) {
      return false;
    }
  }

  public async ensureCursorRulesFile(): Promise<boolean> {
    try {
      const rulesDir = path.join(this.workingDirectory, '.cursor', 'rules');
      const mdcFilePath = path.join(rulesDir, 'cursor25x.mdc');
      
      if (fs.existsSync(mdcFilePath)) {
        return true;
      }
      
      if (!fs.existsSync(rulesDir)) {
        fs.mkdirSync(rulesDir, { recursive: true });
      }
      
      const mdcContent = `---
description: Interactive Task Loop Rules
globs: ["**/*"]
alwaysApply: true
---

### ✅ Task: Interactive Task Loop with User Feedback

1. **Check if \`cursor25xinput.cjs\` exists** in the root directory.

   * If it doesn't exist, create it with the following content:

     \`\`\`js
   // cursor25xinput.cjs - CURSOR25X Interactive Input Handler
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('🚀 CURSOR25X prompt: ', (answer) => {
    console.log(answer);
    rl.close();
});
     \`\`\`

2. **Main Workflow**:

   * Perform your assigned tasks.

   * Run:

     \`\`\`bash
     node cursor25xinput.cjs
     \`\`\`
   * The terminal should be opened in the chat window itself.

   * Read the user's input.

   * Based on the input, perform the next set of tasks.

   * Repeat the process.

3. **Exit Condition**:

   * If the user enters \`"cursor25x finish"\` when prompted, exit the loop and terminate the process.`;
      
      fs.writeFileSync(mdcFilePath, mdcContent, 'utf8');
      return fs.existsSync(mdcFilePath);
      
    } catch (error) {
      return false;
    }
  }

  private async runUserInputScript(): Promise<string> {
    return new Promise((resolve, reject) => {
      const scriptPath = path.join(this.workingDirectory, 'cursor25xinput.cjs');
      
      if (!fs.existsSync(scriptPath)) {
        reject(new Error('cursor25xinput.cjs not found'));
        return;
      }

      const child = spawn('node', [scriptPath], {
        cwd: this.workingDirectory,
        stdio: ['inherit', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      child.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      child.on('close', (code) => {
        if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`Script exited with code ${code}: ${stderr}`));
        }
      });

      child.on('error', (error) => {
        reject(error);
      });

      setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error('User input timeout after 30 seconds'));
      }, 30000);
    });
  }

  private async processUserInput(input: string): Promise<string> {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('create')) {
      return `Creating task based on: "${input}"`;
    } else if (lowerInput.includes('read') || lowerInput.includes('analyze')) {
      return `Reading/analyzing task: "${input}"`;
    } else if (lowerInput.includes('update') || lowerInput.includes('edit')) {
      return `Updating task: "${input}"`;
    } else if (lowerInput.includes('delete') || lowerInput.includes('remove')) {
      return `Deleting task: "${input}"`;
    } else if (lowerInput.includes('help')) {
      return `Help requested: Available commands - create, read, update, delete, stop`;
    } else {
      return `Processing general task: "${input}"`;
    }
  }

  async runSingleIteration(): Promise<TaskLoopResult> {
    try {
      if (this.currentIteration === 0) {
        const inputFileCreated = this.ensureUserInputFile();
        const rulesFileCreated = await this.ensureCursorRulesFile();
        
        if (!inputFileCreated || !rulesFileCreated) {
          return {
            success: false,
            message: 'Failed to create required files',
            error: 'File creation failed'
          };
        }
      }
      
      this.currentIteration++;
      
      const userInput = await this.runUserInputScript();
      
      if (!userInput) {
        return {
          success: false,
          message: 'No input received from user',
          error: 'Empty input'
        };
      }
      
      const taskMessage = await this.processUserInput(userInput);
      
      return {
        success: true,
        message: taskMessage,
        userInput: userInput
      };
      
    } catch (error) {
      return {
        success: false,
        message: 'Error in task loop iteration',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  getWorkingDirectory(): string {
    return this.workingDirectory;
  }

  setWorkingDirectory(dir: string): void {
    this.workingDirectory = dir;
  }
}