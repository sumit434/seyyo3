import { Request, Response, NextFunction } from 'express';

export function errorMiddleware(err: any, req: Request, res: Response, next: NextFunction) {
  const message = err.message || 'An unexpected server error occurred';
  let statusCode = err.status || err.statusCode || 400;
  let code = err.code || 'BAD_REQUEST';

  if (!err.status) {
    if (message.includes('NOT_FOUND')) {
      statusCode = 404;
      code = 'NOT_FOUND';
    } else if (message.includes('UNAUTHORIZED') || message.includes('INVALID_CREDENTIALS') || message.includes('INVALID_TOKEN')) {
      statusCode = 401;
      code = 'UNAUTHORIZED';
    } else if (message.includes('EXPIRED') || message.includes('already used')) {
      statusCode = 403;
      code = 'FORBIDDEN';
    } else if (message.includes('ALREADY_COMPLETED') || message.includes('ALREADY_REDEEMED') || message.includes('EXISTS')) {
      statusCode = 409;
      code = 'CONFLICT';
    } else if (message.includes('LOCKED_OUT') || message.includes('RATE_LIMIT') || message.includes('TOO_MANY_REQUESTS')) {
      statusCode = 429;
      code = 'TOO_MANY_REQUESTS';
    } else if (message.includes('FORBIDDEN') || message.includes('cross-business')) {
      statusCode = 403;
      code = 'FORBIDDEN';
    }
  }

  res.status(statusCode).json({
    success: false,
    code,
    message: message.replace(/^[A-Z_]+:\s*/, ''),
  });
}
