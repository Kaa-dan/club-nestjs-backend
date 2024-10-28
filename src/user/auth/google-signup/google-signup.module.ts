import { Module } from '@nestjs/common';

import { GoogleSignupController } from './google-signup.controller';
import { GoogleSignupService } from './google-signup.service';
import { SharedModule } from 'src/shared/shared.module';

@Module({
  imports: [
   SharedModule
  ],
  controllers: [GoogleSignupController],
  providers: [GoogleSignupService],
})
export class GoogleAuthModule {}
