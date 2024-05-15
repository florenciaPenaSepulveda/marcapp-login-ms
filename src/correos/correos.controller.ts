import { Controller, Get, Post, Body } from '@nestjs/common';
import { CorreosService } from './correos.service';

@Controller('correos')
export class CorreosController {
  constructor(private readonly correosService: CorreosService) {}

  @Get()
  sendMail(): void {
    return this.correosService.sendMail();
  }
}
