#!/bin/bash
# Search and Discovery Example

set -e

echo "=== Agent Discovery Example ==="
echo

# Search by various criteria
echo "1. Search for agents with MCP endpoints:"
ag0 search agents --has-mcp --limit 3 || true
echo

echo "2. Search for agents with specific tools:"
ag0 search agents --mcp-tools code_generation --limit 3 || true
echo

echo "3. Search by name:"
ag0 search agents --name "AI" --active --limit 5 || true
echo

echo "4. Multi-chain search including SKALE:"
ag0 search agents --chains 11155111,1,1187947933 --active --limit 5 || true
echo

echo "6. Get agent details (example - may not exist):"
ag0 search agent 11155111:1 || echo "Agent not found - use real ID"
ag0 search agent 1187947933:1 || echo "SKALE agent not found - use real ID"
echo

echo "5. Search by reputation:"
ag0 search agents --min-feedback 80 --limit 5 || true
echo

# Browse taxonomies
echo "7. Browse OASF skills:"
ag0 search skills
echo

echo "8. Browse OASF domains:"
ag0 search domains
echo

echo "=== Discovery Example Complete ==="
