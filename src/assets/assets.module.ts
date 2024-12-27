import { Module } from '@nestjs/common';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { SharedModule } from 'src/shared/shared.module';

@Module({
  controllers: [AssetsController],
  providers: [AssetsService],
  imports: [SharedModule],
})
export class AssetsModule {}
