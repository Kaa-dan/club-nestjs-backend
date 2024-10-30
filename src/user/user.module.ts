import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { APP_GUARD } from '@nestjs/core';
import { UserAuthGuard } from './guards/user-auth.guard';

@Module({
  imports: [AuthModule, OnboardingModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: UserAuthGuard,
    },
  ],
})
export class UserModule {}
