/**
 * Command Factory
 *
 * DRY command registration with common patterns abstracted
 */

import { Cli, z } from 'incur'
import type { CliVars, ErrorResult, CtaSpec } from '../types/index.js'

/** incur's `ok()` / `error()` return tagged objects (not `{ success, data }`). */
const INCUR_SENTINEL = Symbol.for('incur.sentinel')

function isIncurSentinelResult(value: unknown): value is Record<typeof INCUR_SENTINEL, 'ok' | 'error'> {
  return typeof value === 'object' && value !== null && INCUR_SENTINEL in value
}

// ============================================================================
// Command Factory Types
// ============================================================================

interface CommandSpec<TArgs extends z.ZodTypeAny, TOptions extends z.ZodTypeAny, TOutput> {
  name: string
  description: string
  args?: TArgs
  options?: TOptions
  output?: z.ZodType<TOutput>
  requireSdk?: boolean
  /** Use `ok` / `error` from context (incur sentinels), or return `ErrorResult` from helpers like `wrapSdkError`. */
  run: (ctx: CommandContext<TArgs, TOptions>) => Promise<unknown>
}

interface CommandContext<TArgs extends z.ZodTypeAny, TOptions extends z.ZodTypeAny> {
  args: z.infer<TArgs>
  options: z.infer<TOptions>
  vars: CliVars
  ok: <T>(data: T, meta?: { cta?: CtaSpec }) => unknown
  error: (err: { code: string; message: string; retryable?: boolean; cta?: CtaSpec }) => unknown
}

// ============================================================================
// Command Factory
// ============================================================================

export function createCommand<TArgs extends z.ZodTypeAny, TOptions extends z.ZodTypeAny, TOutput>(
  spec: CommandSpec<TArgs, TOptions, TOutput>
): any {
  return {
    description: spec.description,
    args: spec.args,
    options: spec.options,
    output: spec.output,
    run: async (ctx: {
      args: unknown
      options: unknown
      var: CliVars
      ok: (data: unknown, meta?: { cta?: CtaSpec }) => unknown
      error: (err: { code: string; message: string; retryable?: boolean; cta?: CtaSpec }) => never
    }) => {
      // Auto-check SDK if required
      if (spec.requireSdk && !(ctx.var as CliVars).sdk) {
        return ctx.error({
          code: 'NO_SDK',
          message: 'SDK not initialized. Configure wallet and chain first.',
          retryable: true,
          cta: {
            description: 'To configure:',
            commands: [
              { command: 'config wallet add', args: { name: 'default' } },
              { command: 'config set', options: { chain: 11155111 } },
            ],
          },
        })
      }

      try {
        const result = await spec.run({
          args: ctx.args as z.infer<TArgs>,
          options: ctx.options as z.infer<TOptions>,
          vars: ctx.var as CliVars,
          ok: ctx.ok as CommandContext<TArgs, TOptions>['ok'],
          error: ctx.error as CommandContext<TArgs, TOptions>['error'],
        })

        if (isIncurSentinelResult(result)) {
          return result
        }

        if (result && typeof result === 'object' && 'success' in result) {
          const r = result as ErrorResult | { success: true; data: TOutput; cta?: CtaSpec }
          if (!r.success) {
            return ctx.error(r.error as { code: string; message: string; retryable?: boolean; cta?: CtaSpec })
          }
          return r.cta ? ctx.ok(r.data, { cta: r.cta }) : ctx.ok(r.data)
        }

        return ctx.error({
          code: 'UNKNOWN_ERROR',
          message: 'Invalid command result',
          retryable: true,
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error occurred'
        return ctx.error({
          code: 'UNKNOWN_ERROR',
          message,
          retryable: true,
        })
      }
    },
  }
}

// ============================================================================
// Group Factory
// ============================================================================

export function createGroup(name: string, description: string): any {
  return Cli.create(name, { description })
}

// ============================================================================
// Common Schemas
// ============================================================================

export const CommonOptions = z.object({
  'wallet-name': z.string().optional().describe('Wallet name to use'),
  'private-key': z.string().optional().describe('Private key (0x...)'),
  'mnemonic': z.string().optional().describe('BIP-39 mnemonic phrase'),
})

export const AgentIdArg = z.object({
  'agent-id': z.string().describe('Agent ID (chainId:agentId or just agentId)'),
})

export const PaginationOptions = z.object({
  limit: z.number().default(20).describe('Max results'),
  offset: z.number().default(0).describe('Result offset'),
})

// ============================================================================
// Common CTAs
// ============================================================================

export const CTAS = {
  afterAgentCreate: (agentId: string): CtaSpec => ({
    description: 'Next steps:',
    commands: [
      { command: 'agent set-mcp', args: { 'agent-id': agentId }, description: 'Set MCP endpoint' },
      { command: 'agent add-skill', args: { 'agent-id': agentId }, description: 'Add OASF skill' },
      { command: 'agent register', args: { 'agent-id': agentId }, description: 'Register on-chain' },
    ],
  }),

  afterWalletAdd: (name: string): CtaSpec => ({
    description: 'Next steps:',
    commands: [
      { command: 'config set', options: { 'default-wallet': name }, description: 'Set as default wallet' },
      { command: 'agent create', args: { name: 'My Agent' }, description: 'Create an agent' },
    ],
  }),

  afterRegister: (agentId: string): CtaSpec => ({
    description: 'Next steps:',
    commands: [
      { command: 'search agent', args: { 'agent-id': agentId }, description: 'View agent details' },
      { command: 'search agents', description: 'Discover other agents' },
    ],
  }),

  afterFeedback: (agentId: string): CtaSpec => ({
    description: 'Next steps:',
    commands: [
      { command: 'feedback summary', args: { 'agent-id': agentId }, description: 'Check reputation' },
      { command: 'feedback list', args: { 'agent-id': agentId }, description: 'View all feedback' },
    ],
  }),
}
