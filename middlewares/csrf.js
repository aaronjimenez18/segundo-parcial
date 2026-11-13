import crypto from "node:crypto";

const COOKIE = "csrf";
const METODOS_SEGUROS = new Set(["GET", "HEAD", "OPTIONS"]);
const DURACION = 2 * 60 * 60 * 1000;

const comparar = (a, b) => {
  const bufferA = Buffer.from(String(a));
  const bufferB = Buffer.from(String(b));
  if (bufferA.length !== bufferB.length) return false;
  return crypto.timingSafeEqual(bufferA, bufferB);
};

// Double-submit cookie: el token viaja en una cookie httpOnly y en un campo
// oculto del formulario. Sirve para rechazar peticiones de otro origen.
export const csrf = (req, res, next) => {
  let token = req.cookies?.[COOKIE];

  if (!token || typeof token !== "string" || token.length < 32) {
    token = crypto.randomBytes(32).toString("hex");
    res.cookie(COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: DURACION,
    });
  }

  res.locals.csrfToken = token;

  if (METODOS_SEGUROS.has(req.method)) return next();

  const enviado = req.body?._csrf || req.get("x-csrf-token");
  if (!enviado || !comparar(enviado, token)) {
    return res.status(403).render("errores/403.ejs", {
      seccion: "",
      titulo: "Solicitud no válida",
      mensaje:
        "La página expiró o la solicitud no es válida. Vuelve a cargar la página e inténtalo de nuevo.",
    });
  }

  return next();
};
