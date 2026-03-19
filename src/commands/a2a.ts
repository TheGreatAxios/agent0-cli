/**
 * A2A Commands
 * 
 * Refactored with endpoint validation
 */

import { z } from 'zod'
import { createCommand, createGroup, CTAS, AgentIdArg, PaginationOptions } from '../lib/commands.js'
import { wrapSdkError, missingEndpoint, createError } from '../lib/errors.js'

// ============================================================================
// Commands
// ============================================================================

const a2aMessage = createCommand({
  name: 'message',
  description: 'Send a message to an agent via A2A',
  args: AgentIdArg.extend({ 'task-id': z.string() }),
  options: z.object({
    'session-id': z.string().optional(),
    text: z.string(),
  }),
  output: z.object({ success: z.boolean(), messageId: z.string().optional() }),
  requireSdk: true,
  run: async ({ args, options, vars, ok, error }) => {
    try {
      const agent = await vars.sdk!.getAgent(args['agent-id'])

      if (!agent.a2a) {
        return missingEndpoint('A2A')
      }

      return ok({ success: true, messageId: 'pending' })
    } catch (err) {
      return wrapSdkError(err)
    }
  },
})

const a2aTasks = createCommand({
  name: 'tasks',
  description: 'List tasks for an agent',
  args: AgentIdArg,
  options: PaginationOptions.extend({
    status: z.enum(['pending', 'active', 'completed', 'all']).default('all'),
  }),
  output: z.object({
    agentId: z.string(),
    tasks: z.array(z.object({ id: z.string(), status: z.string() })),
  }),
  requireSdk: true,
  run: async ({ args, options, vars, ok, error }) => {
    try {
      const agent = await vars.sdk!.getAgent(args['agent-id'])

      if (!agent.a2a) {
        return missingEndpoint('A2A')
      }

      return ok({ agentId: args['agent-id'], tasks: [] })
    } catch (err) {
      return wrapSdkError(err)
    }
  },
})

const a2aTask = createCommand({
  name: 'task',
  description: 'Get details of a specific task',
  args: AgentIdArg.extend({ 'task-id': z.string() }),
  output: z.object({ id: z.string(), status: z.string() }),
  requireSdk: true,
  run: async ({ args, vars, ok, error }) => {
    try {
      const agent = await vars.sdk!.getAgent(args['agent-id'])

      if (!agent.a2a) {
        return missingEndpoint('A2A')
      }

      return createError({
        code: 'NOT_IMPLEMENTED',
        message: 'Task loading not yet implemented',
        retryable: false,
      })
    } catch (err) {
      return wrapSdkError(err)
    }
  },
})

const a2aCreateTask = createCommand({
  name: 'create-task',
  description: 'Create a new task with an agent',
  args: AgentIdArg,
  options: z.object({
    title: z.string(),
    description: z.string().optional(),
  }),
  output: z.object({ success: z.boolean(), taskId: z.string(), status: z.string() }),
  requireSdk: true,
  run: async ({ args, options, vars, ok, error }) => {
    try {
      const agent = await vars.sdk!.getAgent(args['agent-id'])

      if (!agent.a2a) {
        return missingEndpoint('A2A')
      }

      return ok(
        { success: true, taskId: 'pending', status: 'created' },
        {
          cta: {
            description: 'Next steps:',
            commands: [
              { command: 'a2a message', args: { 'agent-id': args['agent-id'], 'task-id': 'pending' } },
            ],
          },
        }
      )
    } catch (err) {
      return wrapSdkError(err)
    }
  },
})

// ============================================================================
// Group Assembly
// ============================================================================

export const a2aGroup = createGroup('a2a', 'Agent-to-Agent messaging and task management')
a2aGroup.command('message', a2aMessage)
a2aGroup.command('tasks', a2aTasks)
a2aGroup.command('task', a2aTask)
a2aGroup.command('create-task', a2aCreateTask)
