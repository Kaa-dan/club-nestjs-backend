import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import envConfig, { ENV } from './utils/config/env.config';
import { printWithBorder } from './utils/text';
import * as morgan from 'morgan';
import { SpinUp } from 'spin-up-ping';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(morgan('dev'));

  app.enableCors({
    origin: true,
    credentials: true
  });

  const pinger = new SpinUp({
    url: ENV.RENDER_URL,
    intervalMinutes: 5,
    onSuccess: (response) => {
      console.log("Ping successful:", response);
    },
    onError: (error) => {
      console.error("Ping failed:", error);
    },
  });

  pinger.start();
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


  await app.listen(ENV.PORT ?? 4000).then(() => {
    printWithBorder('Server alive and running successfully on Port ' + ENV.PORT);
  });
}
bootstrap();
