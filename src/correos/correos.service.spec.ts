import { Test, TestingModule } from '@nestjs/testing';
import { CorreosService } from './correos.service';

describe('CorreosService', () => {
  let service: CorreosService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CorreosService],
    }).compile();

    service = module.get<CorreosService>(CorreosService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
