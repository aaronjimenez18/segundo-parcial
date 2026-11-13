import jwt from "jsonwebtoken";
import { Personal } from "../models/index.js";

// Valida el JWT de la cookie y carga al usuario en req/res.locals.
// Sin sesión válida o con la cuenta pendiente, manda al login.
const verificarSesion = async (req, res, next) => {
  const token = req.cookies?.jwt;
  if (!token) return res.redirect("/login");

  try {
    const payload = jwt.verify(token, process.env.SC_JWT);
    const usuario = await Personal.findByPk(payload.id, {
      attributes: { exclude: ["password"] },
    });

    if (!usuario || !usuario.confirmar) {
      res.clearCookie("jwt");
      return res.redirect("/login");
    }

    req.usuario = usuario;
    res.locals.usuario = usuario;
    return next();
  } catch {
    res.clearCookie("jwt");
    return res.redirect("/login");
  }
};

const denegar = (res, mensaje) =>
  res.status(403).render("errores/403.ejs", {
    seccion: "",
    titulo: "Acceso denegado",
    mensaje,
  });

// Autorización por rol: solo administradores.
const soloAdmin = (req, res, next) => {
  if (req.usuario?.rol === "admin") return next();
  return denegar(res, "Esta sección está reservada para administradores.");
};

// Autorización por lista de roles permitidos.
const permitirRoles =
  (...roles) =>
  (req, res, next) => {
    if (req.usuario && roles.includes(req.usuario.rol)) return next();
    return denegar(res, "Tu cuenta no tiene permisos para entrar a esta sección.");
  };

// Ruta de inicio según el rol.
const inicioPorRol = (rol) =>
  rol === "admin" ? "/reportes/diario" : "/compras";

export { verificarSesion, soloAdmin, permitirRoles, inicioPorRol };
