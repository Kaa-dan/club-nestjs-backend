import { forwardRef, Module } from '@nestjs/common';
import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { SharedModule } from '../shared.module';

@Module({
  imports: [
    forwardRef(() => SharedModule)
  ],
  providers: [SearchService],
  controllers: [SearchController]
})
export class SearchModule { }
