import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User } from 'src/shared/entities/user.entity';
import { GoogleSignIn } from './dto/google-signin-dto';
import { generateToken, hashPassword } from 'src/utils';
import { generateRandomPassword } from 'src/utils/generatePassword';
@Injectable()
export class GoogleSigninService {
  constructor(@InjectModel(User.name) private userModel: Model<User>) { }

  async googleLogin(signinData: GoogleSignIn) {
    const hashedPassword = await hashPassword(generateRandomPassword());
    try {
      const { email, userName, imageUrl, phoneNumber, signupThrough } =
        signinData;

      // Check if the user already exists
      let user = await this.userModel.findOne({ email }).select("-password");

      // User exists, generate a token and send response
      const token = generateToken({ email, id: user._id }, '2hr');
      if (user && user.registered && user.emailVerified) {
        return {
          success: true,
          message: 'login successful',
          token,
          user,
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
        user.registered = true
        user.emailVerified = true
        user.password = hashedPassword;
        user.profileImage = {
          url : imageUrl,
          public_id : ""
        }
        user = await user.save();
        return {
          success: true,
          message: 'login successful',
          token,
          user,
        };
      } else {
        const newUser = await this.userModel.create({
          email,
          userName: userName.split(' ')[0],
          profileImage: {
            url: imageUrl,
          },
          phoneNumber,
          emailVerified: true,
          registered: true,
          signupThrough,
          password: hashedPassword,
        });
        const token = generateToken({ email: newUser.email }, '5hr');

        const sanitizedUser = JSON.parse(JSON.stringify(newUser));
        delete sanitizedUser.password;

        return {
          success: true,
          message: 'login successful',
          token,
          user: sanitizedUser,
        };
      }
    } catch (error) {
      throw error;
    }
  }
}
