// Prueba de humo contra un servidor ya iniciado.
// Uso: npm run test:smoke
// Variables opcionales:
//   BASE_URL, SMOKE_EMAIL, SMOKE_PASSWORD
//   SMOKE_BUYER_EMAIL, SMOKE_BUYER_PASSWORD (para probar el rol comprador)
import dotenv from "dotenv";

dotenv.config({ path: ".env" });

const BASE = (process.env.BASE_URL || "http://localhost:2800").replace(/\/$/, "");
const CORREO = process.env.SMOKE_EMAIL || process.env.ADMIN_EMAIL;
const CLAVE = process.env.SMOKE_PASSWORD || process.env.ADMIN_PASSWORD;

let fallos = 0;
const resultados = [];

const comprobar = (nombre, condicion, detalle = "") => {
  resultados.push({ nombre, ok: Boolean(condicion), detalle });
  if (!condicion) fallos++;
  console.log(`${condicion ? "✓" : "✗"} ${nombre}${detalle ? ` — ${detalle}` : ""}`);
};

class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  add(setCookies = []) {
    for (const linea of setCookies) {
      const par = linea.split(";")[0];
      const corte = par.indexOf("=");
      if (corte < 0) continue;
      const nombre = par.slice(0, corte).trim();
      const valor = par.slice(corte + 1).trim();
      if (!valor) this.cookies.delete(nombre);
      else this.cookies.set(nombre, valor);
    }
  }

  header() {
    return [...this.cookies.entries()]
      .map(([nombre, valor]) => `${nombre}=${valor}`)
      .join("; ");
  }
}

const jar = new CookieJar();

const pedir = async (ruta, { method = "GET", form, headers = {} } = {}) => {
  const opciones = {
    method,
    redirect: "manual",
    headers: { ...headers, cookie: jar.header() },
  };

  if (form) {
    opciones.body = new URLSearchParams(form);
    opciones.headers["content-type"] = "application/x-www-form-urlencoded";
  }

  const respuesta = await fetch(`${BASE}${ruta}`, opciones);
  jar.add(respuesta.headers.getSetCookie?.() ?? []);
  const texto = await respuesta.text();
  return {
    status: respuesta.status,
    location: respuesta.headers.get("location"),
    texto,
  };
};

const tokenDe = (html) => {
  const coincidencia = html.match(/name="_csrf" value="([^"]+)"/);
  if (!coincidencia) throw new Error("No se encontró el token CSRF en el HTML");
  return coincidencia[1];
};

const iniciarSesion = async (correo, clave) => {
  const pagina = await pedir("/login");
  const token = tokenDe(pagina.texto);
  return pedir("/login/registrar", {
    method: "POST",
    form: { usuario: correo, password: clave, _csrf: token },
  });
};

const main = async () => {
  if (!CORREO || !CLAVE) {
    throw new Error("Faltan SMOKE_EMAIL/SMOKE_PASSWORD o ADMIN_EMAIL/ADMIN_PASSWORD");
  }

  const loginPagina = await pedir("/login");
  comprobar("GET /login responde 200", loginPagina.status === 200, `código ${loginPagina.status}`);

  const token = tokenDe(loginPagina.texto);
  comprobar("El formulario incluye token CSRF", token.length >= 32);

  const claveMala = await pedir("/login/registrar", {
    method: "POST",
    form: { usuario: CORREO, password: "clave-invalida", _csrf: token },
  });
  comprobar("Login con contraseña incorrecta devuelve 401", claveMala.status === 401);
  comprobar(
    "El error de login no filtra detalles internos",
    !/sequelize|stack|sql/i.test(claveMala.texto),
  );

  const sesion = await iniciarSesion(CORREO, CLAVE);
  comprobar(
    "Login correcto redirige al reporte",
    sesion.status === 302 && sesion.location?.endsWith("/reportes/diario"),
    `código ${sesion.status}`,
  );

  const rutas = [
    "/reportes/diario",
    "/compras",
    "/compradores",
    "/lotes",
    "/perfil",
    "/especies",
    "/tipos",
    "/compras/crear",
    "/lotes/crear",
    "/especies/crear",
    "/tipos/crear",
  ];

  for (const ruta of rutas) {
    const respuesta = await pedir(ruta);
    comprobar(`GET ${ruta} responde 200`, respuesta.status === 200, `código ${respuesta.status}`);
  }

  const inexistente = await pedir("/ruta-que-no-existe");
  comprobar("Una ruta inexistente responde 404", inexistente.status === 404);
  comprobar(
    "La página 404 no filtra detalles internos",
    !/sequelize|stack|sql/i.test(inexistente.texto),
  );

  const sinCsrf = await pedir("/logout", { method: "POST" });
  comprobar("POST /logout sin CSRF se rechaza con 403", sinCsrf.status === 403);

  const csrfMalo = await pedir("/logout", {
    method: "POST",
    form: { _csrf: "token-invalido" },
  });
  comprobar("POST /logout con CSRF inválido se rechaza con 403", csrfMalo.status === 403);

  const tokenActual = tokenDe((await pedir("/perfil")).texto);
  const salida = await pedir("/logout", {
    method: "POST",
    form: { _csrf: tokenActual },
  });
  comprobar(
    "POST /logout con CSRF válido cierra la sesión",
    salida.status === 302 && salida.location?.endsWith("/login"),
    `código ${salida.status}`,
  );

  const protegida = await pedir("/lotes");
  comprobar(
    "Sin sesión, /lotes redirige al login",
    protegida.status === 302 && protegida.location?.endsWith("/login"),
  );

  const compradorCorreo = process.env.SMOKE_BUYER_EMAIL;
  const compradorClave = process.env.SMOKE_BUYER_PASSWORD;
  if (compradorCorreo && compradorClave) {
    const sesionComprador = await iniciarSesion(compradorCorreo, compradorClave);
    comprobar(
      "El comprador puede iniciar sesión",
      sesionComprador.status === 302 &&
        sesionComprador.location?.endsWith("/compras"),
      `código ${sesionComprador.status}`,
    );
    const compras = await pedir("/compras");
    comprobar("El comprador puede ver sus compras", compras.status === 200);
    const comprasCrear = await pedir("/compras/crear");
    comprobar(
      "El comprador puede comprar un lote",
      comprasCrear.status === 200,
    );
    const reportes = await pedir("/reportes/diario");
    comprobar("El comprador no puede ver reportes (403)", reportes.status === 403);
    const mercancia = await pedir("/lotes");
    comprobar("El comprador no puede ver mercancía (403)", mercancia.status === 403);
    const compradores = await pedir("/compradores");
    comprobar(
      "El comprador no puede ver perfiles ajenos (403)",
      compradores.status === 403,
    );
  } else {
    console.log("· Prueba de rol comprador omitida (SMOKE_BUYER_* no definidos)");
  }

  console.log(
    `\n${resultados.length - fallos}/${resultados.length} comprobaciones correctas.`,
  );
  if (fallos) process.exitCode = 1;
};

main().catch((err) => {
  console.error("\nLa prueba de humo falló:", err.message);
  process.exitCode = 1;
});
