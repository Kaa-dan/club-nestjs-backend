import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class CreateInterestDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(50)
  title: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  @MaxLength(500)
  description: string;
}

export class UpdateInterestDto extends CreateInterestDto {}
