import { PayloadTokenDto } from 'src/auth/dto/payload-token.dto';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

describe('Users Controller', () => {
  let controller: UsersController;

  const usersServiceMock = {
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    uploadAvatarImage: jest.fn(),
  };

  beforeEach(() => {
    controller = new UsersController(
      usersServiceMock as unknown as UsersService,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call findOne method', async () => {
    const userId = 1;

    await controller.findOne(userId);

    expect(usersServiceMock.findOne).toHaveBeenCalledWith(userId);
  });

  it('should call create method', async () => {
    const createUserDto: CreateUserDto = {
      name: 'John Doe',
      email: 'john@doe.com',
      password: '123123',
    };

    const createdUserMock = {
      id: 1,
      name: createUserDto.name,
      email: createUserDto.email,
    };

    usersServiceMock.create.mockResolvedValue(createdUserMock);

    const result = await controller.create(createUserDto);

    expect(usersServiceMock.create).toHaveBeenCalledWith(createUserDto);

    expect(result).toEqual(createdUserMock);
  });

  it('should call update user method', async () => {
    const userId = 1;

    const updateUserDto: UpdateUserDto = {
      name: 'John',
      password: '123456',
    };

    const tokenPayload: PayloadTokenDto = {
      sub: userId,
      aud: '',
      email: 'john@doe.com',
      exp: 123,
      iat: 123,
      iss: '',
    };

    const updatedUserMock = {
      id: userId,
      name: updateUserDto.name,
      password: updateUserDto.password,
      email: 'john@doe.com',
      active: true,
      avatar: null,
      createdAt: new Date(),
    };

    usersServiceMock.update.mockResolvedValue(updatedUserMock);

    const result = await controller.update(userId, updateUserDto, tokenPayload);

    expect(usersServiceMock.update).toHaveBeenCalledWith(
      userId,
      updateUserDto,
      tokenPayload,
    );

    expect(result).toEqual(updatedUserMock);
  });

  it('should call delete user method', async () => {
    const userId = 1;

    const tokenPayload: PayloadTokenDto = {
      sub: userId,
      aud: '',
      email: 'john@doe.com',
      exp: 123,
      iat: 123,
      iss: '',
    };

    const result = await controller.delete(userId, tokenPayload);

    expect(usersServiceMock.delete).toHaveBeenCalledWith(userId, tokenPayload);

    expect(result).toBeUndefined();
  });

  it('should call upload avatar image method', async () => {
    const userId = 1;

    const tokenPayload: PayloadTokenDto = {
      sub: userId,
      aud: '',
      email: 'john@doe.com',
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
      id: userId,
      name: 'John Doe',
      email: 'john@doe.com',
      avatar: '1.png',
    };

    usersServiceMock.uploadAvatarImage.mockResolvedValue(updatedUserMock);

    const result = await controller.uploadAvatar(tokenPayload, file);

    expect(usersServiceMock.uploadAvatarImage).toHaveBeenCalledWith(
      tokenPayload,
      file,
    );

    expect(result).toEqual(updatedUserMock);
  });
});
