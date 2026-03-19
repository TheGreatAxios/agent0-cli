#!/bin/bash
# Register Agent Example - Full registration workflow

set -e

echo "=== Agent Registration Example ==="
echo

# Verify wallet is configured
if [ -z "$AGENT0_PRIVATE_KEY" ] && [ -z "$AGENT0_MNEMONIC" ]; then
    echo "Error: No wallet configured. Set AGENT0_PRIVATE_KEY or add a wallet:"
    echo "  ag0 config wallet add default --private-key \$PRIVATE_KEY"
    exit 1
fi

# Step 1: Create agent
echo "1. Creating agent..."
ag0 agent create "Code Assistant" "AI agent specialized in code generation and analysis"
echo

# Step 2: Set endpoints (using 'local' as placeholder - would use actual ID after creation)
echo "2. Setting endpoints (run with actual agent ID):"
echo "   ag0 agent set-mcp <agent-id> https://mcp.code-assistant.example.com/"
echo "   ag0 agent set-a2a <agent-id> https://a2a.code-assistant.example.com/card.json"
echo

# Step 3: Add capabilities
echo "3. Adding OASF capabilities (run with actual agent ID):"
echo "   ag0 agent add-skill <agent-id> natural_language_processing/code_generation"
echo "   ag0 agent add-skill <agent-id> natural_language_processing/code_analysis"
echo "   ag0 agent add-domain <agent-id> technology/software_development"
echo

# Step 4: Set trust model
echo "4. Configuring trust model (run with actual agent ID):"
echo "   ag0 agent set-trust <agent-id> --reputation --crypto-economic"
echo

# Step 5: Register
echo "5. Registering on-chain (run with actual agent ID):"
echo "   ag0 agent register <agent-id> --ipfs"
echo

echo "=== Registration Workflow Complete ==="
echo
echo "Note: In production, save the agent ID returned from registration"
