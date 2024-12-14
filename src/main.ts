import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ENV } from './utils/config/env.config';
import { printWithBorder } from './utils/text';
import * as morgan from 'morgan';
import { SpinUp } from 'spin-up-ping';
import * as cookieParser from 'cookie-parser';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(morgan('dev'));
  // app.enableCors({
  //   origin: ['http://localhost:3000', 'https://clubwize-client.vercel.app'],
  //   credentials: true,
  // });
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'https://clubwize-client.vercel.app',
      // Add your API domain if needed
      'http://43.205.45.251'
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    exposedHeaders: ['set-cookie']
  });
  app.use(cookieParser());
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
  const pinger = new SpinUp({
    url: ENV.RENDER_URL,
    intervalMinutes: 10,
    onSuccess: () => {
      console.log('Server is up and running!');
    },
    onError: (error) => {
      console.error('Error pinging server:', error);
    },
  });

  pinger.start();

  // app.enableCors({
  //   methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  //   credentials: true,
  // });
  await app.listen(ENV.PORT ?? 4000).then(() => {
    printWithBorder('Server alive and running successfully on Port ' + ENV.PORT);
  });
}
bootstrap();
