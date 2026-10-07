import { Controller, Post, Get, Param, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { PaymentMethod } from '@nati-lotto/shared-types';

@ApiTags('Orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new order and reserve tickets atomically' })
  async createOrder(
    @Body()
    body: {
      userId: string;
      drawId: string;
      quantity: number;
      paymentMethod: PaymentMethod;
      idempotencyKey?: string;
      selectedSequenceNumbers?: number[];
      returnUrl?: string;
    }
  ) {
    return this.ordersService.createOrder({
      ...body,
      idempotencyKey: body.idempotencyKey || `idem-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
    });
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get all orders for a specific user' })
  async findUserOrders(@Param('userId') userId: string) {
    return this.ordersService.findUserOrders(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details by order ID' })
  async findOrderById(@Param('id') id: string) {
    return this.ordersService.findOrderById(id);
  }
}
