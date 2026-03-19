#!/bin/bash
# SKALE Base Mainnet Example

set -e

echo "=== SKALE Base Mainnet Example ==="
echo

# Configure for SKALE
echo "1. Configuring for SKALE Base Mainnet (Chain ID: 1187947933)..."
ag0 config set --chain 1187947933
echo

# Verify subgraph is being used
echo "2. Current configuration (auto-uses Goldsky subgraph):"
ag0 config show
echo

# Search for agents on SKALE
echo "3. Searching for agents on SKALE Base Mainnet..."
ag0 search agents --chains 1187947933 --limit 5 || echo "No agents found or network error"
echo

# Example agent creation workflow
echo "4. To create and register an agent on SKALE:"
echo "   ag0 agent create \"SKALE Agent\" \"Agent running on SKALE network\""
echo "   ag0 agent set-mcp <id> https://mcp.skale-agent.example.com/"
echo "   ag0 agent register <id> --ipfs"
echo

# Multi-chain search example
echo "5. Multi-chain search including SKALE:"
echo "   ag0 search agents --chains 1,8453,1187947933 --active"
echo

echo "=== SKALE Example Complete ==="
echo
echo "Note: SKALE Base Mainnet uses:"
echo "  - Chain ID: 1187947933"
echo "  - Native currency: CREDIT"
echo "  - Subgraph: Goldsky (auto-configured)"
echo "  - Explorer: https://skale-base-explorer.skalenodes.com"
