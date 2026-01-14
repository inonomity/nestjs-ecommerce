import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole, UserStatus } from './entities/user.entity';
import { Address, AddressType } from './entities/address.entity';
import { UpdateUserDto, CreateAddressDto, UpdateAddressDto } from './dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Address)
    private readonly addressRepository: Repository<Address>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email: email.toLowerCase() } });
  }

  async update(userId: string, dto: UpdateUserDto): Promise<User> {
    const user = await this.findById(userId);
    Object.assign(user, dto);
    return this.userRepository.save(user);
  }

  // Address management
  async getAddresses(userId: string): Promise<Address[]> {
    return this.addressRepository.find({
      where: { userId },
      order: { isDefault: 'DESC', createdAt: 'DESC' },
    });
  }

  async getAddressById(userId: string, addressId: string): Promise<Address> {
    const address = await this.addressRepository.findOne({
      where: { id: addressId, userId },
    });
    if (!address) {
      throw new NotFoundException('Address not found');
    }
    return address;
  }

  async createAddress(userId: string, dto: CreateAddressDto): Promise<Address> {
    // If this is set as default, unset other defaults of same type
    if (dto.isDefault) {
      await this.addressRepository.update(
        { userId, type: dto.type, isDefault: true },
        { isDefault: false },
      );
    }

    // If this is the first address of this type, make it default
    const existingCount = await this.addressRepository.count({
      where: { userId, type: dto.type },
    });

    const address = this.addressRepository.create({
      ...dto,
      userId,
      isDefault: dto.isDefault || existingCount === 0,
    });

    return this.addressRepository.save(address);
  }

  async updateAddress(
    userId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ): Promise<Address> {
    const address = await this.getAddressById(userId, addressId);

    // If setting as default, unset other defaults of same type
    if (dto.isDefault && !address.isDefault) {
      await this.addressRepository.update(
        { userId, type: address.type, isDefault: true },
        { isDefault: false },
      );
    }

    Object.assign(address, dto);
    return this.addressRepository.save(address);
  }

  async deleteAddress(userId: string, addressId: string): Promise<void> {
    const address = await this.getAddressById(userId, addressId);
    
    await this.addressRepository.remove(address);

    // If the deleted address was default, make another one default
    if (address.isDefault) {
      const anotherAddress = await this.addressRepository.findOne({
        where: { userId, type: address.type },
        order: { createdAt: 'DESC' },
      });
      
      if (anotherAddress) {
        anotherAddress.isDefault = true;
        await this.addressRepository.save(anotherAddress);
      }
    }
  }

  async setDefaultAddress(userId: string, addressId: string): Promise<Address> {
    const address = await this.getAddressById(userId, addressId);

    // Unset other defaults of same type
    await this.addressRepository.update(
      { userId, type: address.type, isDefault: true },
      { isDefault: false },
    );

    address.isDefault = true;
    return this.addressRepository.save(address);
  }

  async getDefaultAddress(userId: string, type: AddressType): Promise<Address | null> {
    return this.addressRepository.findOne({
      where: { userId, type, isDefault: true },
    });
  }

  // Admin methods
  async updateRole(userId: string, role: UserRole): Promise<User> {
    const user = await this.findById(userId);
    user.role = role;
    return this.userRepository.save(user);
  }

  async updateStatus(userId: string, isActive: boolean): Promise<User> {
    const user = await this.findById(userId);
    user.status = isActive ? UserStatus.ACTIVE : UserStatus.INACTIVE;
    return this.userRepository.save(user);
  }
}
