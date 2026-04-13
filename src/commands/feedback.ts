/**
 * Feedback Commands
 *
 * Refactored with unified feedback patterns
 */

import type { Feedback, FeedbackFileInput, FeedbackSearchFilters, FeedbackSearchOptions } from 'agent0-sdk'
import { z } from 'zod'
import { createCommand, createGroup, CTAS, AgentIdArg, PaginationOptions } from '../lib/commands.js'
import { wrapSdkError } from '../lib/errors.js'

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

function buildFeedbackFileInput(options: z.infer<typeof GiveFeedbackOptions>): FeedbackFileInput | undefined {
  if (!options.text && !options['mcp-tool'] && !options['a2a-skills']) return undefined
  const input: FeedbackFileInput = {}
  if (options.text !== undefined) input.text = options.text
  if (options['mcp-tool'] !== undefined) input.mcpTool = options['mcp-tool']
  if (options['a2a-skills'] !== undefined) input.a2aSkills = options['a2a-skills']
  return input
}

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
  run: async ({ args, options, vars, ok }) => {
    try {
      const feedbackFileInput = buildFeedbackFileInput(options)
      const feedbackFile = feedbackFileInput ? vars.sdk!.prepareFeedbackFile(feedbackFileInput) : undefined

      const tx = await vars.sdk!.giveFeedback(
        args['agent-id'],
        args.value,
        options.tag1,
        options.tag2,
        options.endpoint,
        feedbackFile
      )

      if (options['wait-confirmed']) {
        const confirmed = await tx.waitConfirmed({ timeoutMs: 180000 })
        const fid = confirmed.result?.id
        return ok(
          {
            success: true,
            feedbackId: typeof fid === 'string' ? fid : JSON.stringify(fid),
            txHash: confirmed.receipt.transactionHash,
            value: args.value,
            agentId: args['agent-id'],
          },
          { cta: CTAS.afterFeedback(args['agent-id']) }
        )
      }

      return ok(
        { success: true, txHash: tx.hash, value: args.value, agentId: args['agent-id'] },
        { cta: CTAS.afterFeedback(args['agent-id']) }
      )
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
  run: async ({ args, options, vars, ok }) => {
    try {
      const filters: FeedbackSearchFilters = { agentId: args['agent-id'] }
      if (options['include-revoked']) filters.includeRevoked = true
      if (options.capabilities) filters.capabilities = options.capabilities

      const searchOpts: FeedbackSearchOptions = {}
      if (options['min-value'] !== undefined) searchOpts.minValue = options['min-value']
      if (options['max-value'] !== undefined) searchOpts.maxValue = options['max-value']

      const results = await vars.sdk!.searchFeedback(filters, searchOpts)

      return ok({
        count: results.length,
        feedbacks: (results as Feedback[]).map((fb) => ({
          id: typeof fb.id === 'string' ? fb.id : JSON.stringify(fb.id),
          reviewer: String(fb.reviewer),
          value: Number(fb.value ?? 0),
          tag1: fb.tags[0],
          tag2: fb.tags[1],
          timestamp: typeof fb.createdAt === 'number' ? fb.createdAt : Number(fb.createdAt),
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
  }),
  requireSdk: true,
  run: async ({ args, vars, ok }) => {
    try {
      const summary = await vars.sdk!.getReputationSummary(args['agent-id'])

      return ok({
        agentId: args['agent-id'],
        feedbackCount: summary.count,
        averageValue: summary.averageValue,
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
  run: async ({ args, vars, ok }) => {
    try {
      const results = await vars.sdk!.searchFeedback({ reviewers: [args.reviewer] }, {})

      return ok({
        count: results.length,
        feedbacks: (results as Feedback[]).map((fb) => ({
          id: typeof fb.id === 'string' ? fb.id : JSON.stringify(fb.id),
          agentId: String(fb.agentId),
          value: Number(fb.value ?? 0),
          timestamp: typeof fb.createdAt === 'number' ? fb.createdAt : Number(fb.createdAt),
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
