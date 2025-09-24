import { Request } from 'express';
import { PayloadTokenDto } from '../dto/payload-token.dto';
import { REQUEST_TOKEN_PAYLOAD_NAME } from '../common/auth.constants';

export interface RequestWithUser extends Request {
  [REQUEST_TOKEN_PAYLOAD_NAME]?: PayloadTokenDto;
}
