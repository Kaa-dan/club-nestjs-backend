import { Module } from '@nestjs/common';
import { SignupModule } from './signup/signup.module';
import { LoginModule } from './login/login.module';
import { ForgotPasswordModule } from './forgot-password/forgot-password.module';
import { ChangePasswordModule } from './change-password/change-password.module';
import { GoogleAuthModule } from './google-signup/google-signup.module';
import { GoogleSigninModule } from './google-signin/google-signin.module';

@Module({
  imports: [
    SignupModule,
    LoginModule,
    ForgotPasswordModule,
    ChangePasswordModule,
    GoogleAuthModule,
    GoogleSigninModule,
  ],
})
export class AuthModule {}
