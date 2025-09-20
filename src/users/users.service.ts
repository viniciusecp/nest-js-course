import {
  HttpException,
  HttpStatus,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

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
      const user = await this.prisma.user.create({
        data: {
          name: createUserDto.name,
          email: createUserDto.email,
          passwordHash: createUserDto.password,
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

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.prisma.user.findFirst({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      return this.prisma.user.update({
        where: { id },
        data: {
          name: updateUserDto.name,
          passwordHash: updateUserDto.password,
        },
        omit: { passwordHash: true },
      });
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Error on user update');
    }
  }

  async delete(id: number) {
    const user = await this.prisma.user.findFirst({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    try {
      return this.prisma.user.delete({
        where: { id },
        omit: { passwordHash: true },
      });
    } catch (error) {
      console.error(error);
      throw new InternalServerErrorException('Error on user update');
    }
  }
}
