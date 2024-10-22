import {  Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import envConfig from './utils/config/env.config';
import { MongooseModule } from '@nestjs/mongoose';
import { LoginModule } from './user/auth/login/login.module';
import { SharedModule } from './shared/shared.module';

@Module({
  imports: [
    UserModule,
    ConfigModule.forRoot({
      load: [envConfig],
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.DATABASE),
    LoginModule,
    SharedModule
  ],
})
export class AppModule {

}
