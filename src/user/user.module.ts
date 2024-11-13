import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { OnboardingModule } from './onboarding/onboarding.module';
import { APP_GUARD } from '@nestjs/core';
import { UserAuthGuard } from './guards/user-auth.guard';
import { SharedModule } from 'src/shared/shared.module';
import { NodeModule } from './node/node.module';
import { ClubModule } from './club/club.module';
import { SearchModule } from 'src/shared/search/search.module';
import { UserController } from './user.controller';
import { UserService } from './user.service';

import { MongooseModule } from '@nestjs/mongoose';

import { User, UserSchema } from 'src/shared/entities/user.entity';

import { InvitationModule } from './invitation/invitation.module';
import { CommentModule } from './comment/comment.module';
import { ReportModule } from './report/report.module';

@Module({
  imports: [
    AuthModule,
    OnboardingModule,
    SharedModule,
    NodeModule,
    ClubModule,
    SearchModule,
    InvitationModule,
    CommentModule,
    ReportModule,
  ],

  providers: [
    {
      provide: APP_GUARD,
      useClass: UserAuthGuard,
    },
    UserService,
  ],
  controllers: [UserController],
})
export class UserModule {}
