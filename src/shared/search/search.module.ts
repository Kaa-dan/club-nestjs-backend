import { forwardRef, Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { NodeSchema, Node_ } from '../entities/node.entity';
import { Club, ClubSchema } from '../entities/club.entity';
import { SharedModule } from '../shared.module';

@Module({
  imports: [
    forwardRef(() => SharedModule)
  ],
  providers: [SearchService],
  controllers: [SearchController]
})
export class SearchModule {}
