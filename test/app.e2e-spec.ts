process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ??= 'secreto-de-pruebas-con-mas-de-32-caracteres';
process.env.DB_NAME = process.env.DB_NAME_TEST ?? 'usersDB_test';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { configurarApp } from './../src/app.setup';
import { UsersService } from './../src/users/users.service';

const sufijo = Date.now().toString(36);
const correo = (nombre: string) => `${nombre}.${sufijo}@test.cl`;

const datos = (nombre: string, extra: Record<string, unknown> = {}) => ({
  email: correo(nombre),
  firstName: 'Ana',
  lastName: 'Pérez',
  pass: 'Clave12345',
  birthday: '1995-04-20',
  ...extra,
});

describe('Marcapp login (e2e)', () => {
  let app: INestApplication;
  let usuarios: UsersService;
  const http = () => request(app.getHttpServer());

  const ingresar = async (email: string, pass = 'Clave12345') => {
    const res = await http().post('/auth/login').send({ email, pass });
    return res.body.access_token as string;
  };

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = modulo.createNestApplication();
    configurarApp(app);
    await app.init();
    usuarios = app.get(UsersService);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('salud', () => {
    it('responde en la raíz y en /health', async () => {
      await http().get('/').expect(200, { status: 'ok' });
      await http().get('/health').expect(200, { status: 'ok' });
    });

    it('envía cabeceras de seguridad', async () => {
      const res = await http().get('/health');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('registro', () => {
    it('crea el usuario, normaliza el correo y nunca devuelve la contraseña', async () => {
      const res = await http()
        .post('/users/register')
        .send(
          datos('registro', { email: ` ${correo('Registro').toUpperCase()} ` }),
        )
        .expect(201);
      expect(res.body).toMatchObject({
        email: correo('registro'),
        firstName: 'Ana',
        type: 'user',
        birthday: '1995-04-20',
      });
      expect(res.body).not.toHaveProperty('pass');
    });

    it('rechaza correos repetidos aunque cambien las mayúsculas', async () => {
      await http().post('/users/register').send(datos('repetido')).expect(201);
      const res = await http()
        .post('/users/register')
        .send(datos('repetido', { email: correo('REPETIDO') }))
        .expect(409);
      expect(res.body.message).toMatch(/already registered/);
    });

    it('no permite elegir el rol ni otros campos al registrarse', async () => {
      await http()
        .post('/users/register')
        .send(datos('escalada', { type: 'admin' }))
        .expect(400);
      await http()
        .post('/users/register')
        .send(datos('escalada2', { role: 'admin', id: 1 }))
        .expect(400);
    });

    it.each([
      ['contraseña débil', { pass: '12345678' }],
      ['contraseña demasiado larga', { pass: 'a1'.repeat(40) }],
      ['fecha futura', { birthday: '2999-01-01' }],
      ['nombre con números', { firstName: 'Ana1' }],
      ['correo inválido', { email: 'sin-arroba' }],
    ])('rechaza %s', async (_nombre, extra) => {
      await http()
        .post('/users/register')
        .send(datos('invalido', extra))
        .expect(400);
    });
  });

  describe('ingreso y perfil', () => {
    const email = correo('perfil');

    beforeAll(async () => {
      await http().post('/users/register').send(datos('perfil')).expect(201);
    });

    it('entrega un token con credenciales correctas', async () => {
      const res = await http()
        .post('/auth/login')
        .send({ email, pass: 'Clave12345' })
        .expect(200);
      expect(res.body.access_token).toEqual(expect.any(String));
    });

    it('responde igual ante un usuario inexistente y una contraseña incorrecta', async () => {
      const mala = await http()
        .post('/auth/login')
        .send({ email, pass: 'Incorrecta1' })
        .expect(401);
      const inexistente = await http()
        .post('/auth/login')
        .send({ email: correo('nadie'), pass: 'Clave12345' })
        .expect(401);
      expect(inexistente.body).toEqual(mala.body);
    });

    it('valida el formato del cuerpo de ingreso', async () => {
      await http()
        .post('/auth/login')
        .send({ email: 'x', pass: '' })
        .expect(400);
      await http()
        .post('/auth/login')
        .send({ email, pass: 'Clave12345', extra: 1 })
        .expect(400);
    });

    it('el perfil exige un token válido', async () => {
      await http().post('/auth/profile').expect(401);
      await http()
        .post('/auth/profile')
        .set('Authorization', 'Bearer inventado')
        .expect(401);
      await http()
        .post('/auth/profile')
        .set('Authorization', 'Basic abc')
        .expect(401);
    });

    it('devuelve el perfil actualizado tras modificarlo', async () => {
      const token = await ingresar(email);
      await http()
        .patch('/users')
        .set('Authorization', `Bearer ${token}`)
        .send({ firstName: 'Luz', birthday: '1990-01-02' })
        .expect(200);
      const res = await http()
        .post('/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(201);
      expect(res.body).toMatchObject({
        email,
        firstName: 'Luz',
        birthday: '1990-01-02',
        role: 'user',
      });
      expect(res.body).not.toHaveProperty('pass');
    });

    it('no permite cambiar el rol ni la contraseña desde el perfil', async () => {
      const token = await ingresar(email);
      await http()
        .patch('/users')
        .set('Authorization', `Bearer ${token}`)
        .send({ type: 'admin' })
        .expect(400);
      await http()
        .patch('/users')
        .set('Authorization', `Bearer ${token}`)
        .send({ pass: 'Otra12345' })
        .expect(400);
    });

    it('informa si el nuevo correo ya está en uso', async () => {
      await http().post('/users/register').send(datos('ocupado')).expect(201);
      const token = await ingresar(email);
      await http()
        .patch('/users')
        .set('Authorization', `Bearer ${token}`)
        .send({ email: correo('ocupado') })
        .expect(409);
    });

    it('un token firmado con otro secreto es rechazado', async () => {
      const jwt = await import('jsonwebtoken');
      const falso = jwt.sign(
        { id: 1, role: 'admin' },
        'otro-secreto-distinto-de-32-caracteres-xx',
      );
      await http()
        .post('/auth/profile')
        .set('Authorization', `Bearer ${falso}`)
        .expect(401);
    });
  });

  describe('administración', () => {
    let tokenAdmin: string;
    let tokenUsuario: string;
    let idUsuario: number;
    let idAdmin: number;

    beforeAll(async () => {
      const admin = await usuarios.createAdmin({
        ...datos('admin'),
        pass: 'Clave12345',
      });
      idAdmin = admin.id;
      tokenAdmin = await ingresar(correo('admin'));
      const res = await http()
        .post('/users/register')
        .send(datos('comun', { firstName: 'Zoila' }))
        .expect(201);
      idUsuario = res.body.id;
      tokenUsuario = await ingresar(correo('comun'));
    });

    it('los endpoints de administración ya no están abiertos', async () => {
      await http().get('/users/obtain/all').expect(404);
      await http().post('/users/all').expect(401);
      await http()
        .patch(`/users/admin/role/${idUsuario}`)
        .send({ role: 'admin' })
        .expect(401);
    });

    it('un usuario común no puede listar ni cambiar roles', async () => {
      await http()
        .post('/users/all')
        .set('Authorization', `Bearer ${tokenUsuario}`)
        .send({})
        .expect(403);
      await http()
        .patch(`/users/admin/role/${idUsuario}`)
        .set('Authorization', `Bearer ${tokenUsuario}`)
        .send({ role: 'admin' })
        .expect(403);
    });

    it('el administrador lista usuarios sin contraseñas y puede filtrar', async () => {
      const todos = await http()
        .post('/users/all')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({})
        .expect(201);
      expect(todos.body.length).toBeGreaterThanOrEqual(2);
      expect(JSON.stringify(todos.body)).not.toMatch(/"pass"/);
      const filtrado = await http()
        .post('/users/all')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ searchTerm: correo('comun').toUpperCase() })
        .expect(201);
      expect(filtrado.body.map((u: { email: string }) => u.email)).toEqual([
        correo('comun'),
      ]);
    });

    it('el término de búsqueda no actúa como comodín ni como inyección', async () => {
      const res = await http()
        .post('/users/all')
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ searchTerm: "%' OR '1'='1" })
        .expect(201);
      expect(res.body).toEqual([]);
    });

    it('valida el rol y el identificador', async () => {
      const auth = { Authorization: `Bearer ${tokenAdmin}` };
      await http()
        .patch(`/users/admin/role/${idUsuario}`)
        .set(auth)
        .send({ role: 'root' })
        .expect(400);
      await http()
        .patch('/users/admin/role/abc')
        .set(auth)
        .send({ role: 'admin' })
        .expect(400);
      await http()
        .patch('/users/admin/role/999999')
        .set(auth)
        .send({ role: 'admin' })
        .expect(404);
    });

    it('el administrador asigna roles y el cambio rige de inmediato', async () => {
      const auth = { Authorization: `Bearer ${tokenAdmin}` };
      const res = await http()
        .patch(`/users/admin/role/${idUsuario}`)
        .set(auth)
        .send({ role: 'admin' })
        .expect(200);
      expect(res.body.type).toBe('admin');
      await http()
        .post('/users/all')
        .set('Authorization', `Bearer ${tokenUsuario}`)
        .send({})
        .expect(201);
      await http()
        .patch(`/users/admin/role/${idUsuario}`)
        .set(auth)
        .send({ role: 'user' })
        .expect(200);
      await http()
        .post('/users/all')
        .set('Authorization', `Bearer ${tokenUsuario}`)
        .send({})
        .expect(403);
    });

    it('un administrador no puede quitarse su propio rol', async () => {
      await http()
        .patch(`/users/admin/role/${idAdmin}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ role: 'user' })
        .expect(400);
    });
  });

  describe('límite de intentos', () => {
    it('bloquea el ingreso tras demasiados intentos', async () => {
      process.env.PROBAR_LIMITES = '1';
      try {
        const estados: number[] = [];
        for (let i = 0; i < 12; i++) {
          estados.push(
            (
              await http()
                .post('/auth/login')
                .send({ email: correo('limite'), pass: 'Incorrecta1' })
            ).status,
          );
        }
        expect(estados).toContain(429);
        expect(estados.indexOf(429)).toBeGreaterThanOrEqual(10);
      } finally {
        delete process.env.PROBAR_LIMITES;
      }
    });
  });
});
