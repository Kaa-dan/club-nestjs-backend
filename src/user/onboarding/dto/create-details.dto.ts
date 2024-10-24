import { IsDate, IsEnum, IsString } from "class-validator"

export class CreateDetailsDto {
    @IsString()
    userName: string

    @IsString()
    firstName: string

    @IsString()
    lastName: string

    @IsDate()
    dateOfBirth: Date

    @IsString()
    phoneNumber: string
    
    @IsEnum(['male', 'female', 'other'])
    gender: 'male' | 'female' | 'other'
}