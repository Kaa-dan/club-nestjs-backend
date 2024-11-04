import { Module } from '@nestjs/common';
import { GoogleSigninController } from './google-signin.controller';
import { GoogleSigninService } from './google-signin.service';

import { SharedModule } from 'src/shared/shared.module';

@Module({
  imports : [SharedModule],
  controllers: [GoogleSigninController],
  providers: [GoogleSigninService]
})
export class GoogleSigninModule {}
