import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateUserDto } from './dto/create-user.dto';

import { User } from 'src/shared/entities/user.entity';
import { generateToken, hashPassword } from 'src/utils';

@Injectable()
export class SignupService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async signUp(
    signupData: CreateUserDto,
  ): Promise<{ status: boolean; message: string; token: string }> {
    const { email, password } = signupData;

    const existingUser = await this.userModel.findOne({
      email,
    });

    if (existingUser && existingUser?.registered) {
      throw new ConflictException('Email  already exists');
    }

    try {
      const hashedPassword = await hashPassword(password);

      existingUser.password = hashedPassword;

      existingUser.registered = true;

      //for identifying the step
      // existingUser.isOnBoarded = 1;

      await existingUser.save();
      const token = generateToken({ email }, '3hrs');
      // Return a success response with a status and message
      return {
        status: true,

        message: 'User created successfully',
        token,
      };
    } catch (error) {
      console.log(error, 'errr');

      throw error;
    }
  }
}
