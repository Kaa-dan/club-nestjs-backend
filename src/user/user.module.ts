import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { APP_GUARD } from '@nestjs/core';
import { JwtVerifyGuard } from './guards/jwt.verify.guard';

@Module({
  imports: [AuthModule, OnboardingModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtVerifyGuard,
    },
  ],
})
export class UserModule {}
