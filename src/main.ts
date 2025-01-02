import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ENV } from './utils/config/env.config';
import { printWithBorder } from './utils/text';
import * as morgan from 'morgan';
import { SpinUp } from 'spin-up-ping';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(morgan('dev'));
  // app.enableCors({
  //   origin: ['http://localhost:3000', 'https://clubwize-client.vercel.app', 'http://43.205.45.251'],
  //   // origin: '*',
  //   credentials: true
  // });

  app.enableCors({
    origin: true,
    credentials: true
  });

  // app.enableCors({
  //   origin: (origin, callback) => {
  //     if (origin) {
  //       callback(null, origin); // Reflect the origin in the response
  //     } else {
  //       callback(new Error('Not allowed by CORS'));
  //     }
  //   },
  //   credentials: true, // Allow credentials
  // });

  const pinger = new SpinUp({
    url: "https://your-server.com", // Your server URL
    intervalMinutes: 5, // Minimum 5 minutes
    onSuccess: (response) => {
      console.log("Ping successful:", response);
    },
    onError: (error) => {
      console.error("Ping failed:", error);
    },
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


  function getTimeUntil(targetHour: number, targetMinute: number): number {
    const now = new Date();
    const targetTime = new Date(now);

    // Set the target time to the specified hour and minute, with seconds and milliseconds reset
    targetTime.setHours(targetHour, targetMinute, 0, 0);

    if (targetTime <= now) {
      // If the target time has already passed today, schedule it for tomorrow
      targetTime.setDate(targetTime.getDate() + 1);
    }

    return targetTime.getTime() - now.getTime(); // Return the time difference in milliseconds
  }

  // Schedule to start pinging at 9:30 AM and stop at 8:00 PM
  const startTime = getTimeUntil(9, 30); // Time until 9:30 AM
  const stopTime = getTimeUntil(20, 0); // Time until 8:00 PM

  // Start pinging at 9:30 AM
  setTimeout(() => {
    console.log("Starting pinging...");
    pinger.start();

    // Stop pinging at 8:00 PM
    setTimeout(() => {
      console.log("Stopping pinging...");
      pinger.stop();
    }, stopTime - startTime); // Wait until stop time

  }, startTime);

  await app.listen(ENV.PORT ?? 4000).then(() => {
    printWithBorder('Server alive and running successfully on Port ' + ENV.PORT);
  });
}
bootstrap();
