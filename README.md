# MCP MS SQL Server

A **Model Context Protocol (MCP) server** that provides direct access to Microsoft SQL Server databases. This server implements the MCP specification using STDIO transport, enabling AI assistants and other MCP-compatible clients to interact with SQL Server databases through structured tools.

## 🚀 Features

- **Direct SQL Execution**: Execute any SQL query against your MS SQL Server database
- **Database Schema Discovery**: List tables and inspect table structures
- **Parameterized Queries**: Support for safe parameterized SQL statements
- **Comprehensive Logging**: File-based logging with Winston for debugging and monitoring
- **MCP Protocol Compliance**: Full implementation of the Model Context Protocol
- **STDIO Transport**: Uses standard input/output for seamless integration

## 🛠️ Available Tools

### `execute_sql_query`
Execute any SQL query against the connected database.

**Parameters:**
- `query` (required): The SQL query to execute
- `parameters` (optional): Array of parameters for prepared statements

**Example:**
```json
{
  "query": "SELECT TOP 10 * FROM Users WHERE created_date > @date",
  "parameters": [
    {
      "name": "date",
      "type": "datetime",
      "value": "2024-01-01"
    }
  ]
}
```

### `list_tables`
Retrieve a list of all tables in the connected database.

**Parameters:** None

**Returns:** List of table names with their schemas.

### `describe_table`
Get detailed schema information for a specific table.

**Parameters:**
- `table_name` (required): Name of the table to describe

**Returns:** Column definitions including data types, constraints, and metadata.

## 📋 Prerequisites

- Node.js 16 or higher
- Access to a Microsoft SQL Server database
- Network connectivity to your SQL Server instance

## ⚙️ Installation & Setup

1. **Install dependencies:**
   ```bash
   cd claude
   npm install
   ```

2. **Configure environment variables:**
   
   Create a `.env` file in the `claude/` directory:
   ```env
   DB_SERVER=your_server_address
   DB_USER=your_database_user
   DB_PASSWORD=your_database_password
   DB_DATABASE_NAME=your_database_name
   DB_PORT=1433
   ```

3. **Test the connection:**
   ```bash
   node test.js
   ```

4. **Run the server:**
   ```bash
   node index.js
   ```

## 🔧 Configuration

### Required Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DB_SERVER` | SQL Server hostname or IP address | `localhost` or `myserver.database.windows.net` |
| `DB_USER` | Database username | `sa` or `myuser@mydomain.com` |
| `DB_PASSWORD` | Database password | `MySecurePassword123` |
| `DB_DATABASE_NAME` | Target database name | `MyDatabase` |

### Optional Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DB_PORT` | SQL Server port | `1433` |

## 🔌 MCP Integration

This server is designed to work with MCP-compatible clients. To use it with **Claude Desktop**, add this configuration to your MCP settings:

```json
{
  "mcpServers": {
    "mssql-server": {
      "command": "node",
      "args": ["/path/to/your/claude/index.js"]
    }
  }
}
```

## 📁 Project Structure

```
claude/
├── index.js          # Main MCP server implementation
├── package.json      # Node.js dependencies and scripts
├── test.js          # Test client for development
├── logs/            # Log files (created automatically)
│   ├── error.log    # Error-level logs only
│   └── combined.log # All log levels
└── README.md        # This file
```

## 🧪 Testing

The included test client (`test.js`) demonstrates basic server functionality:

```bash
node test.js
```

This will:
- Start the MCP server
- Initialize the MCP protocol
- List available tools
- Test database connectivity
- Execute sample queries

## 📊 Logging

The server uses Winston for comprehensive logging:

- **Error logs**: `logs/error.log` - Contains only error-level messages
- **Combined logs**: `logs/combined.log` - Contains all log levels (debug, info, warn, error)
- **Console output**: Redirected to file logging to maintain clean MCP protocol communication

Log entries include timestamps and are formatted as JSON for easy parsing.

## 🔒 Security Considerations

- **Credentials**: Store database credentials securely in environment variables
- **Network**: Ensure your SQL Server is accessible from the server environment
- **Permissions**: Use a database user with minimal required permissions
- **Queries**: This server executes raw SQL - ensure proper access controls

## 🚨 Troubleshooting

### Common Issues

**Connection Failed**
- Verify database credentials in `.env` file
- Check network connectivity to SQL Server
- Ensure SQL Server is accepting connections on the specified port

**Permission Denied**
- Verify database user has appropriate permissions
- Check if SQL Server authentication is enabled

**MCP Protocol Errors**
- Ensure client is sending properly formatted MCP requests
- Check logs in `logs/` directory for detailed error information

### Debug Mode

Monitor the log files for detailed information:
```bash
# Watch error logs
tail -f logs/error.log

# Watch all logs
tail -f logs/combined.log
```

## 📦 Dependencies

- **@modelcontextprotocol/sdk**: MCP protocol implementation
- **mssql**: Microsoft SQL Server client for Node.js
- **dotenv**: Environment variable management
- **winston**: Logging framework

## 🤝 Integration Examples

### With Claude Desktop
Configure in your MCP settings and use natural language:
- "Show me all tables in the database"
- "Describe the Users table structure"
- "Execute: SELECT COUNT(*) FROM Orders WHERE status = 'completed'"

### Programmatic Usage
Send JSON-RPC requests via STDIO:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "list_tables",
    "arguments": {}
  }
}
```

## 📄 License

MIT License - see package.json for details

## 🛣️ Roadmap

- Connection pooling for better performance
- Query result caching
- Additional database introspection tools
- Support for stored procedure execution
- Query execution timeouts and limits 