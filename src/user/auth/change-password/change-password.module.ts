import { Module } from '@nestjs/common';
import { User, UserSchema } from '../signup/entities/user.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { ChangePasswordService } from './change-password.service';
import { ChangePasswordController } from './change-password.controller';
@Module({
    imports : [MongooseModule.forFeature([{name:User.name, schema: UserSchema}])],
    providers: [ChangePasswordService],
    controllers: [ChangePasswordController]
})
export class ChangePasswordModule {}
