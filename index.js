#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
//import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import sql from 'mssql';
import dotenv from 'dotenv';
import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { randomUUID } from 'node:crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from the same directory as this file
dotenv.config({ path: path.join(__dirname, '.env') });

// Validate required environment variables
const requiredEnvVars = {
  'DB_SERVER': 'Database server address',
  'DB_USER': 'Database username',
  'DB_PASSWORD': 'Database password',
  'DB_DATABASE_NAME': 'Database name'
};

const missingVars = Object.entries(requiredEnvVars)
  .filter(([key]) => !process.env[key])
  .map(([key, desc]) => `${key} (${desc})`);

if (missingVars.length > 0) {
  console.error(`Missing required environment variables:\n${missingVars.join('\n')}`);
  process.exit(1);
}

// Ensure logs directory exists
import fs from 'fs';
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

// Configure winston logger
function createLogger(transportType) {
  const transports = [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error',
      handleExceptions: true,
      handleRejections: true
    }),
    new winston.transports.File({ 
      filename: path.join(logsDir, 'combined.log'),
      handleExceptions: true,
      handleRejections: true
    })
  ];

  // Add console transport for HTTP mode
  if (transportType === 'http') {
    transports.push(new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
      handleExceptions: true,
      handleRejections: true
    }));
  }

  return winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.json()
    ),
    transports,
    silent: false,
    exitOnError: false
  });
}

// Get transport type early
const transportType = getTransportArg();
const logger = createLogger(transportType);

// Redirect console.log and console.error to file logging
console.log = (...args) => logger.info(args.join(' '));
console.error = (...args) => logger.error(args.join(' '));
console.debug = (...args) => logger.debug(args.join(' '));
console.warn = (...args) => logger.warn(args.join(' '));

class MSSQLMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'mcp-mssql-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    this.setupErrorHandling();
  }

  setupErrorHandling() {
    this.server.onerror = (error) => {
      logger.error('[MCP Error]', { error: error.message, stack: error.stack });
    };

    process.on('SIGINT', async () => {
      logger.info('Server shutting down...');
      await this.server.close();
      process.exit(0);
    });
  }

  setupToolHandlers() {
    logger.info('Setting up tool handlers');
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      logger.debug('Handling ListTools request');
      return {
        tools: [
          {
            name: 'execute_sql_query',
            description: 'Execute a SQL query against the MS SQL Server database',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'The SQL query to execute',
                },
                parameters: {
                  type: 'array',
                  description: 'Optional parameters for prepared statements',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      type: { type: 'string' },
                      value: {}
                    }
                  }
                }
              },
              required: ['query'],
            },
          },
          {
            name: 'list_tables',
            description: 'List all tables in the database',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'describe_table',
            description: 'Get the schema information for a specific table',
            inputSchema: {
              type: 'object',
              properties: {
                table_name: {
                  type: 'string',
                  description: 'The name of the table to describe',
                },
              },
              required: ['table_name'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      logger.info('Handling CallTool request', { request });
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          case 'execute_sql_query':
            return await this.executeSQLQuery(args.query, args.parameters);
          case 'list_tables':
            return await this.listTables();
          case 'describe_table':
            return await this.describeTable(args.table_name);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
        };
      }
    });
  }

  async getConnection() {
    const config = {
      server: process.env.DB_SERVER,
      port: parseInt(process.env.DB_PORT) || 1433,
      database: process.env.DB_DATABASE_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      options: {
        encrypt: process.env.DB_ENCRYPT === 'true',
        trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true',
      },
    };

    try {
      logger.debug('Attempting database connection', { server: config.server, database: config.database });
      await sql.connect(config);
      logger.info('Database connection established successfully');
      return sql;
    } catch (error) {
      logger.error('Database connection failed', { error: error.message, stack: error.stack });
      throw new Error(`Database connection failed: ${error.message}`);
    }
  }

  async executeSQLQuery(query, parameters = []) {
    try {
      logger.debug('Executing SQL query', { query, parameters });
      await this.getConnection();
      const request = new sql.Request();

      // Add parameters if provided
      if (parameters && parameters.length > 0) {
        parameters.forEach(param => {
          request.input(param.name, this.getSqlType(param.type), param.value);
        });
      }

      const result = await request.query(query);
      logger.info('SQL query executed successfully', { rowsAffected: result.rowsAffected });
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              rowsAffected: result.rowsAffected,
              recordset: result.recordset,
              recordsets: result.recordsets,
            }, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error('SQL execution failed', { error: error.message, query, parameters });
      throw new Error(`SQL execution failed: ${error.message}`);
    } finally {
      await sql.close();
      logger.debug('Database connection closed');
    }
  }

  async listTables() {
    try {
      logger.debug('Listing tables');
      await this.getConnection();
      const result = await sql.query`SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE'`;
      logger.info('Tables listed successfully');
      
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result.recordset, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error('Failed to list tables', { error: error.message });
      throw new Error(`Failed to list tables: ${error.message}`);
    } finally {
      await sql.close();
      logger.debug('Database connection closed');
    }
  }

  async describeTable(tableName) {
    try {
      logger.debug('Describing table', { tableName });
      await this.getConnection();
      const request = new sql.Request();
      request.input('tableName', sql.NVarChar, tableName);
      const result = await request.query`
        SELECT COLUMN_NAME, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = @tableName
      `;
      logger.info('Table described successfully', { tableName });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result.recordset, null, 2),
          },
        ],
      };
    } catch (error) {
      logger.error('Failed to describe table', { error: error.message, tableName });
      throw new Error(`Failed to describe table: ${error.message}`);
    } finally {
      await sql.close();
      logger.debug('Database connection closed');
    }
  }

  getSqlType(typeString) {
    const typeMap = {
      'string': sql.NVarChar,
      'number': sql.Int,
      'boolean': sql.Bit,
      'date': sql.DateTime,
      // Add other mappings as needed
    };
    return typeMap[typeString.toLowerCase()] || sql.NVarChar;
  }
}

function getTransportArg() {
  const arg = process.argv.find(a => a.startsWith('--transport'));
  if (!arg) {
    return 'stdio';
  }
  const value = arg.split('=')[1];
  return value || 'stdio';
}

async function startStdioTransport(serverInstance) {
  logger.info('[STDIO] Starting server with stdio transport');
  const transport = new StdioServerTransport();
  await serverInstance.server.connect(transport);
  logger.info('[STDIO] Server connected via stdio');
}

async function startHttpTransport(serverInstance) {
  const port = process.env.HTTP_PORT || 3000;
  const host = process.env.HTTP_HOST || '127.0.0.1';

  logger.info(`[HTTP] Starting server with HTTP transport on ${host}:${port}`);

  const app = express();
  app.use(express.json());

  const transports = {};

  app.post('/mcp', async (req, res) => {
    const sessionId = req.headers['mcp-session-id'];
    let transport = transports[sessionId];

    if (sessionId && transports[sessionId]) {
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (newSessionId) => {
          logger.info(`[HTTP] New session initialized: ${newSessionId}`);
          transports[newSessionId] = transport;
        }
      });

      transport.onclose = () => {
        if (transport.sessionId) {
          logger.info(`[HTTP] Session closed: ${transport.sessionId}`);
          delete transports[transport.sessionId];
        }
      };
      
      await serverInstance.server.connect(transport);
    } else {
      logger.warn('[HTTP] Bad request: No valid session ID provided for non-initialize request.');
      return res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Bad Request: No valid session ID provided' },
        id: null,
      });
    }

    await transport.handleRequest(req, res, req.body);
  });

  const handleSessionRequest = async (req, res) => {
    const sessionId = req.headers['mcp-session-id'];
    if (!sessionId || !transports[sessionId]) {
      logger.warn(`[HTTP] Invalid or missing session ID for ${req.method} request.`);
      return res.status(400).send('Invalid or missing session ID');
    }
    
    const transport = transports[sessionId];
    await transport.handleRequest(req, res);
  };

  app.get('/mcp', handleSessionRequest);
  app.delete('/mcp', handleSessionRequest);

  app.listen(port, host, () => {
    logger.info(`[HTTP] MCP Streamable HTTP Server listening on http://${host}:${port}/mcp`);
  });
}

async function main() {
  logger.info('Preparing to start MCP MSSQL Server');
  
  const mcpServer = new MSSQLMCPServer();
  const transportType = getTransportArg();

  if (transportType === 'http') {
    await startHttpTransport(mcpServer);
  } else {
    await startStdioTransport(mcpServer);
  }
}

main().catch((error) => {
  logger.error('Failed to start server', { error: error.message, stack: error.stack });
  process.exit(1);
});