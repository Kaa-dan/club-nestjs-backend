import { Module } from '@nestjs/common';
import { SignupController } from './signup.controller';
import { SignupService } from './signup.service';
import { MongooseModule } from '@nestjs/mongoose';
// import { SignupService } from './signup.service';
import { OTP, OTPSchema } from './entities/otp.entity';
import { User, UserSchema } from './entities/user.entity';
import { OtpController } from './otp.controller';
import { OtpService } from './otp.service';
import { ResendController } from './resend.service.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MongooseModule.forFeature([{ name: OTP.name, schema: OTPSchema }]),
  ],
  controllers: [SignupController,OtpController,ResendController],
  providers: [SignupService,OtpService],
})
export class SignupModule {}
