import { Test, TestingModule } from '@nestjs/testing';
import { CorreosController } from './correos.controller';

describe('CorreosController', () => {
  let controller: CorreosController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CorreosController],
    }).compile();

    controller = module.get<CorreosController>(CorreosController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
