import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import jwtConfig from '../config/jwt.config';
import type { ConfigType } from '@nestjs/config';
import { PayloadTokenDto } from '../dto/payload-token.dto';
import { REQUEST_TOKEN_PAYLOAD_NAME } from '../common/auth.constants';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class AuthTokenGuard implements CanActivate {
  constructor(
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    private readonly jwtService: JwtService,

    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Token not provided');
    }

    try {
      const payload = await this.jwtService.verifyAsync<PayloadTokenDto>(
        token,
        this.jwtConfiguration,
      );

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub, active: true },
      });

      if (!user) {
        throw new UnauthorizedException('Unauthorized access');
      }

      request[REQUEST_TOKEN_PAYLOAD_NAME] = payload;
    } catch (error) {
      console.error(error);
      throw new UnauthorizedException('Unauthorized access');
    }

    return true;
  }

  extractTokenFromHeader(request: Request) {
    const authorization = request.headers.authorization;

    if (!authorization) {
      return;
    }

    const [, token] = authorization.split(' ');

    return token;
  }
}
