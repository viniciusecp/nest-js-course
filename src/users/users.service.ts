import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { HashingServiceProtocol } from 'src/auth/hash/hashing.service';
import { PayloadTokenDto } from 'src/auth/dto/payload-token.dto';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { Prisma } from 'generated/prisma';
import { PrismaError } from 'src/prisma/common/prisma-error.constants';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly hashingService: HashingServiceProtocol,
  ) {}

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      omit: { passwordHash: true },
      include: { Task: true },
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return user;
  }

  async create(createUserDto: CreateUserDto) {
    try {
      const passwordHash = await this.hashingService.hash(
        createUserDto.password,
      );

      const user = await this.prisma.user.create({
        data: {
          name: createUserDto.name,
          email: createUserDto.email,
          passwordHash: passwordHash,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      return user;
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Error on user registration');
    }
  }

  async update(
    id: number,
    updateUserDto: UpdateUserDto,
    tokenPayload: PayloadTokenDto,
  ) {
    if (tokenPayload.sub !== id) {
      throw new UnauthorizedException('Unauthorized');
    }

    const user = await this.prisma.user.findFirst({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updateUser = { name: updateUserDto.name };

    if (updateUserDto.password) {
      updateUser['passwordHash'] = await this.hashingService.hash(
        updateUserDto.password,
      );
    }

    try {
      return await this.prisma.user.update({
        where: { id },
        data: updateUser,
        omit: { passwordHash: true },
      });
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Error on user update');
    }
  }

  async delete(id: number, tokenPayload: PayloadTokenDto) {
    if (tokenPayload.sub !== id) {
      throw new UnauthorizedException('Unauthorized');
    }

    const user = await this.prisma.user.findFirst({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      await this.prisma.user.delete({
        where: { id },
        omit: { passwordHash: true },
      });
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Error on user update');
    }
  }

  async uploadAvatarImage(
    tokenPayload: PayloadTokenDto,
    file: Express.Multer.File,
  ) {
    const fileExtension = path
      .extname(file.originalname)
      .toLowerCase()
      .substring(1);

    const fileName = `${tokenPayload.sub}.${fileExtension}`;
    const fileLocale = path.resolve(process.cwd(), 'files', fileName);

    try {
      const updatedUser = await this.prisma.user.update({
        where: {
          id: tokenPayload.sub,
        },
        data: {
          avatar: fileName,
        },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
        },
      });

      await fs.writeFile(fileLocale, file.buffer);

      return updatedUser;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === PrismaError.RecordNotFound) {
          throw new NotFoundException(
            `User with ID ${tokenPayload.sub} not found.`,
          );
        }
      }

      throw new InternalServerErrorException('Error on updating user avatar.');
    }
  }
}
