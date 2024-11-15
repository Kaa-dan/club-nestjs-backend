import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ENV } from './utils/config/env.config';
import { printWithBorder } from './utils/text';
import * as morgan from 'morgan';
import { SpinUp } from 'spin-up-ping';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(morgan('dev'));

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

  app.enableCors({
    // origin: ['http://localhost:3001', 'http://localhost:3000'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });
  await app.listen(ENV.PORT ?? 4000).then(() => {
    printWithBorder('Server running successfully on Port ' + ENV.PORT);
  });
}
bootstrap();
