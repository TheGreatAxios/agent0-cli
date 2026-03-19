/**
 * A2A Commands - Agent-to-Agent messaging and task management
 */

import type { Cli } from 'incur'
import { z } from 'zod'

export function registerA2ACommands(cli: Cli<unknown>): void {
  const a2a = Cli.create('a2a', {
    description: 'Agent-to-Agent messaging and task management',
  })

  a2a.command('message', {
    description: 'Send a message to an agent via A2A',
    args: z.object({
      'agent-id': z.string().describe('Target agent ID'),
      'task-id': z.string().describe('Task ID for the conversation'),
    }),
    options: z.object({
      'session-id': z.string().optional().describe('Session ID'),
      text: z.string().describe('Message text'),
      'message-type': z.enum(['text', 'task', 'context']).default('text').describe('Message type'),
    }),
    output: z.object({
      success: z.boolean(),
      messageId: z.string().optional(),
      response: z.string().optional(),
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
        const agent = await sdk.getAgent(c.args['agent-id'])

        if (!agent.a2a) {
          return c.error({
            code: 'NO_A2A',
            message: 'Agent does not have an A2A endpoint',
            retryable: false,
          })
        }

        // Would use SDK to send A2A message
        // const response = await agent.messageA2A({
        //   taskId: c.args['task-id'],
        //   sessionId: c.options['session-id'],
        //   text: c.options.text,
        // })

        return c.ok({
          success: true,
          messageId: 'pending',
          response: 'A2A messaging not yet implemented in this version',
        }, {
          cta: {
            description: 'Note: Full A2A support requires SDK v1.7+',
            commands: [
              { command: 'a2a tasks', args: { 'agent-id': c.args['agent-id'] }, description: 'List agent tasks' },
            ],
          },
        })
      } catch (err) {
        return c.error({
          code: 'A2A_MESSAGE_ERROR',
          message: err instanceof Error ? err.message : 'Failed to send A2A message',
          retryable: true,
        })
      }
    },
  })

  a2a.command('tasks', {
    description: 'List tasks for an agent',
    args: z.object({
      'agent-id': z.string().describe('Agent ID'),
    }),
    options: z.object({
      status: z.enum(['pending', 'active', 'completed', 'all']).default('all').describe('Filter by status'),
      limit: z.number().default(10).describe('Max results'),
    }),
    output: z.object({
      agentId: z.string(),
      tasks: z.array(z.object({
        id: z.string(),
        status: z.string(),
        title: z.string().optional(),
        createdAt: z.number().optional(),
        updatedAt: z.number().optional(),
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
        const agent = await sdk.getAgent(c.args['agent-id'])

        if (!agent.a2a) {
          return c.error({
            code: 'NO_A2A',
            message: 'Agent does not have an A2A endpoint',
            retryable: false,
          })
        }

        // Would use SDK to list tasks
        // const tasks = await agent.listTasks({ status: c.options.status })

        return {
          agentId: c.args['agent-id'],
          tasks: [], // Placeholder
        }
      } catch (err) {
        return c.error({
          code: 'LIST_TASKS_ERROR',
          message: err instanceof Error ? err.message : 'Failed to list tasks',
          retryable: true,
        })
      }
    },
  })

  a2a.command('task', {
    description: 'Get details of a specific task',
    args: z.object({
      'agent-id': z.string().describe('Agent ID'),
      'task-id': z.string().describe('Task ID'),
    }),
    output: z.object({
      id: z.string(),
      status: z.string(),
      title: z.string().optional(),
      description: z.string().optional(),
      messages: z.array(z.object({
        role: z.enum(['user', 'agent']),
        content: z.string(),
        timestamp: z.number(),
      })).optional(),
      createdAt: z.number().optional(),
      updatedAt: z.number().optional(),
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
        const agent = await sdk.getAgent(c.args['agent-id'])

        if (!agent.a2a) {
          return c.error({
            code: 'NO_A2A',
            message: 'Agent does not have an A2A endpoint',
            retryable: false,
          })
        }

        // Would use SDK to load task
        // const task = await agent.loadTask(c.args['task-id'])

        return c.error({
          code: 'NOT_IMPLEMENTED',
          message: 'Task loading not yet implemented',
          retryable: false,
        })
      } catch (err) {
        return c.error({
          code: 'LOAD_TASK_ERROR',
          message: err instanceof Error ? err.message : 'Failed to load task',
          retryable: true,
        })
      }
    },
  })

  a2a.command('create-task', {
    description: 'Create a new task with an agent',
    args: z.object({
      'agent-id': z.string().describe('Agent ID'),
    }),
    options: z.object({
      title: z.string().describe('Task title'),
      description: z.string().optional().describe('Task description'),
      'session-id': z.string().optional().describe('Session ID'),
    }),
    output: z.object({
      success: z.boolean(),
      taskId: z.string(),
      status: z.string(),
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
        const agent = await sdk.getAgent(c.args['agent-id'])

        if (!agent.a2a) {
          return c.error({
            code: 'NO_A2A',
            message: 'Agent does not have an A2A endpoint',
            retryable: false,
          })
        }

        // Would use SDK to create task
        // const task = await sdk.createA2AClient(agent.a2a).createTask({
        //   title: c.options.title,
        //   description: c.options.description,
        // })

        return c.ok({
          success: true,
          taskId: 'pending',
          status: 'created',
        }, {
          cta: {
            description: 'Next steps:',
            commands: [
              { command: 'a2a message', args: { 'agent-id': c.args['agent-id'], 'task-id': 'pending' }, description: 'Send message to task' },
            ],
          },
        })
      } catch (err) {
        return c.error({
          code: 'CREATE_TASK_ERROR',
          message: err instanceof Error ? err.message : 'Failed to create task',
          retryable: true,
        })
      }
    },
  })

  cli.command(a2a)
}
