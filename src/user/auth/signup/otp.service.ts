import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { OTP } from './entities/otp.entity';
import { User } from 'src/shared/entities/user.entity';
import { generateOtp } from 'src/utils';
import { generateToken } from 'src/utils';
import { MailerService } from 'src/mailer/mailer.service';
@Injectable()
export class OtpService {
  constructor(
    @InjectModel(OTP.name) private otpModel: Model<OTP>,
    @InjectModel(User.name) private userModel: Model<User>,
    private brevoService: MailerService,
  ) { }

  async generateAndStoreOtp(emailDto: string): Promise<{ status: boolean }> {
    const email = emailDto; // Extract email from DTO
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    const otp = generateOtp(); // Generate a 6-digit OTP
    console.log({ otp })

    try {
      // Check if a user with the provided email already exists
      let user = await this.userModel.findOne({ email });
      if (user && user?.emailVerified) {
        throw new ConflictException('user with this email already exist!!');
      }
      await this.userModel.deleteOne({ email });
      // If user doesn't exist, create a new user entry
      user = await this.userModel.create({ email, emailVerified: false });

      // Delete any existing OTP for this email
      await this.otpModel.deleteOne({ email });

      // Create a new OTP document
      await this.otpModel.create({ email, otp });

      // In a real-world scenario, you would send the OTP via email here
      await this.brevoService.sendEmail(
        email,
        'OTP',
        `<!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <title></title>
          <style>
            body {
              margin: 0;
              padding: 0;
              font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
              color: #333;
              background-color: #fff;
            }
        
            .container {
              margin: 0 auto;
              width: 100%;
              max-width: 600px;
              padding: 0 0px;
              padding-bottom: 10px;
              border-radius: 5px;
              line-height: 1.8;
            }
        
            .header {
              border-bottom: 1px solid #eee;
            }
        
            .header a {
              font-size: 1.4em;
              color: #000;
              text-decoration: none;
              font-weight: 600;
            }
        
            .content {
              min-width: 700px;
              overflow: auto;
              line-height: 2;
            }
        
            .otp {
              background: linear-gradient(to right, #00bc69 0, #00bc88 50%, #00bca8 100%);
              margin: 0 auto;
              width: max-content;
              padding: 0 10px;
              color: #fff;
              border-radius: 4px;
            }
        
            .footer {
              color: #aaa;
              font-size: 0.8em;
              line-height: 1;
              font-weight: 300;
            }
        
            .email-info {
              color: #666666;
              font-weight: 400;
              font-size: 13px;
              line-height: 18px;
              padding-bottom: 6px;
            }
        
            .email-info a {
              text-decoration: none;
              color: #00bc69;
            }
          </style>
        </head>
        
        <body>
          <!--Subject: Login Verification Required for Your Clubwize Account-->
          <div class="container">
            <div class="header">
             
            </div>
            <br />
            
            <p>
              We have received a signup request for your Clubwize account. For
              security purposes, please verify your identity by providing the
              following One-Time Password (OTP).
              <br />
              <b>Your One-Time Password (OTP) verification code is:</b>
            </p>
            <h2 class="otp">${otp}</h2>
            <p style="font-size: 0.9em">
              <strong>One-Time Password (OTP) is valid for 10 minutes.</strong>
              <br />
              <br />
              If you did not initiate this login request, please disregard this
              message. Please ensure the confidentiality of your OTP and do not share
              it with anyone.<br />
              <strong>Do not forward or give this code to anyone.</strong>
              <br />
              <br />
              <strong>Thank you for using Clubwize.</strong>
              <br />
              <br />
              Best regards,
              <br />
              <strong>Clubwize</strong>
            </p>
        
            <hr style="border: none; border-top: 0.5px solid #131111" />
            <div class="footer">
              <p>This email can't receive replies.</p>
              <p>
                For more information about clubwize and your account, visit
                <strong>Clubwize</strong>
              </p>
            </div>
          </div>
          <div style="text-align: center">
          
           <!-- 
        <div class="email-info">
          <a href="/">[Company Name]</a> | [Address]
          | [Address] - [Zip Code/Pin Code], [Country Name]
        </div>
        -->
        
            <div class="email-info">
              &copy; 2024  clubwize. All rights
              reserved.
            </div>
          </div>
        </body>
        
        </html>`,
      );
      // Generate and return a JWT token
      const token = generateToken({ email }, '10min');
      return { status: true };
    } catch (error) {

      throw error;
    }
  }

  async verifyOtp(
    email: string,
    otp: string,
  ): Promise<{ message: string; token: string }> {

    console.log({ otp })
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
      await this.brevoService.sendEmail(
        email,
        'OTP',
        `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title></title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
      color: #333;
      background-color: #fff;
    }

    .container {
      margin: 0 auto;
      width: 100%;
      max-width: 600px;
      padding: 0 0px;
      padding-bottom: 10px;
      border-radius: 5px;
      line-height: 1.8;
    }

    .header {
      border-bottom: 1px solid #eee;
    }

    .header a {
      font-size: 1.4em;
      color: #000;
      text-decoration: none;
      font-weight: 600;
    }

    .content {
      min-width: 700px;
      overflow: auto;
      line-height: 2;
    }

    .otp {
      background: linear-gradient(to right, #00bc69 0, #00bc88 50%, #00bca8 100%);
      margin: 0 auto;
      width: max-content;
      padding: 0 10px;
      color: #fff;
      border-radius: 4px;
    }

    .footer {
      color: #aaa;
      font-size: 0.8em;
      line-height: 1;
      font-weight: 300;
    }

    .email-info {
      color: #666666;
      font-weight: 400;
      font-size: 13px;
      line-height: 18px;
      padding-bottom: 6px;
    }

    .email-info a {
      text-decoration: none;
      color: #00bc69;
    }
  </style>
</head>

<body>
  <!--Subject: Login Verification Required for Your Clubwize Account-->
  <div class="container">
    <div class="header">
     
    </div>
    <br />
    
    <p>
      We have received a signup request for your Clubwize account. For
      security purposes, please verify your identity by providing the
      following One-Time Password (OTP).
      <br />
      <b>Your One-Time Password (OTP) verification code is:</b>
    </p>
    <h2 class="otp">${otp}</h2>
    <p style="font-size: 0.9em">
      <strong>One-Time Password (OTP) is valid for 10 minutes.</strong>
      <br />
      <br />
      If you did not initiate this login request, please disregard this
      message. Please ensure the confidentiality of your OTP and do not share
      it with anyone.<br />
      <strong>Do not forward or give this code to anyone.</strong>
      <br />
      <br />
      <strong>Thank you for using Clubwize.</strong>
      <br />
      <br />
      Best regards,
      <br />
      <strong>Clubwize</strong>
    </p>

    <hr style="border: none; border-top: 0.5px solid #131111" />
    <div class="footer">
      <p>This email can't receive replies.</p>
      <p>
        For more information about clubwize and your account, visit
        <strong>Clubwize</strong>
      </p>
    </div>
  </div>
  <div style="text-align: center">
  
   <!-- 
<div class="email-info">
  <a href="/">[Company Name]</a> | [Address]
  | [Address] - [Zip Code/Pin Code], [Country Name]
</div>
-->

    <div class="email-info">
      &copy; 2024  clubwize. All rights
      reserved.
    </div>
  </div>
</body>

</html>`,
      );
      // In a real-world scenario, send the new OTP via email

      return { message: 'New OTP has been sent successfully' };
    } catch (error) {
      throw error;
    }
  }
}
