import { Controller, Get, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { ApiResponse, UserDto } from '@repo/shared';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  async getProfile(
    @CurrentUser() user: { sub: string },
  ): Promise<ApiResponse<UserDto>> {
    const profile = await this.usersService.getProfile(user.sub);
    return {
      success: true,
      data: profile,
    };
  }
}
