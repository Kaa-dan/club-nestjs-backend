import { IsEnum, IsNotEmpty, IsString } from "class-validator"

export class AccessDto {
    @IsEnum(['club', 'node'])
    @IsNotEmpty()
    entity: 'club' | 'node'

    @IsString()
    @IsNotEmpty()
    entityId: string

    @IsString()
    @IsNotEmpty()
    accessToUserId: string
}