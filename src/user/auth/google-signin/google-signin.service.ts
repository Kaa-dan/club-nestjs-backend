import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/shared/entities/user.entity';
import { GoogleSignIn } from './dto/google-signin-dto';
import { generateToken, hashPassword } from 'src/utils';
import { generateRandomPassword } from 'src/utils/generatePassword';
import { ENV } from 'src/utils/config/env.config';
@Injectable()
export class GoogleSigninService {
  constructor(@InjectModel('users') private userModel: Model<User>) {}

  async googleLogin(signinData: GoogleSignIn) {
    const hashedPassword = await hashPassword(generateRandomPassword());
    try {
      const { email, userName, imageUrl, phoneNumber, signupThrough } =
        signinData;

      // Check if the user already exists
      let user = await this.userModel.findOne({ email }).select('-password');

      // User exists, generate a token and send response
      const token = generateToken(
        { email, id: user._id },
        ENV.TOKEN_EXPIRY_TIME,
      );
      if (user && user.registered && user.emailVerified) {
        return {
          success: true,
          message: 'login successful',
          token,
          data: user,
        };
      }

      if (user && user.emailVerified) {
        user.registered = true;
        user.password = hashedPassword;
        user = await user.save();
        return {
          success: true,
          message: 'login successful',
          token,
          user,
        };
      } else if (user && !user.emailVerified && !user.registered) {
        user.registered = true;
        user.emailVerified = true;
        user.password = hashedPassword;
        user.profileImage = imageUrl;
        user = await user.save();
        return {
          success: true,
          message: 'login successful',
          token,
          data: user,
        };
      } else {
        const newUser = await this.userModel.create({
          email,
          userName: userName.split(' ')[0],
          profileImage:imageUrl,
          phoneNumber,
          emailVerified: true,
          registered: true,
          signupThrough,
          password: hashedPassword,
        });
        const token = generateToken(
          { email: newUser.email, id: newUser._id },
          ENV.TOKEN_EXPIRY_TIME,
        );

        const sanitizedUser = JSON.parse(JSON.stringify(newUser));
        delete sanitizedUser.password;

        return {
          success: true,
          message: 'login successful',
          token,
          data: sanitizedUser,
        };
      }
    } catch (error) {
      throw error;
    }
  }
}
