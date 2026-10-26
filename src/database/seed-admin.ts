import dataSource from './data-source';
import { User } from '../users/user.entity';
import { CreateUserDto } from '../dto/create-user.dto';
import { Role } from '../enum/user-type.enum';
import { hashPassword } from '../auth/password';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

const leer = (nombre: string): string => {
  const valor = process.env[nombre];
  if (!valor) {
    throw new Error(`Falta la variable ${nombre}`);
  }
  return valor;
};

const main = async () => {
  const dto = plainToInstance(CreateUserDto, {
    email: leer('ADMIN_EMAIL'),
    firstName: process.env.ADMIN_FIRST_NAME ?? 'Admin',
    lastName: process.env.ADMIN_LAST_NAME ?? 'Marcapp',
    pass: leer('ADMIN_PASSWORD'),
    birthday: process.env.ADMIN_BIRTHDAY ?? '1990-01-01',
  });
  const errores = await validate(dto);
  if (errores.length > 0) {
    throw new Error(
      errores.flatMap((e) => Object.values(e.constraints ?? {})).join('; '),
    );
  }

  await dataSource.initialize();
  const repositorio = dataSource.getRepository(User);
  const existente = await repositorio.findOne({ where: { email: dto.email } });
  if (existente) {
    await repositorio.update(existente.id, { type: Role.ADMIN });
    console.log(`Rol de administrador asignado a ${dto.email}`);
  } else {
    await repositorio.save(
      repositorio.create({
        ...dto,
        pass: await hashPassword(dto.pass),
        type: Role.ADMIN,
      }),
    );
    console.log(`Administrador ${dto.email} creado`);
  }
  await dataSource.destroy();
};

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
