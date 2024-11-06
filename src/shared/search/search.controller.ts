import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('search')
export class SearchController {
    constructor(private readonly searchService: SearchService) { }

    @Get(':id')
    async search(@Query('term') term: string, @Query('tag') tag?: string, @Param('id') id?: string) {
        return await this.searchService.search(term, tag);
    }
}
