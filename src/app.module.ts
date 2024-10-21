import { Logger, Module, OnModuleInit } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import envConfig from './utils/config/env.config';
import { MongooseModule } from '@nestjs/mongoose';
import { connection } from 'mongoose';

@Module({
  imports: [
    UserModule,
    ConfigModule.forRoot({
      load: [envConfig],
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.DATABASE)
  ],
})
export class AppModule {

}
