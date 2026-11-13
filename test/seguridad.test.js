import test from "node:test";
import assert from "node:assert/strict";
import { csrf } from "../middlewares/csrf.js";
import {
  soloAdmin,
  permitirRoles,
  inicioPorRol,
} from "../middlewares/auth.js";

const resMock = () => ({
  locals: {},
  statusCode: 200,
  status(codigo) {
    this.statusCode = codigo;
    return this;
  },
  cookie() {},
  clearCookie() {},
  render(vista, datos) {
    this.vista = vista;
    this.datos = datos;
    return this;
  },
});

const reqMock = (extra = {}) => ({
  method: "GET",
  cookies: {},
  body: {},
  get() {
    return undefined;
  },
  ...extra,
});

test("csrf genera un token en peticiones seguras", () => {
  const req = reqMock();
  const res = resMock();
  let siguiente = false;

  csrf(req, res, () => {
    siguiente = true;
  });

  assert.equal(siguiente, true);
  assert.match(res.locals.csrfToken, /^[a-f0-9]{64}$/);
});

test("csrf rechaza un POST sin token", () => {
  const req = reqMock({ method: "POST" });
  const res = resMock();
  let siguiente = false;

  csrf(req, res, () => {
    siguiente = true;
  });

  assert.equal(siguiente, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.vista, "errores/403.ejs");
});

test("csrf acepta un POST con el token de la cookie", () => {
  const token = "a".repeat(64);
  const req = reqMock({
    method: "POST",
    cookies: { csrf: token },
    body: { _csrf: token },
  });
  const res = resMock();
  let siguiente = false;

  csrf(req, res, () => {
    siguiente = true;
  });

  assert.equal(siguiente, true);
});

test("csrf acepta el token enviado por cabecera", () => {
  const token = "b".repeat(64);
  const req = reqMock({
    method: "POST",
    cookies: { csrf: token },
    get: (nombre) => (nombre.toLowerCase() === "x-csrf-token" ? token : undefined),
  });
  const res = resMock();
  let siguiente = false;

  csrf(req, res, () => {
    siguiente = true;
  });

  assert.equal(siguiente, true);
});

test("soloAdmin bloquea a un comprador", () => {
  const req = { usuario: { rol: "comprador" } };
  const res = resMock();
  let siguiente = false;

  soloAdmin(req, res, () => {
    siguiente = true;
  });

  assert.equal(siguiente, false);
  assert.equal(res.statusCode, 403);
  assert.equal(res.vista, "errores/403.ejs");
});

test("soloAdmin permite a un administrador", () => {
  const req = { usuario: { rol: "admin" } };
  const res = resMock();
  let siguiente = false;

  soloAdmin(req, res, () => {
    siguiente = true;
  });

  assert.equal(siguiente, true);
});

test("permitirRoles acepta solo los roles indicados", () => {
  const permitir = permitirRoles("admin", "comprador");

  const resComprador = resMock();
  let paso = false;
  permitir({ usuario: { rol: "comprador" } }, resComprador, () => {
    paso = true;
  });
  assert.equal(paso, true);

  const resOtro = resMock();
  paso = false;
  permitir({ usuario: { rol: "invitado" } }, resOtro, () => {
    paso = true;
  });
  assert.equal(paso, false);
  assert.equal(resOtro.statusCode, 403);
});

test("inicioPorRol manda al comprador a sus compras y al admin al reporte", () => {
  assert.equal(inicioPorRol("admin"), "/reportes/diario");
  assert.equal(inicioPorRol("comprador"), "/compras");
  assert.equal(inicioPorRol(undefined), "/compras");
});
