import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ENV } from './utils/config/env.config';
import { printWithBorder } from './utils/text';
import * as morgan from 'morgan';
// import { SpinUp } from 'spin-up-ping';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(morgan('dev'));
  // app.enableCors({
  //   origin: ['http://localhost:3000', 'https://clubwize-client.vercel.app'],
  //   credentials: true,
  // });
  app.enableCors({
    // origin: ['http://localhost:3000', 'https://clubwize-client.vercel.app', 'http://43.205.45.251'],
    origin: '*',
  });
  // app.use(cookieParser());
  // app.useGlobalPipes(
  //   new ValidationPipe({
  //     transform: true, // Enable transformation
  //     transformOptions: {
  //       enableImplicitConversion: true, // Enable implicit conversions
  //     },
  //     whitelist: true,
  //     forbidNonWhitelisted: true,
  //   }),
  // );

  // app.enableCors({
  //   methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS', credentials: true,
  // });
  await app.listen(ENV.PORT ?? 4000).then(() => {
    printWithBorder('Server alive and running successfully on Port ' + ENV.PORT);
  });
}
bootstrap();
