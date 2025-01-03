import { IsEnum, IsNotEmpty, IsString } from "class-validator"

export class AccessDto {
    @IsEnum(['club', 'node', 'chapter'])
    @IsNotEmpty()
    entity: 'club' | 'node' | 'chapter'

    @IsString()
    @IsNotEmpty()
    entityId: string

    @IsString()
    @IsNotEmpty()
    accessToUserId: string
}