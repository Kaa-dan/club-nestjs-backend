import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose'; // Import MongooseModule
import { LoginController } from './login.controller';
import { LoginService } from './login.service';
import { SharedModule } from 'src/shared/shared.module';

@Module({
  imports: [
    SharedModule // Import the User schema
  ],
  controllers: [LoginController],
  providers: [LoginService],
})
export class LoginModule {}
