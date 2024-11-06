import { Module } from '@nestjs/common';
import { SignupController } from './signup.controller';
import { SignupService } from './signup.service';
import { MongooseModule } from '@nestjs/mongoose';
// import { SignupService } from './signup.service';
import { OTP, OTPSchema } from './entities/otp.entity';
import { UserSchema, User } from 'src/shared/entities/user.entity';
import { OtpController } from './otp.controller';
import { OtpService } from './otp.service';
import { ResendController } from './resend.service.controller';
import { VerifyToken } from './verifytoken.service';
import { VerifyTokenController } from './verifytoken.controller';
import { SharedModule } from 'src/shared/shared.module';
import { MailerService } from 'src/mailer/mailer.service';
@Module({
  imports: [
    SharedModule,
    MongooseModule.forFeature([{ name: 'otps', schema: OTPSchema }]),
  ],
  controllers: [
    SignupController,
    OtpController,
    ResendController,
    VerifyTokenController,
  ],
  providers: [SignupService, OtpService, VerifyToken],
})
export class SignupModule {}
