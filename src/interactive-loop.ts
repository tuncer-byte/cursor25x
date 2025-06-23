import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface TaskLoopResult {
  success: boolean;
  message: string;
  userInput?: string;
  error?: string;
}

export class InteractiveTaskLoop {
  private workingDirectory: string;
  private isRunning: boolean = false;
  private maxIterations: number = 50;
  private currentIteration: number = 0;
  
  constructor(workingDirectory: string = process.cwd()) {
    this.workingDirectory = workingDirectory;
  }

  /**
   * Create cursor25xinput.cjs file for JavaScript-based input handling
   */
  public ensureUserInputFile(): boolean {
    try {
      const userInputPath = path.join(this.workingDirectory, 'cursor25xinput.cjs');
      
      // Eğer dosya zaten varsa true döndür 
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

  /**
   * Create enhanced cursor25x.mdc file
   */
  public async ensureCursorRulesFile(): Promise<boolean> {
    try {
      // .cursor/rules/ dizinini oluştur
      const rulesDir = path.join(this.workingDirectory, '.cursor', 'rules');
      const mdcFilePath = path.join(rulesDir, 'cursor25x.mdc');
      
      // Eğer dosya zaten varsa true döndür
      if (fs.existsSync(mdcFilePath)) {
        return true;
      }
      
      // Dizinleri oluştur (recursive)
      if (!fs.existsSync(rulesDir)) {
        fs.mkdirSync(rulesDir, { recursive: true });
      }
      
      const mdcContent = `# CURSOR25X Interactive Task Loop Rules

## 🎯 Ana Workflow

### 1. Başlangıç Kontrolü
- cursor25xinput.cjs dosyasının varlığını kontrol et
- Yoksa otomatik oluştur

### 2. Ana İş Akışı
1. **Görev İşleme**: Mevcut görevleri tamamla
2. **Kullanıcı Input'u**: node cursor25xinput.cjs çalıştır
3. **Terminal Açma**: Terminal chat penceresinde açılmalı
4. **Input Okuma**: Kullanıcının girdiği input'u oku
5. **Görev Planlama**: Input'a göre sonraki görevleri planla
6. **Döngü Devamı**: İşlemi tekrarla

### 3. Çıkış Koşulu
- Kullanıcı "stop" girdiğinde döngüyü sonlandır

## 🔧 Teknik Detaylar

### Dosya Yapısı
- \`cursor25xinput.cjs\`: Node.js readline ile input alma
- \`.cursor/rules/cursor25x.mdc\`: Bu kural dosyası

### Input Processing
- **Create**: Yeni dosya/proje oluşturma
- **Read**: Dosya okuma, analiz
- **Update**: Kod güncelleme, düzenleme  
- **Delete**: Dosya silme
- **Help**: Yardım bilgileri
- **Stop**: Döngüyü sonlandır

### Error Handling
- Dosya oluşturma hatalarını yakala
- Input/output hatalarını logla
- Graceful shutdown sağla

## 📋 Kullanım Örnekleri

\`\`\`bash
# Loop başlatma
node cursor25xinput.cjs

# Örnek inputlar:
"create a new React component"
"read and analyze app.js"  
"update the database schema"
"help with debugging"
"stop"
\`\`\`

## 🚨 Önemli Notlar

- Her iteration'da dosya varlığını kontrol et
- Kullanıcı input'u stdin'den al
- Console.log ile output ver (stdout)
- Error'ları stderr'e yaz
- Terminal'i chat penceresinde aç
`;
      
      fs.writeFileSync(mdcFilePath, mdcContent, 'utf8');
      return fs.existsSync(mdcFilePath);
      
    } catch (error) {
      return false;
    }
  }

  /**
   * Run the user input script and get the result
   */
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

      // 30 saniye timeout
      setTimeout(() => {
        child.kill('SIGTERM');
        reject(new Error('User input timeout after 30 seconds'));
      }, 30000);
    });
  }

  /**
   * Process user input and return appropriate message
   */
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

  /**
   * Run a single iteration of the task loop
   */
  async runSingleIteration(): Promise<TaskLoopResult> {
    try {
      // İlk iteration'da dosyaları oluştur
      if (this.currentIteration === 0) {
        // Dosyaları oluştur
        const inputFileCreated = this.ensureUserInputFile();
        const rulesFileCreated = await this.ensureCursorRulesFile();
        
        if (!inputFileCreated) {
          return {
            success: false,
            message: 'Failed to create cursor25xinput.cjs',
            error: 'File creation failed'
          };
        }
        
        if (!rulesFileCreated) {
          return {
            success: false,
            message: 'Failed to create cursor25x.mdc',
            error: 'Rules file creation failed'
          };
        }
      }
      
      this.currentIteration++;
      
      // Kullanıcıdan input al
      const userInput = await this.runUserInputScript();
      
      if (!userInput) {
        return {
          success: false,
          message: 'No input received from user',
          error: 'Empty input'
        };
      }
      
      // Input'u işle
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

  checkUserInputFileExists(): boolean {
    const userInputPath = path.join(this.workingDirectory, 'cursor25xinput.cjs');
    return fs.existsSync(userInputPath);
  }

  getWorkingDirectory(): string {
    return this.workingDirectory;
  }

  setWorkingDirectory(dir: string): void {
    this.workingDirectory = dir;
  }
} 