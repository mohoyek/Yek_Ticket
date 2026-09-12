import { createMiddleware } from 'hono/factory';
import type { Env } from '../env';
import { errorResponse, MESSAGES } from '../utils/response';

export const errorHandler = createMiddleware<{ Bindings: Env }>(
  async (c, next) => {
    try {
      await next();
    } catch (err) {
      console.error('Unhandled error:', err);
      return errorResponse(c, MESSAGES.INTERNAL_ERROR, 500);
    }
  }
);
