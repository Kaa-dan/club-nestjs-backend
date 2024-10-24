import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
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
  ): Promise<{ status: boolean; message: string }> {
    console.log(signupData, 'okkk');

    const { email, password } = signupData;

    const existingUser = await this.userModel.findOne({
      email,
    });

    if (existingUser.registered) {
      throw new ConflictException('Email or username already exists');
    }

    try {
      const hashedPassword = await hashPassword(password);

      existingUser.password = hashedPassword;

      existingUser.registered = true;

      await existingUser.save();

      // Return a success response with a status and message
      return {
        status: true,
        message: 'User created successfully',
      };
    } catch (error) {
      console.log(error, 'errr');

      throw new InternalServerErrorException(error);
    }
  }
}
