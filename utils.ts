// Utility functions for MCP tools

/**
 * Creates a standardized error response for tool handlers
 */
export function createErrorResponse(error: unknown, defaultMessage: string) {
  const message = error instanceof Error ? error.message : defaultMessage;
  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify({ error: message })
    }]
  };
}

/**
 * Creates a standardized success response for tool handlers
 */
export function createSuccessResponse(data: any) {
  return {
    content: [{
      type: 'text' as const,
      text: JSON.stringify(data, null, 2)
    }]
  };
}

