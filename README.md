# Marcapp · Login MS

[![CI](https://github.com/florenciaPenaSepulveda/marcapp-login-ms/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/florenciaPenaSepulveda/marcapp-login-ms/actions/workflows/ci.yml)

Microservicio de usuarios y autenticación de **Marcapp**, una aplicación de control de asistencia (marcaje de entrada y salida con ubicación) para empresas. Emite los tokens JWT que también validan los demás servicios.

## Repositorios del proyecto

| Repositorio | Descripción |
|---|---|
| **marcapp-login-ms** (este) | Usuarios, registro, ingreso y roles |
| [marcapp-marcaje-ms](https://github.com/florenciaPenaSepulveda/marcapp-marcaje-ms) | Marcajes de entrada y salida y estadísticas de horas |
| [marcapp-front](https://github.com/florenciaPenaSepulveda/marcapp-front) | Aplicación móvil (Expo / React Native) |

## Tecnologías

NestJS 11, TypeScript, TypeORM con MySQL 8, JWT (HS256), bcrypt, class-validator, Jest y supertest.

## Puesta en marcha

Requisitos: Node.js 24 (ver `.nvmrc`) y MySQL 8.

```bash
cp .env.example .env
npm ci
npm run migration:run
npm run seed:admin
npm run start:dev
```

Completa en `.env` al menos `DB_PASSWORD`, `JWT_SECRET` (mínimo 32 caracteres, el mismo valor en `marcaje-ms`) y, para crear el primer administrador, `ADMIN_EMAIL` y `ADMIN_PASSWORD`. El servicio no arranca si la configuración es inválida. Para generar un secreto:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

## Variables de entorno

| Variable | Descripción | Por defecto |
|---|---|---|
| `NODE_ENV` | `development`, `test` o `production` | `development` |
| `APP_PORT` | Puerto HTTP | `3001` |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` | Conexión a MySQL | `127.0.0.1`, `3306`, `root`, vacío, `usersDB` |
| `JWT_SECRET` | Secreto de firma, obligatorio | — |
| `JWT_EXPIRES_IN` | Vigencia del token | `2h` |
| `CORS_ORIGINS` | Orígenes permitidos separados por coma | ninguno en producción |
| `RATE_LIMIT` | Solicitudes por minuto y por IP | `30` |
| `TRUST_PROXY` | `true` si hay un proxy inverso delante | `false` |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Datos para `npm run seed:admin` | — |

## Endpoints

| Método y ruta | Acceso | Descripción |
|---|---|---|
| `GET /` · `GET /health` | Público | Estado del servicio |
| `POST /users/register` | Público | Crea una cuenta con rol `user` |
| `POST /auth/login` | Público | Entrega `access_token` |
| `POST /auth/profile` | Token | Perfil actualizado del usuario autenticado |
| `PATCH /users` | Token | Modifica nombre, apellido, correo o fecha de nacimiento propios |
| `POST /users/all` | Administrador | Lista usuarios, con `searchTerm` opcional |
| `PATCH /users/admin/role/:id` | Administrador | Cambia el rol de un usuario |

El primer administrador se crea con `npm run seed:admin`; no existe ninguna ruta pública para asignar el rol.

## Seguridad

- Sin secretos en el código: toda la configuración sale del entorno y se valida al iniciar.
- Las contraseñas se guardan con bcrypt (costo 12), nunca se devuelven ni se escriben en los registros, y tienen entre 8 y 72 caracteres con al menos una letra y un número.
- El ingreso responde igual ante un usuario inexistente y una contraseña incorrecta, y compara contra un hash ficticio para no revelar qué correos existen.
- Los cuerpos se validan con lista blanca: un campo no declarado (por ejemplo `type: "admin"` al registrarse) se rechaza con 400.
- Las rutas de administración exigen token y consultan el rol vigente en la base de datos, de modo que un cambio de rol rige de inmediato.
- Límite de solicitudes por IP y límite más estricto en ingreso y registro; cabeceras de seguridad con helmet; CORS restringido.
- Un administrador no puede quitarse a sí mismo el rol, para evitar quedarse sin administradores.
- Los tokens se firman con HS256, se verifican con el mismo algoritmo y vencen a las 2 horas.

## Base de datos y migraciones

El esquema se versiona con migraciones de TypeORM (`src/database/migrations`). En desarrollo se sincroniza automáticamente; en producción se ejecutan al iniciar.

```bash
npm run migration:generate -- src/database/migrations/NombreDelCambio
npm run migration:run
npm run migration:check
```

El CI comprueba que las migraciones reproducen exactamente las entidades.

## Pruebas

```bash
npm test
npm run test:cov
npm run test:e2e
```

Las pruebas de integración usan una base MySQL aparte (`DB_NAME_TEST`, por defecto `usersDB_test`) y cubren registro, ingreso, perfil, roles, inyección en la búsqueda y límite de intentos.

## Autoría

Proyecto desarrollado en equipo durante la carrera. Esta copia forma parte del portafolio de [Florencia Peña Sepúlveda](https://github.com/florenciaPenaSepulveda), que la revisó, corrigió y documentó.
