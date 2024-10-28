import { IsDate, IsEnum, IsOptional, IsString } from "class-validator";

// update-user.dto.ts (new file for onboarding updates)
export class UpdateUserDto {
    @IsOptional()
    @IsString()
    firstName?: string;
  
    @IsOptional()
    @IsString()
    lastName?: string;
  
    @IsOptional()
    @IsEnum(['male', 'female', 'other'])
    gender?: 'male' | 'female' | 'other';
  
    @IsOptional()
    @IsDate()
    dateOfBirth?: Date;
  
    @IsOptional()
    @IsString()
    phoneNumber?: string;
  }
  
  export class UpdateUserImagesDto {
    @IsString()
    url: string;
  
    @IsString()
    public_id: string;
  }