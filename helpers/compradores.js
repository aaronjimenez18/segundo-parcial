import { Comprador } from "../models/index.js";

// El perfil de compra (tabla comprador) se crea a partir de la cuenta que
// inicia sesión. Así cada usuario con rol comprador queda ligado a sus
// compras por medio de su correo.
const recortar = (valor, maximo, respaldo = "") => {
  const texto = String(valor ?? "").trim();
  return (texto || respaldo).slice(0, maximo);
};

const separarApellido = (apellido) => {
  const partes = String(apellido ?? "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!partes.length) return { paterno: "—", materno: "—" };
  return {
    paterno: partes[0],
    materno: partes.slice(1).join(" ") || "—",
  };
};

export const datosPerfilComprador = (usuario, direccion = null) => {
  const { paterno, materno } = separarApellido(usuario?.apellido);

  return {
    nombre: recortar(usuario?.nombre, 15, "Comprador"),
    apellido_paterno: recortar(paterno, 15, "—"),
    apellido_materno: recortar(materno, 15, "—"),
    direccion: recortar(
      direccion,
      200,
      "Sin dirección registrada",
    ),
    correo: recortar(usuario?.email, 80).toLowerCase(),
  };
};

// Devuelve el perfil de comprador de la cuenta, creándolo si todavía no existe.
export async function asegurarPerfilComprador(usuario, direccion = null) {
  if (!usuario?.email) return null;

  const correo = String(usuario.email).trim().toLowerCase();
  const existente = await Comprador.findOne({ where: { correo } });
  if (existente) return existente;

  try {
    return await Comprador.create(datosPerfilComprador(usuario, direccion));
  } catch (err) {
    // Si dos peticiones intentan crearlo al mismo tiempo, se reutiliza el que
    // ya quedó guardado.
    if (err?.name === "SequelizeUniqueConstraintError") {
      return Comprador.findOne({ where: { correo } });
    }
    throw err;
  }
}
