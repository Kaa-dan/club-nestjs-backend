import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { CreateUserDto } from './dto/create-user.dto';
import { hashPassword } from 'src/utils';
import { User } from './entities/user.entity';

@Injectable()
export class SignupService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async signUp(
    signupData: CreateUserDto,
  ): Promise<{ status: boolean; message: string }> {

    const { email, password } = signupData;

    const existingUser = await this.userModel.findOne({
      email,
      
    });
    console.log(existingUser,"exx");

    if (existingUser && existingUser?.registered) {
      throw new ConflictException('Email or username already exists');
    }

    console.log(2);
    try {
      const hashedPassword = await hashPassword(password);

      existingUser.password = hashedPassword;

      existingUser.registered = true;

      //for identifying the step
      existingUser.isOnBoarded = 1;

      await existingUser.save();

      // Return a success response with a status and message
      return {
        status: true,
        message: 'User created successfully',
      };
    } catch (error) {
      console.log(error, 'errr');

      throw error;
    }
  }
}
