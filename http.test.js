#!/usr/bin/env node

import axios from 'axios';

class HTTPMCPTestClient {
  constructor() {
    this.baseUrl = 'http://127.0.0.1:3000/mcp';
    this.requestId = 1;
    this.sessionId = null;
  }

  async runTests() {
    console.log('Starting MCP MSSQL Server HTTP transport tests...\n');

    try {
      // Test 1: Initialize session
      await this.testInitialize();

      // Test 2: List available tools
      await this.testListTools();

      // Test 3: Simple list_tables call
      await this.testListTables();

      console.log('All tests completed successfully!');
    } catch (error) {
      console.error('Test failed:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
      throw error;
    }
  }

  async testInitialize() {
    console.log('\nTest: Initialize Session');
    const response = await this.sendRequest({
      jsonrpc: '2.0',
      id: this.requestId++,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        clientInfo: {
          name: 'http-test-client',
          version: '1.0.0'
        }
      }
    });

    // Store session ID for subsequent requests
    this.sessionId = response.headers['mcp-session-id'];
    if (!this.sessionId) {
      throw new Error('No session ID received from initialize request');
    }
    console.log('Session initialized:', this.sessionId);
  }

  async testListTools() {
    console.log('\nTest: List Tools');
    const response = await this.sendRequest({
      jsonrpc: '2.0',
      id: this.requestId++,
      method: 'tools/list'
    });

    // Basic validation
    if (!response.data.result?.tools?.length) {
      throw new Error('No tools returned from tools/list');
    }
  }

  async testListTables() {
    console.log('\nTest: List Tables');
    await this.sendRequest({
      jsonrpc: '2.0',
      id: this.requestId++,
      method: 'tools/call',
      params: {
        name: 'list_tables',
        arguments: {}
      }
    });
  }

  async sendRequest(request) {
    console.log('Sending:', JSON.stringify(request, null, 2));
    
    const headers = {
      'Accept': 'application/json, text/event-stream'
    };
    if (this.sessionId) {
      headers['mcp-session-id'] = this.sessionId;
    }

    const response = await axios.post(this.baseUrl, request, { headers });
    const parsedResponse = this.parseSSEResponse(response);
    console.log('Received:', JSON.stringify(parsedResponse, null, 2));
    return { ...response, data: parsedResponse };
  }

  parseSSEResponse(response) {
    // Extract the data field from SSE format
    const match = response.data.match(/data: ({.*})/);
    if (!match) {
      throw new Error('Invalid SSE response format');
    }
    return JSON.parse(match[1]);
  }
}

// Only run if this file is being run directly
if (import.meta.url === new URL(import.meta.url).href) {
  const client = new HTTPMCPTestClient();
  client.runTests().catch(error => {
    console.error('Tests failed:', error);
    process.exit(1);
  });
} 