import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { RequestWithUser } from 'src/auth/types/request-with-user';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  use(req: RequestWithUser, res: Response, next: NextFunction) {
    const authorization = req.headers.authorization;

    if (authorization) {
      // req['user'] = {
      //   token: authorization,
      //   role: 'admin',
      // };
    }

    next();
  }
}
