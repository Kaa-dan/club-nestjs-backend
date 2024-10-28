import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/shared/entities/user.entity';
import { GoogleAuthDto } from './dto/google-auth';
import { ServiceResponse } from 'src/shared/types/service.response.type';
import { generateToken, hashPassword } from 'src/utils';
import { generateRandomPassword } from 'src/utils/generatePasswor';

@Injectable()
export class GoogleSignupService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async googleAuth(googleAuthData: GoogleAuthDto): Promise<ServiceResponse> {
    const { email, userName, imageUrl, phoneNumber, signupThrough } =
      googleAuthData;

    try {
      let token: string;
    const hashedPassword = await hashPassword(generateRandomPassword())
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
        existingUser.signupThrough = signupThrough
        existingUser.profileImage = {
          url: imageUrl,
          public_id : ""
        };
        existingUser.password = hashedPassword
        await existingUser.save();
        token = generateToken({ email: existingUser.email }, '3hr');
      } else if (
        existingUser &&
        !existingUser.registered &&
        !existingUser.emailVerified
      ) {
        existingUser.registered = true;
        existingUser.emailVerified = true;
        existingUser.signupThrough = signupThrough;
        existingUser.password = hashedPassword
        existingUser.profileImage = {
          url: imageUrl,
          public_id : ""
        }
        await existingUser.save();
        token = generateToken({ email: existingUser.email }, '3hr');
      } else {
        const newUser = new this.userModel({
          email,
          signupThrough,
          userName: userName.split(' ')[0],
          profileImage: {
            url : imageUrl
          },
          phoneNumber,
          emailVerified: true,
          registered: true,
          password:hashedPassword
        });
        await newUser.save();
        token = generateToken({ email: newUser.email }, '3hr');
      }

      // Create a new user if they don't exist

      // Save the new user to the database

      return {
        success: true,
        message: 'signup successful, please login',
        status: 200,
        token,
      };
    } catch (error) {
      throw error;
    }
  }
}
