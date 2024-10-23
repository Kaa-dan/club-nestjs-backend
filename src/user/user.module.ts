import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { ForgotPasswordModule } from './auth/forgot-password/forgot-password.module';
import { ChangePasswordModule } from './auth/change-password/change-password.module';

@Module({
  imports: [
    AuthModule,
    OnboardingModule,
    ForgotPasswordModule,
    ChangePasswordModule,
  ],
})
export class UserModule {}
