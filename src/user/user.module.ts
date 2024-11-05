import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { APP_GUARD } from '@nestjs/core';
import { UserAuthGuard } from './guards/user-auth.guard';
import { SharedModule } from 'src/shared/shared.module';
import { NodeModule } from './node/node.module';
import { ClubModule } from './club/club.module';

@Module({
  imports: [AuthModule, OnboardingModule, SharedModule, NodeModule, ClubModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: UserAuthGuard,
    },
  ],
})
export class UserModule {}
