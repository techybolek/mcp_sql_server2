# mcp-mssql-server

A Model Context Protocol (MCP) server that provides a standardized interface for AI models to interact with MS SQL Server databases. This server implements the MCP specification to enable seamless database operations through a consistent API.

## Features

- Execute SQL queries with parameter support
- List all tables in the database
- Describe table schemas
- Support for both stdio and HTTP transport modes
- Comprehensive logging system
- Environment-based configuration
- Error handling and graceful shutdown

## Prerequisites

- Node.js (version that supports ES modules)
- MS SQL Server instance
- Access credentials for the database

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

You can also install the package globally:
```bash
npm install -g mcp-mssql-server
```

3. Create a `.env` file in the project root with the following required variables:
```env
DB_SERVER=your_server_address
DB_USER=your_username
DB_PASSWORD=your_password
DB_DATABASE_NAME=your_database_name
```

## Usage

The server can be started in two different transport modes:

### stdio Mode (Default)
```bash
npm start
# or
npm run start:stdio
```

### HTTP Mode
```bash
npm run start:http
```

### Development Mode
```bash
npm run dev
```

### JSON-RPC Protocol

The server implements the JSON-RPC 2.0 protocol with the following key methods:

1. `initialize` - Initialize the server connection:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {}
    },
    "clientInfo": {
      "name": "your-client",
      "version": "1.0.0"
    }
  }
}
```

2. `tools/list` - List available tools
3. `tools/call` - Call a specific tool

## Testing

The package includes a test client (`test.package.js`) that demonstrates how to interact with the MCP server:

```bash
node test.package.js
```

The test client implements an `MCPTestClient` class that:
- Spawns a server process using `npx mcp-mssql-server`
- Initializes the connection with protocol version '2024-11-05'
- Lists available tools
- Executes sample queries including:
  - Listing all tables
  - Running a specific SQL query to count documents
- Handles server responses and errors through stdio streams
- Includes proper error handling and process cleanup

Example test query from the client:
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "execute_sql_query",
    "arguments": {
      "query": "SELECT COUNT(*) as document_count FROM document_new"
    }
  }
}
```

The test client provides a simple way to verify the server's functionality and can serve as a reference for implementing your own client.

## Available Tools

The server provides the following MCP tools:

### 1. execute_sql_query
Execute SQL queries against the database with optional parameterization.

```json
{
  "query": "SELECT * FROM Users WHERE id = @userId",
  "parameters": [
    {
      "name": "userId",
      "type": "int",
      "value": 1
    }
  ]
}
```

### 2. list_tables
List all available tables in the connected database.

### 3. describe_table
Get detailed schema information for a specific table.

```json
{
  "table_name": "Users"
}
```

## Logging

Logs are stored in the `logs` directory:
- `error.log`: Error-level logs
- `combined.log`: All logs

In HTTP mode, logs are also output to the console.

## Dependencies

Main dependencies:
- @modelcontextprotocol/sdk: ^1.13.0
- dotenv: ^16.4.5
- express: ^5.1.0
- mssql: ^11.0.1
- winston: ^3.11.0

Development dependencies:
- axios: ^1.10.0

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request 