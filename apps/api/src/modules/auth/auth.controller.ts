import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { AuthService } from './auth.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register new user with email, location, age, and terms verification' })
  async register(
    @Body()
    body: {
      phone: string;
      email: string;
      location?: string;
      password?: string;
      firstName: string;
      lastName: string;
      dateOfBirth?: string;
      termsAccepted?: boolean;
      responsiblePlayAcknowledged?: boolean;
    }
  ) {
    return this.authService.register(body);
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify email 6-digit OTP code and retrieve access/refresh tokens' })
  async verifyEmail(@Body() body: { email: string; code: string }) {
    return this.authService.verifyEmailOtp(body.email, body.code);
  }

  @Post('resend-code')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Resend email verification code' })
  async resendCode(@Body() body: { email: string }) {
    return this.authService.resendEmailOtp(body.email);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request password reset verification code via email' })
  async forgotPassword(@Body() body: { emailOrPhone: string }) {
    return this.authService.forgotPassword(body.emailOrPhone);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify code and reset user password' })
  async resetPassword(
    @Body() body: { emailOrPhone: string; code: string; newPassword: string }
  ) {
    return this.authService.resetPassword(body);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login using phone and password' })
  async login(@Body() body: { phone: string; password?: string }) {
    return this.authService.loginWithPassword(body.phone, body.password);
  }

  @Post('otp/request')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Request SMS OTP login/verification code' })
  async requestOtp(@Body() body: { phone: string }) {
    return this.authService.sendOtp(body.phone);
  }

  @Post('otp/verify')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Verify SMS OTP code and retrieve access/refresh tokens' })
  async verifyOtp(@Body() body: { phone: string; code: string }) {
    return this.authService.verifyOtp(body.phone, body.code);
  }
}
