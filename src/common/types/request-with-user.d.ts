import { Request } from 'express';

interface User {
  token: string;
  role: string;
}

export interface RequestWithUser extends Request {
  user?: User;
}
