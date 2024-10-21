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
import { User } from './entities/user.entity'; // Make sure to import your User model
import { generateOtp, generateToken } from 'src/utils';
import { SendOtpDto } from './dto/send-otp-dto';
@Injectable()
export class OtpService {
  constructor(
    @InjectModel(OTP.name) private otpModel: Model<OTP>,
    @InjectModel(User.name) private userModel: Model<User>, // Inject the User model
  ) {}

  async generateAndStoreOtp(email:SendOtpDto): Promise<string> {
    // Check if email is provided
    if (!email) {
      throw new BadRequestException('Email is required');
    }
  
    // Generate a 6-digit OTP
    const otp = generateOtp();
  
    try {
      // Check if a user with the provided email already exists
      let user = await this.userModel.findOne({ email });
      
      // If user doesn't exist, create a new user entry
      if (!user) {
        user = await this.userModel.create({ email, emailVerified: false }); // Assuming emailVerified is set to false initially
      }
  
      // Check if an OTP already exists for this email
      const existingOtp = await this.otpModel.findOne({ email });
      if (existingOtp) {
        // Update the existing OTP
        existingOtp.otp = otp;
        await existingOtp.save();
      } else {
        // Create a new OTP document
        await this.otpModel.create({ email, otp });
      }
  
      // In a real-world scenario, you would send the OTP via email here
      console.log(`OTP for ${email}: ${otp}`);
  
      // Generate and return a JWT token
      const token = generateToken({ email }, '10min');
      return token;
    } catch (error) {
      // Handle database errors or other unexpected errors
      throw new InternalServerErrorException('An error occurred while generating OTP');
    }
  }

  async verifyOtp(
    email: string,
    otp: string,
  ): Promise<{ message: string; token: string }> {
    // Check if email and OTP are provided
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

      // If OTP is valid, delete it from the collection
      await this.otpModel.deleteOne({ _id: storedOtp._id });

      // Update the user’s email verification status
      await this.userModel.updateOne({ email }, { emailVerified: true });

      // Generate a new token for the verified user
      const token = generateToken({ email }, '10min');

      // Return success message and token
      return {
        message: 'Email verified successfully',
        token: token,
      };
    } catch (error) {
      throw error;
    }
  }
}
