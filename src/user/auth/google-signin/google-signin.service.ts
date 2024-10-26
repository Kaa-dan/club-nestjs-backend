import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/shared/entities/user.entity';
import { GoogleSignIn } from './dto/google-signin-dto';
import { generateToken } from 'src/utils';

@Injectable()
export class GoogleSigninService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) {}

  async googleLogin(signinData: GoogleSignIn) {
    try {
      const { email, userName, imageUrl, phoneNumber, signupThrough } =
        signinData;

      // Check if the user already exists
      let user = await this.userModel.findOne({ email });
      // User exists, generate a token and send response
      const token = generateToken({ email }, '2hr');
      if (user && user.registered && user.emailVerified) {
        return {
          success: true,
          message: 'login successful',
          token,
          user,
        };
      } else {
        // User does not exist, create new user
        const newUser = new this.userModel({
          email,
          userName : userName.split(' ')[0],
          imageUrl,
          phoneNumber,
          signupThrough:"google",
          registered:true,
          emailVerified:true
          
        });
        user = await newUser.save();

        return {
          success: true,
          message: 'login successful',
          token,
          user,
        };
      }
    } catch (error) {
      throw error;
    }
  }
}
