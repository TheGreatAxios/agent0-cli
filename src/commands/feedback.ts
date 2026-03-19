/**
 * Feedback Commands
 * 
 * Refactored with unified feedback patterns
 */

import { z } from 'zod'
import { createCommand, createGroup, CTAS, AgentIdArg, PaginationOptions } from '../lib/commands.js'
import { createError, wrapSdkError } from '../lib/errors.js'

// ============================================================================
// Schemas
// ============================================================================

const GiveFeedbackArgs = AgentIdArg.extend({
  value: z.number().min(0).max(100),
})

const GiveFeedbackOptions = z.object({
  tag1: z.string().optional(),
  tag2: z.string().optional(),
  text: z.string().optional(),
  'mcp-tool': z.string().optional(),
  'a2a-skills': z.array(z.string()).optional(),
  endpoint: z.string().url().optional(),
  'wait-confirmed': z.boolean().default(true),
})

const ListFeedbackOptions = PaginationOptions.extend({
  'min-value': z.number().optional(),
  'max-value': z.number().optional(),
  'include-revoked': z.boolean().default(false),
  capabilities: z.array(z.string()).optional(),
})

// ============================================================================
// Commands
// ============================================================================

const feedbackGive = createCommand({
  name: 'give',
  description: 'Give feedback to an agent',
  args: GiveFeedbackArgs,
  options: GiveFeedbackOptions,
  output: z.object({
    success: z.boolean(),
    feedbackId: z.string().optional(),
    txHash: z.string().optional(),
    value: z.number(),
    agentId: z.string(),
  }),
  requireSdk: true,
  run: async ({ args, options, vars, ok, error }) => {
    try {
      // Prepare off-chain feedback file if rich fields provided
      const feedbackFile = (options.text || options['mcp-tool'] || options['a2a-skills'])
        ? vars.sdk!.prepareFeedbackFile({
            text: options.text,
            mcpTool: options['mcp-tool'],
            a2aSkills: options['a2a-skills'],
          })
        : undefined

      const tx = await vars.sdk!.giveFeedback(
        args['agent-id'],
        args.value,
        options.tag1,
        options.tag2,
        options.endpoint,
        feedbackFile
      )

      let result: { success: true; data: { success: boolean; feedbackId?: string; txHash?: string; value: number; agentId: string }; cta: import('../types/index.js').CtaSpec }

      if (options['wait-confirmed']) {
        const confirmed = await tx.waitConfirmed({ timeoutMs: 180000 })
        result = ok(
          {
            success: true,
            feedbackId: confirmed.result?.id,
            txHash: confirmed.receipt?.transactionHash,
            value: args.value,
            agentId: args['agent-id'],
          },
          { cta: CTAS.afterFeedback(args['agent-id']) }
        )
      } else {
        result = ok(
          { success: true, txHash: tx.hash, value: args.value, agentId: args['agent-id'] },
          { cta: CTAS.afterFeedback(args['agent-id']) }
        )
      }

      return result
    } catch (err) {
      return wrapSdkError(err, 'FEEDBACK_ERROR')
    }
  },
})

const feedbackList = createCommand({
  name: 'list',
  description: 'List feedback for an agent',
  args: AgentIdArg,
  options: ListFeedbackOptions,
  output: z.object({
    count: z.number(),
    feedbacks: z.array(z.object({
      id: z.string(),
      reviewer: z.string(),
      value: z.number(),
      tag1: z.string().optional(),
      tag2: z.string().optional(),
      timestamp: z.number(),
    })),
  }),
  requireSdk: true,
  run: async ({ args, options, vars, ok, error }) => {
    try {
      const filters: Record<string, unknown> = { agentId: args['agent-id'] }

      if (options['min-value'] !== undefined || options['max-value'] !== undefined) {
        filters.minValue = options['min-value']
        filters.maxValue = options['max-value']
      }

      if (options['include-revoked']) filters.includeRevoked = true
      if (options.capabilities) filters.capabilities = options.capabilities

      const results = await vars.sdk!.searchFeedback(filters)

      return ok({
        count: results.length,
        feedbacks: results.map((fb: Record<string, unknown>) => ({
          id: fb.id as string,
          reviewer: fb.reviewer as string,
          value: fb.value as number,
          tag1: fb.tag1 as string | undefined,
          tag2: fb.tag2 as string | undefined,
          timestamp: fb.timestamp as number,
        })),
      })
    } catch (err) {
      return wrapSdkError(err, 'FEEDBACK_ERROR')
    }
  },
})

const feedbackSummary = createCommand({
  name: 'summary',
  description: 'Get reputation summary for an agent',
  args: AgentIdArg,
  output: z.object({
    agentId: z.string(),
    feedbackCount: z.number(),
    averageValue: z.number(),
    minValue: z.number(),
    maxValue: z.number(),
    distribution: z.record(z.number()),
  }),
  requireSdk: true,
  run: async ({ args, vars, ok, error }) => {
    try {
      const summary = await vars.sdk!.getReputationSummary(args['agent-id'])

      return ok({
        agentId: args['agent-id'],
        feedbackCount: summary.feedbackCount || 0,
        averageValue: summary.averageValue || 0,
        minValue: summary.minValue || 0,
        maxValue: summary.maxValue || 0,
        distribution: summary.distribution || {},
      })
    } catch (err) {
      return wrapSdkError(err, 'FEEDBACK_ERROR')
    }
  },
})

const feedbackGivenBy = createCommand({
  name: 'given-by',
  description: 'List feedback given by a reviewer',
  args: z.object({ reviewer: z.string() }),
  options: PaginationOptions,
  output: z.object({
    count: z.number(),
    feedbacks: z.array(z.object({
      id: z.string(),
      agentId: z.string(),
      value: z.number(),
      timestamp: z.number(),
    })),
  }),
  requireSdk: true,
  run: async ({ args, options, vars, ok, error }) => {
    try {
      const results = await vars.sdk!.searchFeedback({ reviewers: [args.reviewer] })

      return ok({
        count: results.length,
        feedbacks: results.map((fb: Record<string, unknown>) => ({
          id: fb.id as string,
          agentId: fb.agentId as string,
          value: fb.value as number,
          timestamp: fb.timestamp as number,
        })),
      })
    } catch (err) {
      return wrapSdkError(err, 'FEEDBACK_ERROR')
    }
  },
})

// ============================================================================
// Group Assembly
// ============================================================================

export const feedbackGroup = createGroup('feedback', 'Give and retrieve agent feedback')
feedbackGroup.command('give', feedbackGive)
feedbackGroup.command('list', feedbackList)
feedbackGroup.command('summary', feedbackSummary)
feedbackGroup.command('given-by', feedbackGivenBy)
