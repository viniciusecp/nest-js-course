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
import { PrismaClientKnownRequestError } from 'generated/prisma/runtime/library';
import { PrismaError } from 'src/prisma/common/prisma-error.constants';
import { User } from 'generated/prisma';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';

jest.mock('node:fs/promises');

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
              update: jest.fn(),
              delete: jest.fn(),
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

    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.clearAllMocks();
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

      jest
        .spyOn(prismaService.user, 'create')
        .mockRejectedValue(new Error('Database error'));

      await expect(usersService.create(createUserDto)).rejects.toThrow(
        new InternalServerErrorException('Error on user registration'),
      );
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

    it('should update user without password', async () => {
      const userId = 1;
      const newName = 'John Doe';
      const updateUserDto: UpdateUserDto = { name: 'John Doe' };
      const payloadTokenDto: PayloadTokenDto = {
        sub: userId,
        aud: '',
        email: 'johndoe@mail.com',
        exp: 123,
        iat: 123,
        iss: '',
      };
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
      const updatedUserMock = {
        id: userId,
        name: newName,
        email: 'john@doe.com',
        passwordHash: 'ENCRYPTED_PASSWORD',
        active: true,
        avatar: null,
        createdAt: new Date(),
        Task: [],
      };

      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(mockUser);

      const updateUserSpy = jest
        .spyOn(prismaService.user, 'update')
        .mockResolvedValue(updatedUserMock);

      const updatedUser = await usersService.update(
        userId,
        updateUserDto,
        payloadTokenDto,
      );

      expect(updateUserSpy).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateUserDto,
        omit: { passwordHash: true },
      });

      expect(updatedUser).toEqual(updatedUserMock);
    });

    it('should update user with password', async () => {
      const userId = 1;
      const newName = 'John Doe';
      const newEncryptedPassword = 'NEW_ENCRYPTED_PASSWORD';
      const updateUserDto: UpdateUserDto = {
        name: newName,
        password: 'new-password',
      };
      const payloadTokenDto: PayloadTokenDto = {
        sub: userId,
        aud: '',
        email: 'johndoe@mail.com',
        exp: 123,
        iat: 123,
        iss: '',
      };
      const mockUser = {
        id: userId,
        name: 'John',
        email: 'john@doe.com',
        passwordHash: 'ENCRYPTED_PASSWORD',
        active: true,
        avatar: null,
        createdAt: new Date(),
      };
      const updatedUserMock = {
        id: userId,
        name: newName,
        email: 'john@doe.com',
        passwordHash: newEncryptedPassword,
        active: true,
        avatar: null,
        createdAt: new Date(),
      };

      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(mockUser);

      const hashSpy = jest
        .spyOn(hashingService, 'hash')
        .mockResolvedValue(newEncryptedPassword);

      const updateUserSpy = jest
        .spyOn(prismaService.user, 'update')
        .mockResolvedValue(updatedUserMock);

      const updatedUser = await usersService.update(
        userId,
        updateUserDto,
        payloadTokenDto,
      );

      expect(hashSpy).toHaveBeenCalledWith(updateUserDto.password);

      expect(updateUserSpy).toHaveBeenCalledWith({
        where: { id: userId },
        data: {
          name: newName,
          passwordHash: newEncryptedPassword,
        },
        omit: { passwordHash: true },
      });

      expect(updatedUser).toEqual(updatedUserMock);
    });

    it('should thrown an exception if update user fails', async () => {
      const updateUserDto: UpdateUserDto = { name: 'John Doe' };
      const payloadTokenDto: PayloadTokenDto = {
        sub: 1,
        aud: '',
        email: 'johndoe@mail.com',
        exp: 123,
        iat: 123,
        iss: '',
      };
      const mockUser = {
        id: 1,
        name: 'John',
        email: 'john@doe.com',
        passwordHash: 'ENCRYPTED_PASSWORD',
        active: true,
        avatar: null,
        createdAt: new Date(),
        Task: [],
      };

      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(mockUser);

      jest
        .spyOn(prismaService.user, 'update')
        .mockRejectedValue(new Error('Database error'));

      await expect(
        usersService.update(1, updateUserDto, payloadTokenDto),
      ).rejects.toThrow(
        new InternalServerErrorException('Error on user update'),
      );
    });
  });

  describe('Delete User', () => {
    it('should throw exception when user try delete another user', async () => {
      const payloadTokenDto: PayloadTokenDto = {
        sub: 1,
        aud: '',
        email: 'johndoe@mail.com',
        exp: 123,
        iat: 123,
        iss: '',
      };

      const deleteUserSpy = jest.spyOn(prismaService.user, 'delete');

      await expect(usersService.delete(5, payloadTokenDto)).rejects.toThrow(
        new UnauthorizedException('Unauthorized'),
      );

      expect(deleteUserSpy).not.toHaveBeenCalled();
    });

    it("should throw an exception if user doesn't exists", async () => {
      const payloadTokenDto: PayloadTokenDto = {
        sub: 1,
        aud: '',
        email: 'johndoe@mail.com',
        exp: 123,
        iat: 123,
        iss: '',
      };

      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(null);

      await expect(usersService.delete(1, payloadTokenDto)).rejects.toThrow(
        new NotFoundException('User not found'),
      );
    });

    it('should delete an user', async () => {
      const payloadTokenDto: PayloadTokenDto = {
        sub: 1,
        aud: '',
        email: 'johndoe@doe.com',
        exp: 123,
        iat: 123,
        iss: '',
      };
      const mockUser = {
        id: 1,
        name: 'John',
        email: 'john@doe.com',
        passwordHash: 'ENCRYPTED_PASSWORD',
        active: true,
        avatar: null,
        createdAt: new Date(),
      };

      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(mockUser);

      const deleteUserSpy = jest
        .spyOn(prismaService.user, 'delete')
        .mockResolvedValue(mockUser);

      const deletedUser = await usersService.delete(1, payloadTokenDto);

      expect(deleteUserSpy).toHaveBeenCalledWith({
        where: { id: 1 },
        omit: { passwordHash: true },
      });

      expect(deletedUser).toBeUndefined();
    });

    it('should throw an exception if database delete fails', async () => {
      const payloadTokenDto: PayloadTokenDto = {
        sub: 1,
        aud: '',
        email: 'johndoe@doe.com',
        exp: 123,
        iat: 123,
        iss: '',
      };
      const mockUser = {
        id: 1,
        name: 'John',
        email: 'john@doe.com',
        passwordHash: 'ENCRYPTED_PASSWORD',
        active: true,
        avatar: null,
        createdAt: new Date(),
      };

      jest.spyOn(prismaService.user, 'findFirst').mockResolvedValue(mockUser);

      jest
        .spyOn(prismaService.user, 'delete')
        .mockRejectedValue(new Error('Database fails'));

      await expect(usersService.delete(1, payloadTokenDto)).rejects.toThrow(
        new InternalServerErrorException('Error on user update'),
      );
    });
  });

  describe('Upload Avatar Image', () => {
    it('should update avatar of a user and save file', async () => {
      const payloadTokenDto: PayloadTokenDto = {
        sub: 1,
        aud: '',
        email: 'johndoe@doe.com',
        exp: 123,
        iat: 123,
        iss: '',
      };

      const file = {
        originalname: 'avatar.png',
        mimetype: 'image/png',
        buffer: Buffer.from(''),
      } as Express.Multer.File;

      const updatedUserMock = {
        id: 1,
        name: 'John Doe',
        email: 'john@doe.com',
        avatar: '1.png',
      } as User;

      const fileName = '1.png';

      const fileLocale = path.resolve(process.cwd(), 'files', fileName);

      const updateAvatarSpy = jest
        .spyOn(prismaService.user, 'update')
        .mockResolvedValue(updatedUserMock);

      const updatedUser = await usersService.uploadAvatarImage(
        payloadTokenDto,
        file,
      );

      expect(updateAvatarSpy).toHaveBeenCalledWith({
        where: {
          id: payloadTokenDto.sub,
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

      expect(fs.writeFile).toHaveBeenCalledWith(fileLocale, file.buffer);

      expect(updatedUser).toEqual(updatedUserMock);
    });

    it('should throw an exception when user is not found', async () => {
      const payloadTokenDto: PayloadTokenDto = {
        sub: 1,
        aud: '',
        email: 'johndoe@doe.com',
        exp: 123,
        iat: 123,
        iss: '',
      };
      const file = {
        originalname: 'example.png',
        mimetype: 'text/plain',
        buffer: Buffer.from('This is the content of the file.'),
      } as Express.Multer.File;

      jest.spyOn(prismaService.user, 'update').mockRejectedValue(
        new PrismaClientKnownRequestError('Database error', {
          clientVersion: '1',
          code: PrismaError.RecordNotFound,
        }),
      );

      await expect(
        usersService.uploadAvatarImage(payloadTokenDto, file),
      ).rejects.toThrow(
        new NotFoundException(`User with ID ${payloadTokenDto.sub} not found.`),
      );
    });

    it('should throw an exception when writeFile fails', async () => {
      const payloadTokenDto: PayloadTokenDto = {
        sub: 1,
        aud: '',
        email: 'johndoe@doe.com',
        exp: 123,
        iat: 123,
        iss: '',
      };

      const file = {
        originalname: 'example.png',
        mimetype: 'text/plain',
        buffer: Buffer.from('This is the content of the file.'),
      } as Express.Multer.File;

      const updatedUserMock = {
        id: 1,
        name: 'John Doe',
        email: 'john@doe.com',
        avatar: '1.png',
      } as User;

      jest
        .spyOn(prismaService.user, 'update')
        .mockResolvedValue(updatedUserMock);

      jest
        .spyOn(fs, 'writeFile')
        .mockRejectedValue(new Error('Fail on write file'));

      await expect(
        usersService.uploadAvatarImage(payloadTokenDto, file),
      ).rejects.toThrow(
        new InternalServerErrorException('Error on updating user avatar.'),
      );
    });

    it('should throw an exception when user has a generic error', async () => {
      const payloadTokenDto: PayloadTokenDto = {
        sub: 1,
        aud: '',
        email: 'johndoe@doe.com',
        exp: 123,
        iat: 123,
        iss: '',
      };
      const file = {
        originalname: 'example.png',
        mimetype: 'text/plain',
        buffer: Buffer.from('This is the content of the file.'),
      } as Express.Multer.File;

      jest
        .spyOn(prismaService.user, 'update')
        .mockRejectedValue(new Error('Database error'));

      await expect(
        usersService.uploadAvatarImage(payloadTokenDto, file),
      ).rejects.toThrow(
        new InternalServerErrorException('Error on updating user avatar.'),
      );
    });
  });
});
