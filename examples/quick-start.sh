#!/bin/bash
# Quick Start Example - Create and register a basic agent

set -e

echo "=== Agent0 CLI Quick Start ==="
echo

# Check if ag0 is installed
if ! command -v ag0 &> /dev/null; then
    echo "Error: ag0 CLI not found. Install with: npm install -g agent0-cli"
    exit 1
fi

# Check for wallet
if [ -z "$AGENT0_PRIVATE_KEY" ]; then
    echo "Note: Set AGENT0_PRIVATE_KEY environment variable for write operations"
    echo "Continuing in read-only mode..."
    echo
fi

# Show current config
echo "1. Current configuration:"
ag0 config show
echo

# Search for agents (read-only)
echo "2. Searching for active agents..."
ag0 search agents --active --limit 5 || true
echo

echo "=== Quick Start Complete ==="
echo
echo "Next steps:"
echo "  - Configure wallet: ag0 config wallet add dev --private-key \$KEY"
echo "  - Create agent: ag0 agent create \"My Agent\" \"Description\""
echo "  - Set MCP: ag0 agent set-mcp <id> https://mcp.example.com/"
echo "  - Register: ag0 agent register <id> --ipfs"
