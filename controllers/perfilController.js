import bcrypt from "bcryptjs";
import { Personal } from "../models/index.js";
import { mensajeError } from "../helpers/errores.js";

const ver = (req, res) => {
  res.render("perfil/index.ejs", {
    usuario: req.usuario,
    error: null,
  });
};

const actualizar = async (req, res) => {
  const { actual = "", nueva = "", confirmar = "" } = req.body;

  const volverConError = (error) =>
    res.status(400).render("perfil/index.ejs", {
      usuario: req.usuario,
      error,
    });

  try {
    if (!actual || !nueva || !confirmar) {
      return volverConError("Completa los tres campos.");
    }

    if (nueva !== confirmar) {
      return volverConError(
        "La nueva contraseña y su confirmación no coinciden.",
      );
    }

    if (nueva.length < 8 || !/[A-Za-z]/.test(nueva) || !/\d/.test(nueva)) {
      return volverConError(
        "La nueva contraseña debe tener al menos 8 caracteres, una letra y un número.",
      );
    }

    const persona = await Personal.findByPk(req.usuario.id);
    if (!persona) return res.redirect("/login");

    const coincide = await bcrypt.compare(actual, persona.password);
    if (!coincide) {
      return volverConError("La contraseña actual no es correcta.");
    }

    if (await bcrypt.compare(nueva, persona.password)) {
      return volverConError("La nueva contraseña debe ser distinta a la actual.");
    }

    await persona.update({ password: nueva });

    res.clearCookie("jwt");
    res.clearCookie("csrf");
    return res.redirect("/login?ok=1");
  } catch (err) {
    console.error("Error al cambiar la contraseña:", err);
    return volverConError(mensajeError(err));
  }
};

export { ver, actualizar };
