#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { InteractiveTaskLoop } from "./interactive-loop.js";
import * as path from "path";
import * as os from "os";

/**
 * Interactive Task Loop MCP Server
 * Bu server interactive task loop workflow'unu yönetir
 */

// MCP Server'ı oluştur
const server = new McpServer({
  name: "interactive-task-loop",
  version: "1.0.0",
  description: "MCP server that manages interactive task loop with user feedback"
});

// Working directory'yi kullanıcının workspace'ine ayarla
function getWorkingDirectory(): string {
  if (process.env.CURSOR_WORKSPACE) {
    return process.env.CURSOR_WORKSPACE;
  }
  
  if (process.env.PWD && process.env.PWD !== '/') {
    return process.env.PWD;
  }
  
  const userHome = os.homedir();
  return path.join(userHome, 'cursor25x');
}

// Global task loop instance
let taskLoop = new InteractiveTaskLoop(getWorkingDirectory());

// Ana tool: Interactive task loop
server.tool(
  "start_task_loop",
  {
    description: "Start the interactive task loop user prompt",
  },
  async () => {
    try {
      // Hızlı başlatma mesajı
      const workingDir = taskLoop.getWorkingDirectory();
      
      // İlk dosya oluşturma ve single iteration
      const result = await taskLoop.runSingleIteration();
      
      if (!result.success) {
        return {
          content: [
            {
              type: "text",
              text: `❌ **ERROR:** ${result.error || result.message}\n📁 **Working Directory:** ${workingDir}`
            }
          ]
        };
      }
      
      // Success case - hızlı response
      let response = `🚀 **CURSOR25X INTERACTIVE LOOP**\n\n`;
      response += `📁 **Working Directory:** ${workingDir}\n`;
      response += `✅ **Files Created:** cursor25xinput.cjs, .cursor/rules/cursor25x.mdc\n\n`;
      
      if (result.userInput) {
        const userInput = result.userInput.trim();
        
        if (userInput.toLowerCase() === 'stop') {
          response += `🛑 **STOPPED:** User requested to stop\n`;
        } else {
          response += `✅ **User Input:** "${userInput}"\n`;
          response += `📝 **Task:** ${result.message}\n\n`;
          response += `🔄 **Next:** Run tool again for continuous loop or type "stop" to exit\n`;
        }
      }
      
      response += `\n💡 **Usage:** Type commands like "create", "read", "update", "delete", "help", or "stop"`;

      return {
        content: [
          {
            type: "text",
            text: response
          }
        ]
      };

    } catch (error) {
      return {
        content: [
          {
            type: "text", 
            text: `❌ **CRITICAL ERROR:** ${error instanceof Error ? error.message : 'Unknown error occurred'}`
          }
        ]
      };
    }
  }
);

// Server'ı başlat
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  
  // Process'in temiz kapanması için signal handler'lar
  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });
  
  process.on('SIGTERM', async () => {
    await server.close();
    process.exit(0);
  });
}

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

// Server'ı başlat
main().catch((error) => {
  console.error("Failed to start MCP server:", error);
  process.exit(1);
}); 