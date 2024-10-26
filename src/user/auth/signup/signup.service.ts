import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CreateUserDto } from './dto/create-user.dto';
<<<<<<< HEAD
import { generateToken, hashPassword } from 'src/utils';
=======
import { hashPassword } from 'src/utils';
import { User } from './entities/user.entity';
>>>>>>> 4f78332b2cf10cb08372bbb83596d8aafaf10b85

@Injectable()
export class SignupService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async signUp(
    signupData: CreateUserDto,
<<<<<<< HEAD
  ): Promise<{ status: boolean; message: string; token: string }> {
=======
  ): Promise<{ status: boolean; message: string }> {
>>>>>>> 4f78332b2cf10cb08372bbb83596d8aafaf10b85
    const { email, password } = signupData;

    const existingUser = await this.userModel.findOne({
      email,
    });
<<<<<<< HEAD
=======
    console.log(existingUser, 'exx');
>>>>>>> 4f78332b2cf10cb08372bbb83596d8aafaf10b85

    if (existingUser && existingUser?.registered) {
      throw new ConflictException('Email or username already exists');
    }

    console.log(2);
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
