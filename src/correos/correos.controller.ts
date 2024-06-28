import * as nestCommon from '@nestjs/common';
import { CorreosService } from './correos.service';

@nestCommon.Controller('correos')
export class CorreosController {
  constructor(private readonly correosService: CorreosService) {}

  @nestCommon.Get()
  sendMail(): void {
    return this.correosService.sendMail();
  }
}
