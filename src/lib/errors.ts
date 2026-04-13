/**
 * Error Handling
 *
 * Centralized error factory and handling patterns
 */

import { ERROR_CODES, type ErrorCode, type ErrorResult, type CtaSpec } from '../types/index.js'

interface ErrorOptions {
  code?: ErrorCode
  message: string
  retryable?: boolean
  cta?: CtaSpec
}

/**
 * Create standardized error result
 */
export function createError(options: ErrorOptions): ErrorResult {
  const error: ErrorResult['error'] = {
    code: options.code || ERROR_CODES.UNKNOWN_ERROR,
    message: options.message,
    retryable: options.retryable ?? true,
  }
  if (options.cta !== undefined) {
    error.cta = options.cta
  }
  return {
    success: false,
    error,
  }
}

/**
 * Create error with CTA for wallet setup
 */
export function walletError(context: string): ErrorResult {
  return createError({
    code: ERROR_CODES.NO_WALLET,
    message: `${context}. No wallet configured.`,
    retryable: true,
    cta: {
      description: 'Configure a wallet:',
      commands: [
        { command: 'config wallet add', args: { name: 'default' }, description: 'Add a wallet' },
        { command: 'config set', options: { 'default-wallet': 'default' }, description: 'Set as default' },
      ],
    },
  })
}

/**
 * Create error for SDK initialization failure
 */
export function sdkError(message?: string): ErrorResult {
  return createError({
    code: ERROR_CODES.NO_SDK,
    message: message || 'SDK not initialized. Configure wallet and chain first.',
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

/**
 * Create error for agent not found
 */
export function agentNotFound(agentId: string): ErrorResult {
  return createError({
    code: ERROR_CODES.AGENT_NOT_FOUND,
    message: `Agent "${agentId}" not found`,
    retryable: false,
  })
}

/**
 * Create error for missing MCP/A2A endpoints
 */
export function missingEndpoint(type: 'MCP' | 'A2A'): ErrorResult {
  return createError({
    code: type === 'MCP' ? ERROR_CODES.NO_MCP : ERROR_CODES.NO_A2A,
    message: `Agent does not have a ${type} endpoint configured`,
    retryable: false,
    cta: {
      description: `To add ${type} endpoint:`,
      commands: [
        { command: `agent set-${type.toLowerCase()}`, args: { 'agent-id': '<id>' }, description: `Set ${type} endpoint` },
      ],
    },
  })
}

/**
 * Wrap SDK errors into standardized format
 */
export function wrapSdkError(error: unknown, code?: ErrorCode): ErrorResult {
  const message = error instanceof Error ? error.message : 'Unknown error occurred'
  return createError({
    code: code || ERROR_CODES.UNKNOWN_ERROR,
    message,
    retryable: true,
  })
}
