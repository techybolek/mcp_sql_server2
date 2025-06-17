#!/usr/bin/env node

import { spawn } from 'child_process';

// Simple test client for the MCP server
class MCPTestClient {
  constructor() {
    this.requestId = 1;
  }

  async testServer() {
    console.log('Starting MCP MSSQL Server test...\n');

    const serverProcess = spawn('node', ['index.js'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let responseBuffer = '';

    serverProcess.stdout.on('data', (data) => {
      responseBuffer += data.toString();
      this.processResponses(responseBuffer);
    });

    serverProcess.stderr.on('data', (data) => {
      console.error('Server stderr:', data.toString());
    });

    serverProcess.on('close', (code) => {
      console.log(`Server process exited with code ${code}`);
    });

    // Initialize the server
    await this.sendRequest(serverProcess, {
      jsonrpc: '2.0',
      id: this.requestId++,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        clientInfo: {
          name: 'test-client',
          version: '1.0.0'
        }
      }
    });

    // Wait a bit for initialization
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test listing tools
    await this.sendRequest(serverProcess, {
      jsonrpc: '2.0',
      id: this.requestId++,
      method: 'tools/list'
    });

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test a simple query (this will fail without proper DB connection)
    await this.sendRequest(serverProcess, {
      jsonrpc: '2.0',
      id: this.requestId++,
      method: 'tools/call',
      params: {
        name: 'list_tables',
        arguments: {}
      }
    });

    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Test executing a specific query
    await this.sendRequest(serverProcess, {
      jsonrpc: '2.0',
      id: this.requestId++,
      method: 'tools/call',
      params: {
        name: 'execute_sql_query',
        arguments: {
          query: 'SELECT COUNT(*) as document_count FROM document_new'
        }
      }
    });

    // Wait a bit before closing
    await new Promise(resolve => setTimeout(resolve, 2000));

    serverProcess.kill();
  }

  async sendRequest(process, request) {
    const message = JSON.stringify(request) + '\n';
    console.log('Sending:', JSON.stringify(request, null, 2));
    process.stdin.write(message);
  }

  processResponses(buffer) {
    const lines = buffer.split('\n');
    for (const line of lines) {
      if (line.trim()) {
        try {
          const response = JSON.parse(line);
          console.log('Received:', JSON.stringify(response, null, 2));
        } catch (e) {
          console.log('Raw response:', line);
        }
      }
    }
  }
}

const client = new MCPTestClient();
client.testServer().catch(console.error);