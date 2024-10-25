import {
  Injectable,
  NotFoundException,
  ConflictException,
  InternalServerErrorException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OTP } from './entities/otp.entity';
import { User } from './entities/user.entity';
import { generateOtp } from 'src/utils';
import { SendOtpDto } from './dto/send-otp-dto';
import { generateToken } from 'src/utils';
@Injectable()
export class OtpService {
  constructor(
    @InjectModel(OTP.name) private otpModel: Model<OTP>,
    @InjectModel(User.name) private userModel: Model<User>,
  ) {}

  async generateAndStoreOtp(emailDto: string): Promise<{ status: boolean }> {
    // console.log(emailDto,"emm");

    const email = emailDto; // Extract email from DTO
  console.log(email,"emaill")
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    const otp = generateOtp(); // Generate a 6-digit OTP

    try {
      // Check if a user with the provided email already exists
      let user = await this.userModel.findOne({ email });
      if (user?.email && user?.registered) {
        throw new ConflictException('user with this email already exist!!');
      }
      if (!user) {
        // If user doesn't exist, create a new user entry
        user = await this.userModel.create({ email, emailVerified: false });
      }

      // Delete any existing OTP for this email
      await this.otpModel.deleteOne({ email });

      // Create a new OTP document
      await this.otpModel.create({ email, otp });

      // In a real-world scenario, you would send the OTP via email here
      console.log(`OTP for ${email}: ${otp}`);

      // Generate and return a JWT token
      const token = generateToken({ email }, '10min');
      return { status: true };
    } catch (error) {
      console.log(error,"Err");
      
      throw error;
    }
  }

  async verifyOtp(
    email: string,
    otp: string,
  ): Promise<{ message: string; token: string }> {
    if (!email || !otp) {
      throw new BadRequestException('Email and OTP are required');
    }

    try {
      // Find the OTP document for the given email
      const storedOtp = await this.otpModel.findOne({ email });

      // Check if the OTP exists and matches the stored OTP
      if (!storedOtp || storedOtp.otp !== otp) {
        throw new NotFoundException('Invalid or expired OTP');
      }

      // Delete the OTP after successful verification
      await this.otpModel.deleteOne({ _id: storedOtp._id });

      // Update the user's email verification status
      await this.userModel.updateOne({ email }, { emailVerified: true });

      // Generate a new JWT token for the verified user
      const token = generateToken({ email }, '10min');

      return {
        message: 'Email verified successfully',
        token,
      };
    } catch (error) {
      console.log(error, 'Err');
      throw error;
    }
  }

  async resendOtp(email: string): Promise<{ message: string }> {
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    try {
      const otp = generateOtp(); // Generate a new OTP

      // Delete any existing OTP for this email
      await this.otpModel.deleteOne({ email });

      // Create a new OTP document
      await this.otpModel.create({ email, otp });

      // In a real-world scenario, send the new OTP via email
      console.log(`New OTP for ${email}: ${otp}`);

      return { message: 'New OTP has been sent successfully' };
    } catch (error) {
      throw error
    }
  }
}
