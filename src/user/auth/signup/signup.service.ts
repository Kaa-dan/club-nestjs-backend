import {
  Injectable,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { hashPassword } from 'src/utils';

@Injectable()
export class SignupService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async signUp(
    signupData: CreateUserDto,
  ): Promise<{ status: string; message: string }> {
    const { userName, email, password, ...rest } = signupData;

    const existingUser = await this.userModel.findOne({
      $or: [{ email }, { userName }],
    });

    if (existingUser) {
      throw new ConflictException('Email or username already exists');
    }

    try {
      const hashedPassword = await hashPassword(password);

      const newUser = new this.userModel({
        userName,
        email,
        password: hashedPassword,
        ...rest,
      });

      await newUser.save();

      // Return a success response with a status and message
      return {
        status: 'success',
        message: 'User created successfully',
      };
    } catch (error) {
      throw error;
    }
  }
}
