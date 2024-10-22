import { Body, Controller, Param, Post, Put } from '@nestjs/common';
import { CreateDetailsDto } from './dto/create-details.dto';
import { OnboardingService } from './onboarding.service';

@Controller('onboarding')
export class OnboardingController {
    constructor(private readonly onboardingService: OnboardingService){}

    @Put('details/:id')
    async createDetails(@Param('id') id: string, @Body() createDetailsDto: CreateDetailsDto) {
        try {
            return this.onboardingService.createDetails(id,createDetailsDto)
        } catch (error) {
            
        }
    }
}
