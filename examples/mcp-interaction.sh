#!/bin/bash
# MCP Interaction Example

set -e

echo "=== MCP Interaction Example ==="
echo

AGENT_ID="${1:-11155111:123}"

echo "Working with agent: $AGENT_ID"
echo

# Discover MCP capabilities
echo "1. Listing MCP tools:"
ag0 mcp tools "$AGENT_ID" || echo "Agent has no MCP endpoint"
echo

echo "2. Listing MCP prompts:"
ag0 mcp prompts "$AGENT_ID" || echo "Agent has no MCP endpoint"
echo

echo "3. Listing MCP resources:"
ag0 mcp resources "$AGENT_ID" || echo "Agent has no MCP endpoint"
echo

# Call MCP tool
echo "4. Calling MCP tool (example):"
echo "   ag0 mcp call $AGENT_ID generate_code --params '{\"language\":\"typescript\",\"task\":\"hello world\"}'"
echo

# Batch operations
echo "5. Batch tool discovery across multiple agents:"
echo "   for agent in agent1 agent2 agent3; do"
echo "     ag0 mcp tools \$agent --format json"
echo "   done"
echo

echo "=== MCP Example Complete ==="
echo
echo "Note: Ensure agent has MCP endpoint configured"
