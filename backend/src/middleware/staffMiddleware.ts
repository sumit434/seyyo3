import { Request, Response, NextFunction } from 'express';
import { StaffService } from '../services/staffService';
import { StaffSession } from '../../../shared/types/session';

export interface AuthenticatedStaffRequest extends Request {
  staffSession?: StaffSession;
}

const staffService = new StaffService();

export function staffAuthMiddleware(req: AuthenticatedStaffRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : (req.headers['x-staff-session'] as string);

  if (!token) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: 'Staff session token missing',
    });
  }

  try {
    const session = staffService.validateSession(token);
    req.staffSession = session;
    next();
  } catch (err: any) {
    return res.status(401).json({
      success: false,
      code: 'UNAUTHORIZED',
      message: err.message || 'Invalid or expired staff session',
    });
  }
}
