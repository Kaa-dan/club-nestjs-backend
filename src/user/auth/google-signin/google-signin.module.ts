import { Module } from '@nestjs/common';
import { GoogleSigninController } from './google-signin.controller';
import { GoogleSigninService } from './google-signin.service';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/shared/entities/user.entity';

@Module({
  imports : [MongooseModule.forFeature([{name:User.name, schema:UserSchema}])],
  controllers: [GoogleSigninController],
  providers: [GoogleSigninService]
})
export class GoogleSigninModule {}
