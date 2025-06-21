# MCP MS SQL Server

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

- @modelcontextprotocol/sdk: ^1.13.0
- dotenv: ^16.4.5
- express: ^5.1.0
- mssql: ^11.0.1
- winston: ^3.11.0

## License

MIT

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request 