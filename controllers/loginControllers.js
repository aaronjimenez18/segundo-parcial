import { JWTGenera } from "../helpers/tokens.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import dotenv from "dotenv";
dotenv.config({ path: ".env" });
import { Personal } from "../models/index.js";
import { inicioPorRol } from "../middlewares/auth.js";

const cookieSegura = {
  httpOnly: true,
  sameSite: "lax",
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: 24 * 60 * 60 * 1000,
};

const login = async (req, res) => {
  // Si ya hay una sesión válida, no mostrar el formulario otra vez.
  const token = req.cookies?.jwt;
  if (token) {
    try {
      const payload = jwt.verify(token, process.env.SC_JWT);
      const persona = await Personal.findByPk(payload.id, {
        attributes: ["rol"],
      });
      if (persona) return res.redirect(inicioPorRol(persona.rol));
      throw new Error("Usuario no encontrado");
    } catch {
      res.clearCookie("jwt");
    }
  }

  res.render("login/login.ejs", {
    action: "/login/registrar",
    method: "POST",
    mensaje:
      req.query.ok === "1"
        ? "Contraseña actualizada. Inicia sesión con tu nueva contraseña."
        : null,
    error: null,
  });
};

// Validar credenciales
const autenticar = async (req, res) => {
  try {
    const { usuario, password } = req.body;
    const correo = typeof usuario === "string" ? usuario.trim() : "";

    if (!correo || typeof password !== "string" || !password) {
      return res.status(401).render("login/login.ejs", {
        action: "/login/registrar",
        method: "POST",
        mensaje: null,
        error: "Escribe tu correo y contraseña",
      });
    }

    const persona = await Personal.findOne({ where: { email: correo } });

    const coincide = persona
      ? await bcrypt.compare(password, persona.password)
      : false;

    if (!coincide) {
      return res.status(401).render("login/login.ejs", {
        action: "/login/registrar",
        method: "POST",
        mensaje: null,
        error: "Correo o contraseña incorrectos",
      });
    }

    if (!persona.confirmar) {
      return res.status(403).render("login/login.ejs", {
        action: "/login/registrar",
        method: "POST",
        mensaje: null,
        error: "Tu cuenta no está activa. Pide a un administrador que la active.",
      });
    }

    const token = JWTGenera({ id: persona.id, mail: persona.email });
    res.cookie("jwt", token, cookieSegura);
    res.redirect(inicioPorRol(persona.rol));
  } catch (err) {
    console.error("Error al iniciar sesión:", err);
    res.status(500).render("login/login.ejs", {
      action: "/login/registrar",
      method: "POST",
      mensaje: null,
      error: "Ocurrió un error al iniciar sesión",
    });
  }
};

const logout = (req, res) => {
  res.clearCookie("jwt");
  res.clearCookie("csrf");
  res.redirect("/login");
};

export { login, autenticar, logout };
