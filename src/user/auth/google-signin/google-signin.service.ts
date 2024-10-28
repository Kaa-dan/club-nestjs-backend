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
      }

      if (user && user.emailVerified) {
        user = await user.save();

        return {
          success: true,
          message: 'login successful',
          token,
          user,
        };
      }else{
        const newUser = await  this.userModel.create({
          email,
          userName : userName.split(" ")[0],
          profileImage: imageUrl,
          phoneNumber,
          signupThrough
        })
       const token = generateToken({email:newUser.email},"5hr")
        return {
          success:true,
          message:'login successful',
          token,
          user:newUser

        }
      }
    } catch (error) {
      throw error;
    }
  }
}
