import { Module } from '@nestjs/common';
import { SharedModule } from 'src/shared/shared.module';
import { ChangePasswordService } from './change-password.service';
import { ChangePasswordController } from './change-password.controller';
@Module({
   imports:[SharedModule],
    providers: [ChangePasswordService],
    controllers: [ChangePasswordController]
})
export class ChangePasswordModule {}
