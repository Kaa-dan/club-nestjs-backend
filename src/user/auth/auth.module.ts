import { Module } from '@nestjs/common';
import { SignupModule } from './signup/signup.module';
import { LoginModule } from './login/login.module';
import { ForgotPasswordModule } from './forgot-password/forgot-password.module';
import { ChangePasswordModule } from './change-password/change-password.module';

@Module({
  imports: [SignupModule, LoginModule, ForgotPasswordModule, ChangePasswordModule],
  
})
export class AuthModule {}
