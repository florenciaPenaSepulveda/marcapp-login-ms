process.env.NODE_ENV = 'test';
process.env.JWT_SECRET ??= 'secreto-de-pruebas-con-mas-de-32-caracteres';
process.env.DB_NAME = process.env.DB_NAME_TEST ?? 'usersDB_test';

import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from './../src/app.module';
import { configurarApp } from './../src/app.setup';
import { UsersService } from './../src/users/users.service';
import { Role } from './../src/enum/user-type.enum';

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

  describe('cambio de contraseña', () => {
    const email = correo('clave');

    beforeAll(async () => {
      await http().post('/users/register').send(datos('clave')).expect(201);
    });

    it('exige autenticación y valida el cuerpo', async () => {
      await http().patch('/users/password').send({}).expect(401);
      const token = await ingresar(email);
      const auth = { Authorization: `Bearer ${token}` };
      await http().patch('/users/password').set(auth).send({}).expect(400);
      await http()
        .patch('/users/password')
        .set(auth)
        .send({ currentPassword: 'Clave12345', newPassword: 'corta' })
        .expect(400);
      await http()
        .patch('/users/password')
        .set(auth)
        .send({
          currentPassword: 'Clave12345',
          newPassword: 'Nueva12345',
          extra: 1,
        })
        .expect(400);
    });

    it('rechaza una contraseña actual incorrecta o una nueva igual', async () => {
      const auth = { Authorization: `Bearer ${await ingresar(email)}` };
      await http()
        .patch('/users/password')
        .set(auth)
        .send({ currentPassword: 'Incorrecta1', newPassword: 'Nueva12345' })
        .expect(400);
      await http()
        .patch('/users/password')
        .set(auth)
        .send({ currentPassword: 'Clave12345', newPassword: 'Clave12345' })
        .expect(400);
    });

    it('cambia la contraseña, invalida los tokens anteriores y entrega uno nuevo', async () => {
      const tokenViejo = await ingresar(email);
      const auth = { Authorization: `Bearer ${tokenViejo}` };
      await http().get('/auth/session').set(auth).expect(200);
      const res = await http()
        .patch('/users/password')
        .set(auth)
        .send({ currentPassword: 'Clave12345', newPassword: 'Nueva12345' })
        .expect(200);
      expect(res.body.message).toBe('Password updated');
      expect(res.body.access_token).toEqual(expect.any(String));

      await http().get('/auth/session').set(auth).expect(401);
      await http().post('/auth/profile').set(auth).expect(401);
      await http()
        .get('/auth/session')
        .set({ Authorization: `Bearer ${res.body.access_token}` })
        .expect(200);

      await http()
        .post('/auth/login')
        .send({ email, pass: 'Clave12345' })
        .expect(401);
      await http()
        .post('/auth/login')
        .send({ email, pass: 'Nueva12345' })
        .expect(200);
    });
  });

  describe('sesión vigente', () => {
    it('exige un token válido', async () => {
      await http().get('/auth/session').expect(401);
      await http()
        .get('/auth/session')
        .set('Authorization', 'Bearer inventado')
        .expect(401);
    });

    it('entrega el rol actual de la base de datos, no el del token', async () => {
      await http()
        .post('/users/register')
        .send(datos('rolvigente'))
        .expect(201);
      const token = await ingresar(correo('rolvigente'));
      const auth = { Authorization: `Bearer ${token}` };
      const antes = await http().get('/auth/session').set(auth).expect(200);
      expect(antes.body.role).toBe('user');
      const usuario = await usuarios.getUser(correo('rolvigente'));
      await usuarios.addPrivileges(usuario.id, Role.ADMIN);
      const despues = await http().get('/auth/session').set(auth).expect(200);
      expect(despues.body).toEqual({ id: usuario.id, role: 'admin' });
    });

    it('no se limita por tasa, porque lo consulta otro servicio con cada solicitud', async () => {
      const token = await ingresar(correo('rolvigente'));
      process.env.PROBAR_LIMITES = '1';
      try {
        for (let i = 0; i < 45; i++) {
          await http()
            .get('/auth/session')
            .set({ Authorization: `Bearer ${token}` })
            .expect(200);
        }
      } finally {
        delete process.env.PROBAR_LIMITES;
      }
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
      await http().get('/users').expect(401);
      await http().get('/users/stats').expect(401);
      await http().get(`/users/${idUsuario}`).expect(401);
      await http()
        .patch(`/users/admin/role/${idUsuario}`)
        .send({ role: 'admin' })
        .expect(401);
    });

    it('un usuario común no puede listar ni cambiar roles', async () => {
      const auth = { Authorization: `Bearer ${tokenUsuario}` };
      await http().get('/users').set(auth).expect(403);
      await http().get('/users/stats').set(auth).expect(403);
      await http().get(`/users/${idUsuario}`).set(auth).expect(403);
      await http()
        .patch(`/users/admin/role/${idUsuario}`)
        .set(auth)
        .send({ role: 'admin' })
        .expect(403);
    });

    it('el administrador lista usuarios paginados, sin contraseñas, y puede filtrar', async () => {
      const auth = { Authorization: `Bearer ${tokenAdmin}` };
      const todos = await http().get('/users').set(auth).expect(200);
      expect(todos.body.items.length).toBeGreaterThanOrEqual(2);
      expect(todos.body.total).toBeGreaterThanOrEqual(todos.body.items.length);
      expect(todos.body).toMatchObject({ limit: 20, offset: 0 });
      expect(JSON.stringify(todos.body)).not.toMatch(/"pass"/);

      const pagina = await http()
        .get('/users?limit=1&offset=1')
        .set(auth)
        .expect(200);
      expect(pagina.body.items).toHaveLength(1);
      expect(pagina.body.total).toBe(todos.body.total);

      const filtrado = await http()
        .get('/users')
        .query({ search: correo('comun').toUpperCase() })
        .set(auth)
        .expect(200);
      expect(
        filtrado.body.items.map((u: { email: string }) => u.email),
      ).toEqual([correo('comun')]);

      const admins = await http()
        .get('/users?role=admin&limit=100')
        .set(auth)
        .expect(200);
      expect(
        admins.body.items.every((u: { type: string }) => u.type === 'admin'),
      ).toBe(true);
    });

    it('rechaza parámetros de listado inválidos', async () => {
      const auth = { Authorization: `Bearer ${tokenAdmin}` };
      await http().get('/users?limit=0').set(auth).expect(400);
      await http().get('/users?limit=1000').set(auth).expect(400);
      await http().get('/users?role=root').set(auth).expect(400);
      await http().get('/users?offset=-1').set(auth).expect(400);
      await http().get('/users?otro=1').set(auth).expect(400);
    });

    it('el administrador consulta un usuario por identificador', async () => {
      const auth = { Authorization: `Bearer ${tokenAdmin}` };
      const res = await http().get(`/users/${idUsuario}`).set(auth).expect(200);
      expect(res.body).toMatchObject({ id: idUsuario, email: correo('comun') });
      expect(res.body).not.toHaveProperty('pass');
      await http().get('/users/999999').set(auth).expect(404);
      await http().get('/users/abc').set(auth).expect(400);
    });

    it('entrega las estadísticas de usuarios', async () => {
      const res = await http()
        .get('/users/stats')
        .set({ Authorization: `Bearer ${tokenAdmin}` })
        .expect(200);
      expect(res.body.total).toBeGreaterThanOrEqual(2);
      expect(res.body.admins).toBeGreaterThanOrEqual(1);
      expect(res.body.workers).toBe(res.body.total - res.body.admins);
      expect(res.body.newThisMonth).toBeGreaterThanOrEqual(2);
    });

    it('el término de búsqueda no actúa como comodín ni como inyección', async () => {
      const res = await http()
        .get('/users')
        .query({ search: "%' OR '1'='1" })
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .expect(200);
      expect(res.body.items).toEqual([]);
      expect(res.body.total).toBe(0);
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
        .get('/users')
        .set('Authorization', `Bearer ${tokenUsuario}`)
        .expect(200);
      await http()
        .patch(`/users/admin/role/${idUsuario}`)
        .set(auth)
        .send({ role: 'user' })
        .expect(200);
      await http()
        .get('/users')
        .set('Authorization', `Bearer ${tokenUsuario}`)
        .expect(403);
    });

    it('POST /users/all sigue disponible como alias de compatibilidad', async () => {
      const auth = { Authorization: `Bearer ${tokenAdmin}` };
      await http().post('/users/all').send({}).expect(401);
      await http()
        .post('/users/all')
        .set({ Authorization: `Bearer ${tokenUsuario}` })
        .send({})
        .expect(403);
      const res = await http()
        .post('/users/all')
        .set(auth)
        .send({ searchTerm: correo('comun').toUpperCase() })
        .expect(201);
      expect(res.body.map((u: { email: string }) => u.email)).toEqual([
        correo('comun'),
      ]);
      expect(JSON.stringify(res.body)).not.toMatch(/"pass"/);
      await http().post('/users/all').set(auth).send({ otro: 1 }).expect(400);
    });

    it('un administrador no puede quitarse su propio rol', async () => {
      await http()
        .patch(`/users/admin/role/${idAdmin}`)
        .set('Authorization', `Bearer ${tokenAdmin}`)
        .send({ role: 'user' })
        .expect(400);
    });
  });

  describe('eliminación de usuarios', () => {
    let tokenAdmin: string;
    let idAdmin: number;

    beforeAll(async () => {
      const admin = await usuarios.createAdmin({
        ...datos('borrador'),
        pass: 'Clave12345',
      });
      idAdmin = admin.id;
      tokenAdmin = await ingresar(correo('borrador'));
    });

    it('exige rol de administrador', async () => {
      const res = await http()
        .post('/users/register')
        .send(datos('victima1'))
        .expect(201);
      await http().delete(`/users/${res.body.id}`).expect(401);
      const tokenComun = await ingresar(correo('victima1'));
      await http()
        .delete(`/users/${res.body.id}`)
        .set({ Authorization: `Bearer ${tokenComun}` })
        .expect(403);
    });

    it('valida el identificador y la existencia', async () => {
      const auth = { Authorization: `Bearer ${tokenAdmin}` };
      await http().delete('/users/abc').set(auth).expect(400);
      await http().delete('/users/999999').set(auth).expect(404);
    });

    it('no permite eliminar la propia cuenta', async () => {
      await http()
        .delete(`/users/${idAdmin}`)
        .set({ Authorization: `Bearer ${tokenAdmin}` })
        .expect(400);
    });

    it('elimina al usuario: ya no puede ingresar y su token deja de valer', async () => {
      const res = await http()
        .post('/users/register')
        .send(datos('victima2'))
        .expect(201);
      const tokenVictima = await ingresar(correo('victima2'));
      await http()
        .get('/auth/session')
        .set({ Authorization: `Bearer ${tokenVictima}` })
        .expect(200);
      await http()
        .delete(`/users/${res.body.id}`)
        .set({ Authorization: `Bearer ${tokenAdmin}` })
        .expect(200, { success: true });
      await http()
        .get('/auth/session')
        .set({ Authorization: `Bearer ${tokenVictima}` })
        .expect(401);
      await http()
        .post('/auth/login')
        .send({ email: correo('victima2'), pass: 'Clave12345' })
        .expect(401);
      await http()
        .get(`/users/${res.body.id}`)
        .set({ Authorization: `Bearer ${tokenAdmin}` })
        .expect(404);
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
