import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { REQUEST_TOKEN_PAYLOAD_NAME } from '../common/auth.constants';
import { RequestWithUser } from '../types/request-with-user';

export const TokenPayloadParam = createParamDecorator(
  (data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithUser>();

    return request[REQUEST_TOKEN_PAYLOAD_NAME];
  },
);
