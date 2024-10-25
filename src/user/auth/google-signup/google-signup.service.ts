import {
  Injectable,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/shared/entities/user.entity';
import { GoogleAuthDto } from './dto/google-auth';
import { ServiceResponse } from 'src/shared/types/service.response.type';
import { generateToken } from 'src/utils';

@Injectable()
export class GoogleSignupService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async googleAuth(googleAuthData: GoogleAuthDto): Promise<ServiceResponse> {
    
    const { email, userName, imageUrl, phoneNumber,signupThrough } = googleAuthData;
 

    try {
      // Check if the user already exists by email
      const existingUser = await this.userModel.findOne({ email });
      if (existingUser) {
        throw new ConflictException('User with this email already exists');
      }

      // Create a new user if they don't exist
      const newUser = new this.userModel({
        email,
        signupThrough,
        userName,
        profileImage: imageUrl,
        phoneNumber,
        emailVerified:true,
        registered:true
      });

      // Save the new user to the database
      const user =await newUser.save();
      const token = generateToken({email:user.email},"3hr")
      return {
        success: true,
        message: 'signup successful, please login',
        status: 200,
        token
      };
    } catch (error) {
      throw error;
    }
  }
}
