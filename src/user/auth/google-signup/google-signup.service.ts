import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/shared/entities/user.entity';
import { GoogleAuthDto } from './dto/google-auth';
import { ServiceResponse } from 'src/shared/types/service.response.type';
import { generateToken, hashPassword } from 'src/utils';
import { generateRandomPassword } from 'src/utils/generatePassword';
import { ENV } from 'src/utils/config/env.config';

@Injectable()
export class GoogleSignupService {
  constructor(@InjectModel('users') private userModel: Model<User>) {}

  async googleAuth(googleAuthData: GoogleAuthDto): Promise<ServiceResponse> {
    const { email, userName, imageUrl, phoneNumber, signupThrough } =
      googleAuthData;

    try {
      let token: string;
      const hashedPassword = await hashPassword(generateRandomPassword());
      // Check if the user already exists by email
      const existingUser = await this.userModel.findOne({ email });
      if (
        existingUser &&
        existingUser.registered &&
        existingUser.emailVerified
      ) {
        throw new ConflictException('User with this email already exists');
      }

      if (existingUser && existingUser.emailVerified) {
        existingUser.registered = true;
        existingUser.signupThrough = signupThrough;
        (existingUser.profileImage = imageUrl),
          (existingUser.password = hashedPassword);
        await existingUser.save();
        token = generateToken(
          { email: existingUser.email },
          ENV.TOKEN_EXPIRY_TIME,
        );
      } else if (
        existingUser &&
        !existingUser.registered &&
        !existingUser.emailVerified
      ) {
        existingUser.registered = true;
        existingUser.emailVerified = true;
        existingUser.signupThrough = signupThrough;
        existingUser.password = hashedPassword;
        existingUser.profileImage = imageUrl;

        await existingUser.save();
        token = generateToken(
          { email: existingUser.email },
          ENV.TOKEN_EXPIRY_TIME,
        );
      } else {
        console.log('hello');

        const newUser = new this.userModel({
          email,
          signupThrough,
          userName: userName.split(' ')[0],
          profileImage: {
            url: imageUrl,
          },
          phoneNumber,
          emailVerified: true,
          registered: true,
          password: hashedPassword,
        });
        await newUser.save();
        token = generateToken({ email: newUser.email }, ENV.TOKEN_EXPIRY_TIME);
      }

      // Create a new user if they don't exist

      // Save the new user to the database

      const user = await this.userModel.findOne({ email }).select('-password');

      return {
        success: true,
        message: 'signup successful, please login',
        status: 200,
        token,
        data: user,
      };
    } catch (error) {
      throw error;
    }
  }
}
