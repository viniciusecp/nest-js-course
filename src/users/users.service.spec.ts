import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from './users.service';
import { HashingServiceProtocol } from 'src/auth/hash/hashing.service';
import { Test, TestingModule } from '@nestjs/testing';
import { CreateUserDto } from './dto/create-user.dto';
import {
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { PayloadTokenDto } from 'src/auth/dto/payload-token.dto';

describe('UsersService', () => {
  let usersService: UsersService;
  let prismaService: PrismaService;
  let hashingService: HashingServiceProtocol;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            user: {
              create: jest.fn(),
              findUnique: jest.fn(),
              findFirst: jest.fn(),
            },
          },
        },
        {
          provide: HashingServiceProtocol,
          useValue: {
            hash: jest.fn(),
          },
        },
      ],
    }).compile();

    usersService = module.get(UsersService);
    prismaService = module.get(PrismaService);
    hashingService = module.get(HashingServiceProtocol);
  });

  it('should be defined users service', () => {
    expect(usersService).toBeDefined();
  });

  describe('Create User', () => {
    it('should create a new user', async () => {
      const createUserDto: CreateUserDto = {
        name: 'John',
        email: 'john@doe.com',
        password: '123456',
      };

      const encryptedPassword = 'ENCRYPTED_PASSWORD';

      const createdUserMock = {
        id: 1,
        name: createUserDto.name,
        email: createUserDto.email,
        passwordHash: encryptedPassword,
        active: true,
        avatar: null,
        createdAt: new Date(),
      };

      const hashSpy = jest
        .spyOn(hashingService, 'hash')
        .mockResolvedValue(encryptedPassword);

      const createUserSpy = jest
        .spyOn(prismaService.user, 'create')
        .mockResolvedValue(createdUserMock);

      const createdUser = await usersService.create(createUserDto);

      expect(hashSpy).toHaveBeenCalledWith(createUserDto.password);

      expect(createUserSpy).toHaveBeenCalledWith({
        data: {
          name: createUserDto.name,
          email: createUserDto.email,
          passwordHash: encryptedPassword,
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      expect(createdUser).toEqual(createdUserMock);
    });

    it('should throw an error exception if prisma crete fails', async () => {
      const createUserDto: CreateUserDto = {
        name: 'John',
        email: 'john@doe.com',
        password: '123456',
      };

      const consoleErrorSpy = jest
        .spyOn(console, 'error')
        .mockImplementation(() => {});

      jest
        .spyOn(prismaService.user, 'create')
        .mockRejectedValue(new Error('Database error'));

      await expect(usersService.create(createUserDto)).rejects.toThrow(
        new InternalServerErrorException('Error on user registration'),
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('FindOne User', () => {
    it('should return a user', async () => {
      const userId = 1;

      const mockUser = {
        id: userId,
        name: 'John',
        email: 'john@doe.com',
        passwordHash: 'ENCRYPTED_PASSWORD',
        active: true,
        avatar: null,
        createdAt: new Date(),
        Task: [],
      };

      const findUserSpy = jest
        .spyOn(prismaService.user, 'findUnique')
        .mockResolvedValue(mockUser);

      const user = await usersService.findOne(userId);

      expect(findUserSpy).toHaveBeenCalledWith({
        where: { id: userId },
        omit: { passwordHash: true },
        include: { Task: true },
      });

      expect(user).toEqual(mockUser);
    });

    it('should throw an error exception when user is not found', async () => {
      jest.spyOn(prismaService.user, 'findUnique').mockResolvedValue(null);

      await expect(usersService.findOne(1)).rejects.toThrow(
        new HttpException('User not found', HttpStatus.NOT_FOUND),
      );
    });
  });

  describe('Update User', () => {
    it('should throw exception when user try update another user', async () => {
      const updateUserDto: UpdateUserDto = { name: 'John' };
      const payloadTokenDto: PayloadTokenDto = {
        sub: 1,
        aud: '',
        email: 'johndoe@mail.com',
        exp: 123,
        iat: 123,
        iss: '',
      };

      await expect(
        usersService.update(5, updateUserDto, payloadTokenDto),
      ).rejects.toThrow(new UnauthorizedException('Unauthorized'));
    });

    it("should throw an exception if user doesn't exists", async () => {
      const updateUserDto: UpdateUserDto = { name: 'John' };
      const payloadTokenDto: PayloadTokenDto = {
        sub: 1,
        aud: '',
        email: 'johndoe@mail.com',
        exp: 123,
        iat: 123,
        iss: '',
      };

      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(null);

      await expect(
        usersService.update(1, updateUserDto, payloadTokenDto),
      ).rejects.toThrow(new NotFoundException('User not found'));
    });
  });
});
