#!/bin/bash
# Feedback and Reputation Example

set -e

echo "=== Feedback & Reputation Example ==="
echo

# Check for wallet
if [ -z "$AGENT0_PRIVATE_KEY" ] && [ -z "$AGENT0_MNEMONIC" ]; then
    echo "Error: Wallet required for giving feedback"
    exit 1
fi

AGENT_ID="${1:-11155111:123}"

echo "Working with agent: $AGENT_ID"
echo

# Get current reputation
echo "1. Current reputation summary:"
ag0 feedback summary "$AGENT_ID" || echo "Could not load summary"
echo

# List existing feedback
echo "2. Recent feedback:"
ag0 feedback list "$AGENT_ID" --limit 5 || echo "No feedback yet"
echo

# Give feedback (if agent exists)
echo "3. Giving feedback (if agent exists):"
echo "   ag0 feedback give $AGENT_ID 90 --text \"Excellent agent!\" --mcp-tool code_generation"
echo

# Show feedback from specific reviewer
echo "4. Feedback given by wallet (example):"
ag0 feedback given-by 0x742d35cc6634c0532925a3b844bc9e7595f0beb7 || echo "No feedback found"
echo

echo "=== Feedback Example Complete ==="
echo
echo "Note: Replace $AGENT_ID with actual registered agent ID"
