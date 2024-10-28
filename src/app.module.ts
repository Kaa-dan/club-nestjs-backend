import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import envConfig, { ENV } from './utils/config/env.config';
import { MongooseModule } from '@nestjs/mongoose';
import { LoginModule } from './user/auth/login/login.module';
import { SharedModule } from './shared/shared.module';
import { InterestModule } from './interest/interest.module';

import { FileUploadMiddleware } from './shared/middleware/file-upload.middleware';
import { MailerModule } from './mailer/mailer.module';
@Module({
  imports: [
    UserModule,
    ConfigModule.forRoot({
      load: [envConfig],
      isGlobal: true,
    }),
    MongooseModule.forRoot(ENV.DATABASE_URL),
    LoginModule,
    SharedModule,
    InterestModule,
    MailerModule,
  ],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(FileUploadMiddleware).forRoutes({
      path: 'onboarding/images/:id',
      method: RequestMethod.PUT,
    });
  }
}
