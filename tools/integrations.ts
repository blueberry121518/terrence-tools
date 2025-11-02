import { z } from 'zod';
import { McpServer } from '@metorial/mcp-server-sdk';
import { createErrorResponse, createSuccessResponse } from '../utils.ts';

/**
 * Registers all external integration MCP tools (Slack, Notion, etc.)
 */
export function registerIntegrationTools(server: McpServer) {
  // 1. send_slack_message
  server.registerTool(
    'send_slack_message',
    {
      title: 'Send Slack Message',
      description: 'Send a message to a Slack channel. Supports both OAuth tokens (xoxb-) and Incoming Webhooks.',
      inputSchema: {
        channel: z.string().optional().describe('Slack channel name or ID (required for OAuth token, optional for webhook)'),
        text: z.string().describe('Message text to send')
      }
    },
    async ({ channel, text }) => {
      try {
        // Try webhook first (easier, no OAuth needed)
        const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;
        if (SLACK_WEBHOOK_URL) {
          const response = await fetch(SLACK_WEBHOOK_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              text: text,
              ...(channel ? { channel: channel } : {})
            })
          });

          if (response.ok) {
            return createSuccessResponse({
              ok: true,
              method: 'webhook',
              message: 'Message sent via webhook'
            });
          } else {
            throw new Error(`Webhook failed: ${response.statusText}`);
          }
        }

        // Fall back to OAuth token
        const SLACK_API_KEY = process.env.SLACK_API_KEY;
        if (!SLACK_API_KEY) {
          return createErrorResponse(
            new Error('Neither SLACK_WEBHOOK_URL nor SLACK_API_KEY configured'),
            'Slack not configured. Need either SLACK_WEBHOOK_URL or SLACK_API_KEY'
          );
        }

        if (!channel) {
          return createErrorResponse(
            new Error('Channel is required when using OAuth token'),
            'Channel parameter is required when using SLACK_API_KEY'
          );
        }

        const response = await fetch('https://slack.com/api/chat.postMessage', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SLACK_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            channel: channel,
            text: text
          })
        });

        const data = await response.json();
        return createSuccessResponse(data);
      } catch (error) {
        return createErrorResponse(error, 'Failed to send Slack message');
      }
    }
  );

  // 2. send_notion_update
  server.registerTool(
    'send_notion_update',
    {
      title: 'Send Notion Update',
      description: 'Update or create a Notion page with session summary or notes',
      inputSchema: {
        page_id: z.string().optional().nullable().describe('Notion page ID to update, or null to create new'),
        title: z.string().describe('Page title'),
        content: z.string().describe('Page content (markdown supported)')
      }
    },
    async ({ page_id, title, content }) => {
      try {
        const NOTION_API_KEY = process.env.NOTION_API_KEY;
        if (!NOTION_API_KEY) {
          return createErrorResponse(
            new Error('NOTION_API_KEY not configured'),
            'NOTION_API_KEY not configured'
          );
        }

        let url = 'https://api.notion.com/v1/pages';
        let method = 'POST';

        if (page_id) {
          url = `https://api.notion.com/v1/pages/${page_id}`;
          method = 'PATCH';
        }

        const response = await fetch(url, {
          method: method,
          headers: {
            'Authorization': `Bearer ${NOTION_API_KEY}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            properties: {
              title: {
                title: [
                  { text: { content: title } }
                ]
              }
            },
            children: [
              {
                object: 'block',
                type: 'paragraph',
                paragraph: {
                  rich_text: [
                    { type: 'text', text: { content: content } }
                  ]
                }
              }
            ]
          })
        });

        const data = await response.json();
        return createSuccessResponse(data);
      } catch (error) {
        return createErrorResponse(error, 'Failed to update Notion page');
      }
    }
  );
}
