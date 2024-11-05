import { Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { NodeSchema, Node_ } from '../entities/node.entity';
import { Club, ClubSchema } from '../entities/club.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'nodes', schema: NodeSchema }]),
    MongooseModule.forFeature([{ name: Club.name, schema: ClubSchema }]),
  ],
  providers: [SearchService],
  controllers: [SearchController]
})
export class SearchModule {}
