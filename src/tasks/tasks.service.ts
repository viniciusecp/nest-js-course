import {
  HttpException,
  HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { TaskUtils } from './tasks.utils';
import { PayloadTokenDto } from 'src/auth/dto/payload-token.dto';

@Injectable()
export class TasksService {
  constructor(
    private prisma: PrismaService,
    private taskUtils: TaskUtils,
  ) {}

  findAll(paginationDto: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;

    // console.log(this.taskUtils.splitString('Testando injeção de dependência'));

    return this.prisma.task.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: number) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        user: {
          omit: { passwordHash: true },
        },
      },
    });

    if (!task) {
      throw new HttpException('Task not found', HttpStatus.NOT_FOUND);
    }

    return task;
  }

  async create(createTaskDto: CreateTaskDto, tokenPayload: PayloadTokenDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: tokenPayload.sub },
    });

    if (!user) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return this.prisma.task.create({
      data: {
        ...createTaskDto,
        userId: tokenPayload.sub,
      },
    });
  }

  async update(
    id: number,
    updateTaskDto: UpdateTaskDto,
    tokenPayload: PayloadTokenDto,
  ) {
    const task = await this.prisma.task.findFirst({ where: { id } });

    if (!task) {
      throw new HttpException('Task not found', HttpStatus.NOT_FOUND);
    }

    if (task.userId !== tokenPayload.sub) {
      throw new UnauthorizedException(
        'You are not allowed to update this task',
      );
    }

    return this.prisma.task.update({ where: { id }, data: updateTaskDto });
  }

  async delete(id: number, tokenPayload: PayloadTokenDto) {
    const task = await this.prisma.task.findFirst({ where: { id } });

    if (!task) {
      throw new HttpException('Task not found', HttpStatus.NOT_FOUND);
    }

    if (task.userId !== tokenPayload.sub) {
      throw new UnauthorizedException(
        'You are not allowed to delete this task',
      );
    }

    return this.prisma.task.delete({ where: { id } });
  }
}
