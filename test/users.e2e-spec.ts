import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { UsersModule } from 'src/users/users.module';
import { ConfigModule } from '@nestjs/config';
import { TasksModule } from 'src/tasks/tasks.module';
import { AuthModule } from 'src/auth/auth.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'node:path';
import { PrismaService } from 'src/prisma/prisma.service';
import * as dotenv from 'dotenv';
import { execSync } from 'node:child_process';

dotenv.config({ path: './.env.test' });

describe('Users (e2e)', () => {
  let app: INestApplication<App>;
  let prismaService: PrismaService;

  beforeAll(() => {
    execSync('npx prisma migrate deploy');
  });

  beforeEach(async () => {
    execSync(
      'cross-env DATABASE_URL=postgresql://postgres:postgres@localhost:5431/postgres?schema=public npx prisma migrate deploy',
    );

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test',
        }),
        TasksModule,
        UsersModule,
        AuthModule,
        ServeStaticModule.forRoot({
          rootPath: join(__dirname, '..', '..', 'files'),
          serveRoot: '/files',
        }),
      ],
    }).compile();

    app = module.createNestApplication();

    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
      }),
    );

    prismaService = module.get(PrismaService);

    await app.init();
  });

  afterEach(async () => {
    await prismaService.user.deleteMany();
  });

  afterAll(() => async () => {
    await app.close();
  });

  describe('/users', () => {
    it('/USER (POST) - create user', async () => {
      const createUserDto = {
        name: 'John Doe',
        email: 'john@doe.com',
        password: '123123',
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(HttpStatus.CREATED);

      type UserResponse = { id: number; name: string; email: string };
      const body = response.body as UserResponse;

      expect(typeof body.id).toBe('number');
      expect(body.name).toBe(createUserDto.name);
      expect(body.email).toBe(createUserDto.email);
    });

    it('/USER (POST) - weak password', async () => {
      const createUserDto = {
        name: 'John Doe',
        email: 'john@doe.com',
        password: '123',
      };

      await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(HttpStatus.BAD_REQUEST);
    });

    it('/USER (PATCH) - update user', async () => {
      const createUserDto = {
        name: 'John',
        email: 'john@doe.com',
        password: '123123',
      };

      const updateUserDto = {
        name: 'John Doe',
      };

      await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(HttpStatus.CREATED);

      const authResponse = await request(app.getHttpServer())
        .post('/auth')
        .send({
          email: createUserDto.email,
          password: createUserDto.password,
        })
        .expect(HttpStatus.CREATED);

      expect(authResponse.body).toHaveProperty('token');
      expect(authResponse.body).toHaveProperty('id');

      type AuthResponse = { id: number; token: string };
      const { id: userId, token } = authResponse.body as AuthResponse;

      const response = await request(app.getHttpServer())
        .patch(`/users/${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .send(updateUserDto)
        .expect(HttpStatus.OK);

      type UpdateResponse = { id: number; name: string; email: string };
      const body = response.body as UpdateResponse;

      expect(body).toEqual({
        id: userId,
        name: updateUserDto.name,
        email: createUserDto.email,
      });
    });

    it('/USER (DELETE) - delete user', async () => {
      const createUserDto = {
        name: 'John',
        email: 'john@doe.com',
        password: '123123',
      };

      await request(app.getHttpServer())
        .post('/users')
        .send(createUserDto)
        .expect(HttpStatus.CREATED);

      const authResponse = await request(app.getHttpServer())
        .post('/auth')
        .send({
          email: createUserDto.email,
          password: createUserDto.password,
        })
        .expect(HttpStatus.CREATED);

      expect(authResponse.body).toHaveProperty('token');
      expect(authResponse.body).toHaveProperty('id');

      type AuthResponse = { id: number; token: string };
      const { id: userId, token } = authResponse.body as AuthResponse;

      await request(app.getHttpServer())
        .delete(`/users/${userId}`)
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.NO_CONTENT);
    });
  });
});
