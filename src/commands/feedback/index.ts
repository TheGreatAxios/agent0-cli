/**
 * Feedback Commands - Reputation and feedback management
 */

import type { Cli } from 'incur'
import { z } from 'zod'

export function registerFeedbackCommands(cli: Cli<unknown>): void {
  const feedback = Cli.create('feedback', {
    description: 'Give and retrieve agent feedback',
  })

  feedback.command('give', {
    description: 'Give feedback to an agent',
    args: z.object({
      'agent-id': z.string().describe('Target agent ID'),
      value: z.number().min(0).max(100).describe('Feedback value (0-100)'),
    }),
    options: z.object({
      tag1: z.string().optional().describe('First tag'),
      tag2: z.string().optional().describe('Second tag'),
      text: z.string().optional().describe('Optional text feedback'),
      'mcp-tool': z.string().optional().describe('MCP tool being reviewed'),
      'a2a-skills': z.array(z.string()).optional().describe('A2A skills being reviewed'),
      endpoint: z.string().url().optional().describe('Feedback endpoint URL'),
      'wait-confirmed': z.boolean().default(true).describe('Wait for transaction confirmation'),
    }),
    output: z.object({
      success: z.boolean(),
      feedbackId: z.string().optional(),
      txHash: z.string().optional(),
      value: z.number(),
      agentId: z.string(),
    }),
    examples: [
      { args: { 'agent-id': '11155111:123', value: 85 }, description: 'Give simple rating' },
      { args: { 'agent-id': '11155111:123', value: 95 }, options: { text: 'Excellent agent!' }, description: 'Give feedback with text' },
    ],
    async run(c) {
      const sdk = c.var.sdk
      if (!sdk) {
        return c.error({
          code: 'NO_SDK',
          message: 'SDK not initialized',
          retryable: true,
        })
      }

      try {
        // Prepare off-chain feedback file if rich fields provided
        let feedbackFile
        if (c.options.text || c.options['mcp-tool'] || c.options['a2a-skills']) {
          feedbackFile = sdk.prepareFeedbackFile({
            text: c.options.text,
            mcpTool: c.options['mcp-tool'],
            a2aSkills: c.options['a2a-skills'],
          })
        }

        const tx = await sdk.giveFeedback(
          c.args['agent-id'],
          c.args.value,
          c.options.tag1,
          c.options.tag2,
          c.options.endpoint,
          feedbackFile
        )

        let result
        if (c.options['wait-confirmed']) {
          const confirmed = await tx.waitConfirmed({ timeoutMs: 180000 })
          result = {
            success: true,
            feedbackId: confirmed.result?.id,
            txHash: confirmed.receipt?.transactionHash,
            value: c.args.value,
            agentId: c.args['agent-id'],
          }
        } else {
          result = {
            success: true,
            txHash: tx.hash,
            value: c.args.value,
            agentId: c.args['agent-id'],
          }
        }

        return c.ok(result, {
          cta: {
            description: 'Next steps:',
            commands: [
              { command: 'feedback summary', args: { 'agent-id': c.args['agent-id'] }, description: 'Check updated reputation' },
              { command: 'feedback list', args: { 'agent-id': c.args['agent-id'] }, description: 'View all feedback' },
            ],
          },
        })
      } catch (err) {
        return c.error({
          code: 'FEEDBACK_ERROR',
          message: err instanceof Error ? err.message : 'Failed to submit feedback',
          retryable: true,
        })
      }
    },
  })

  feedback.command('list', {
    description: 'List feedback for an agent',
    args: z.object({
      'agent-id': z.string().describe('Agent ID'),
    }),
    options: z.object({
      'min-value': z.number().optional().describe('Minimum feedback value'),
      'max-value': z.number().optional().describe('Maximum feedback value'),
      'include-revoked': z.boolean().default(false).describe('Include revoked feedback'),
      capabilities: z.array(z.string()).optional().describe('Filter by capabilities'),
      limit: z.number().default(20).describe('Max results'),
    }),
    output: z.object({
      count: z.number(),
      feedbacks: z.array(z.object({
        id: z.string(),
        reviewer: z.string(),
        value: z.number(),
        tag1: z.string().optional(),
        tag2: z.string().optional(),
        timestamp: z.number(),
        text: z.string().optional(),
        mcpTool: z.string().optional(),
      })),
    }),
    async run(c) {
      const sdk = c.var.sdk
      if (!sdk) {
        return c.error({
          code: 'NO_SDK',
          message: 'SDK not initialized',
          retryable: true,
        })
      }

      try {
        const filters: Record<string, unknown> = {
          agentId: c.args['agent-id'],
        }

        if (c.options['min-value'] !== undefined || c.options['max-value'] !== undefined) {
          filters.minValue = c.options['min-value']
          filters.maxValue = c.options['max-value']
        }

        if (c.options['include-revoked']) {
          filters.includeRevoked = c.options['include-revoked']
        }

        if (c.options.capabilities) {
          filters.capabilities = c.options.capabilities
        }

        const results = await sdk.searchFeedback(filters)

        return {
          count: results.length,
          feedbacks: results.map((fb: Record<string, unknown>) => ({
            id: fb.id as string,
            reviewer: fb.reviewer as string,
            value: fb.value as number,
            tag1: fb.tag1 as string | undefined,
            tag2: fb.tag2 as string | undefined,
            timestamp: fb.timestamp as number,
            text: fb.text as string | undefined,
            mcpTool: fb.mcpTool as string | undefined,
          })),
        }
      } catch (err) {
        return c.error({
          code: 'LIST_FEEDBACK_ERROR',
          message: err instanceof Error ? err.message : 'Failed to list feedback',
          retryable: true,
        })
      }
    },
  })

  feedback.command('summary', {
    description: 'Get reputation summary for an agent',
    args: z.object({
      'agent-id': z.string().describe('Agent ID'),
    }),
    output: z.object({
      agentId: z.string(),
      feedbackCount: z.number(),
      averageValue: z.number(),
      minValue: z.number(),
      maxValue: z.number(),
      distribution: z.record(z.number()),
    }),
    async run(c) {
      const sdk = c.var.sdk
      if (!sdk) {
        return c.error({
          code: 'NO_SDK',
          message: 'SDK not initialized',
          retryable: true,
        })
      }

      try {
        const summary = await sdk.getReputationSummary(c.args['agent-id'])

        return {
          agentId: c.args['agent-id'],
          feedbackCount: summary.feedbackCount || 0,
          averageValue: summary.averageValue || 0,
          minValue: summary.minValue || 0,
          maxValue: summary.maxValue || 0,
          distribution: summary.distribution || {},
        }
      } catch (err) {
        return c.error({
          code: 'SUMMARY_ERROR',
          message: err instanceof Error ? err.message : 'Failed to get reputation summary',
          retryable: true,
        })
      }
    },
  })

  feedback.command('given-by', {
    description: 'List feedback given by a reviewer',
    args: z.object({
      reviewer: z.string().describe('Reviewer wallet address'),
    }),
    options: z.object({
      limit: z.number().default(20).describe('Max results'),
    }),
    output: z.object({
      count: z.number(),
      feedbacks: z.array(z.object({
        id: z.string(),
        agentId: z.string(),
        agentName: z.string(),
        value: z.number(),
        tag1: z.string().optional(),
        tag2: z.string().optional(),
        timestamp: z.number(),
      })),
    }),
    async run(c) {
      const sdk = c.var.sdk
      if (!sdk) {
        return c.error({
          code: 'NO_SDK',
          message: 'SDK not initialized',
          retryable: true,
        })
      }

      try {
        const results = await sdk.searchFeedback({
          reviewers: [c.args.reviewer],
        })

        return {
          count: results.length,
          feedbacks: results.map((fb: Record<string, unknown>) => ({
            id: fb.id as string,
            agentId: fb.agentId as string,
            agentName: fb.agentName as string,
            value: fb.value as number,
            tag1: fb.tag1 as string | undefined,
            tag2: fb.tag2 as string | undefined,
            timestamp: fb.timestamp as number,
          })),
        }
      } catch (err) {
        return c.error({
          code: 'LIST_GIVEN_ERROR',
          message: err instanceof Error ? err.message : 'Failed to list feedback',
          retryable: true,
        })
      }
    },
  })

  cli.command(feedback)
}
