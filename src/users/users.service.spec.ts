import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from './users.service';
import { HashingServiceProtocol } from 'src/auth/hash/hashing.service';
import { Test, TestingModule } from '@nestjs/testing';
import { CreateUserDto } from './dto/create-user.dto';

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
    console.log('createdUser', createdUser);

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
});
