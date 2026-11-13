import test from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { capitalizar } from "../helpers/texto.js";
import { mensajeError } from "../helpers/errores.js";
import { datosPerfilComprador } from "../helpers/compradores.js";
import Personal from "../models/Personal.js";

process.env.SC_JWT ||= "firma-solo-para-pruebas";
const { JWTGenera } = await import("../helpers/tokens.js");

test("capitalizar respeta nombres propios y acentos", () => {
  assert.equal(capitalizar("juan pérez-gómez"), "Juan Pérez-Gómez");
  assert.equal(capitalizar("MARÍA DE LA LUZ"), "María De La Luz");
  assert.equal(capitalizar(""), "");
});

test("mensajeError resume errores de validación de Sequelize", () => {
  const error = {
    name: "SequelizeValidationError",
    errors: [{ message: "El nombre es obligatorio." }, { message: "La edad no es válida." }],
  };
  assert.equal(
    mensajeError(error),
    "El nombre es obligatorio. · La edad no es válida.",
  );
});

test("mensajeError no revela detalles internos", () => {
  const error = new Error("ER_ACCESS_DENIED_ERROR: password incorrect");
  assert.doesNotMatch(mensajeError(error), /password|ACCESS_DENIED/);
  assert.match(mensajeError(error), /error inesperado/i);
});

test("JWTGenera firma el identificador del usuario", () => {
  const token = JWTGenera({ id: 7, mail: "admin@ejemplo.com" });
  const datos = jwt.verify(token, process.env.SC_JWT);
  assert.equal(datos.id, 7);
  assert.equal(datos.nombre, "admin@ejemplo.com");
});

test("la contraseña débil no pasa la validación del modelo", async () => {
  const persona = Personal.build({
    nombre: "Ana",
    apellido: "López",
    email: "ana@ejemplo.com",
    edad: 30,
    password: "abcdefgh",
    rol: "comprador",
  });

  await assert.rejects(persona.validate());
});

test("la contraseña con letra y número sí es válida", async () => {
  const persona = Personal.build({
    nombre: "Ana",
    apellido: "López",
    email: "ana@ejemplo.com",
    edad: 30,
    password: "ClaveSegura2026",
    rol: "comprador",
  });

  await assert.doesNotReject(persona.validate());
});

test("el perfil de comprador se arma con los datos de la cuenta", () => {
  const datos = datosPerfilComprador({
    nombre: "Ana",
    apellido: "López García",
    email: "ANA@Ejemplo.com",
  });

  assert.deepEqual(datos, {
    nombre: "Ana",
    apellido_paterno: "López",
    apellido_materno: "García",
    direccion: "Sin dirección registrada",
    correo: "ana@ejemplo.com",
  });
});

test("el perfil de comprador respeta los límites de la tabla", () => {
  const datos = datosPerfilComprador({
    nombre: "NombreDemasiadoLargo",
    apellido: "ApellidoMuyLargo",
    email: "correo@ejemplo.com",
  });

  assert.equal(datos.nombre.length, 15);
  assert.equal(datos.apellido_paterno.length, 15);
});
