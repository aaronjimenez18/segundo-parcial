import db from "../config/db.js";
import { Lote, Compra, Especie, Tipo } from "../models/index.js";
import { mensajeError } from "../helpers/errores.js";
import { setFlash } from "../helpers/flash.js";

// Error con un mensaje pensado para mostrarse tal cual al usuario.
class ErrorLote extends Error {}

const datosFormulario = async () => {
  const tipos = await Tipo.findAll({ order: [["nombre", "ASC"]] });
  return { tipos };
};

const aLista = (valor) => {
  if (Array.isArray(valor)) return valor;
  if (valor === undefined || valor === null) return [];
  return [valor];
};

// Reconstruye las filas enviadas por el formulario, sin validar, para poder
// volver a mostrarlas si algo falla.
const filasEspecies = (body = {}) => {
  const ids = aLista(body.id_epe);
  const nombres = aLista(body.nombre_especie);
  const tipos = aLista(body.id_tpo);
  const total = Math.max(ids.length, nombres.length, tipos.length);
  const filas = [];

  for (let i = 0; i < total; i += 1) {
    const id_epe = ids[i] == null ? "" : String(ids[i]);
    const nombre = nombres[i] == null ? "" : String(nombres[i]);
    const id_tpo = tipos[i] == null ? "" : String(tipos[i]);
    if (!id_epe && !nombre.trim() && !id_tpo) continue;
    filas.push({ id_epe, nombre, id_tpo });
  }

  return filas;
};

// Un lote puede contener varias especies (por ejemplo, camarón y robalo).
// Cada fila necesita su tipo y su nombre; las filas totalmente vacías se ignoran.
const datosEspecies = (req, tipos) => {
  const filas = filasEspecies(req.body);
  const vistos = new Set();
  const especies = [];

  filas.forEach((fila, indice) => {
    const nombre = fila.nombre.trim();

    if (!nombre && !fila.id_tpo) return;

    if (!nombre) {
      throw new ErrorLote(
        `Escribe el nombre de la especie en la fila ${indice + 1}.`,
      );
    }
    if (!fila.id_tpo) {
      throw new ErrorLote(`Elige el tipo de producto para "${nombre}".`);
    }

    const clave = nombre.toLocaleLowerCase("es-MX");
    if (vistos.has(clave)) {
      throw new ErrorLote(`La especie "${nombre}" está repetida en el lote.`);
    }
    vistos.add(clave);

    especies.push({
      id_epe: fila.id_epe || null,
      nombre,
      id_tpo: fila.id_tpo,
    });
  });

  if (tipos.length && !especies.length) {
    throw new ErrorLote("Agrega al menos una especie al lote.");
  }

  return especies;
};

const crearEspecie = (datos, id_lte, transaccion) =>
  Especie.create(
    {
      nombre: datos.nombre,
      id_lte,
      id_tpo: datos.id_tpo,
      imagen: null,
    },
    { transaction: transaccion },
  );

const errorFormulario = (err) =>
  err instanceof ErrorLote ? err.message : mensajeError(err);

const inicio = async (req, res) => {
  const lotes = await Lote.findAll({
    order: [["id_lte", "DESC"]],
    include: [
      { model: Compra, as: "compra" },
      {
        model: Especie,
        as: "especies",
        include: [{ model: Tipo, as: "tipo" }],
      },
    ],
  });
  res.render("lotes/index.ejs", { lotes });
};

const verCrear = async (req, res) => {
  const datos = await datosFormulario();
  res.render("lotes/formulario.ejs", {
    lote: null,
    especiesLote: [],
    ...datos,
    action: "/lotes/registrar",
    method: "POST",
    error: null,
  });
};

const registro = async (req, res) => {
  try {
    const { kilos, numero_cajas, precio_kilo_salida, fecha } = req.body;
    const { tipos } = await datosFormulario();
    const especies = datosEspecies(req, tipos);

    await db.transaction(async (transaccion) => {
      const lote = await Lote.create(
        {
          kilos,
          numero_cajas,
          precio_kilo_salida,
          fecha: fecha || new Date(),
        },
        { transaction: transaccion },
      );

      for (const especie of especies) {
        await crearEspecie(especie, lote.id_lte, transaccion);
      }
    });

    setFlash(res, "ok", "Entrada de mercancía registrada correctamente.");
    res.redirect("/lotes");
  } catch (err) {
    console.error(err);
    const datos = await datosFormulario();
    res.render("lotes/formulario.ejs", {
      lote: { ...req.body },
      especiesLote: filasEspecies(req.body),
      ...datos,
      action: "/lotes/registrar",
      method: "POST",
      error: errorFormulario(err),
    });
  }
};

const editar = async (req, res) => {
  const lote = await Lote.findByPk(req.params.id, {
    include: [{ model: Especie, as: "especies" }],
  });
  if (!lote) return res.redirect("/lotes");

  const especiesLote = (lote.especies || []).map((especie) => ({
    id_epe: especie.id_epe,
    nombre: especie.nombre,
    id_tpo: especie.id_tpo,
  }));

  const datos = await datosFormulario();
  res.render("lotes/formulario.ejs", {
    lote,
    especiesLote,
    ...datos,
    action: `/lotes/${lote.id_lte}?_method=PUT`,
    method: "POST",
    error: null,
  });
};

const actualizar = async (req, res) => {
  try {
    const lote = await Lote.findByPk(req.params.id, {
      include: [{ model: Especie, as: "especies" }],
    });
    if (!lote) return res.redirect("/lotes");

    const { kilos, numero_cajas, precio_kilo_salida, fecha } = req.body;
    const { tipos } = await datosFormulario();
    const especies = datosEspecies(req, tipos);
    const existentes = lote.especies || [];

    await db.transaction(async (transaccion) => {
      await lote.update(
        {
          kilos,
          numero_cajas,
          precio_kilo_salida,
          fecha: fecha || lote.fecha,
        },
        { transaction: transaccion },
      );

      const conservar = new Set();

      for (const datos of especies) {
        const existente = datos.id_epe
          ? existentes.find(
              (especie) => String(especie.id_epe) === String(datos.id_epe),
            )
          : null;

        if (existente) {
          await existente.update(
            { nombre: datos.nombre, id_tpo: datos.id_tpo },
            { transaction: transaccion },
          );
          conservar.add(String(existente.id_epe));
        } else {
          const creada = await crearEspecie(
            datos,
            lote.id_lte,
            transaccion,
          );
          conservar.add(String(creada.id_epe));
        }
      }

      // Las especies que se quitaron del formulario también se eliminan del lote.
      const sobrantes = existentes
        .filter((especie) => !conservar.has(String(especie.id_epe)))
        .map((especie) => especie.id_epe);

      if (sobrantes.length) {
        await Especie.destroy({
          where: { id_epe: sobrantes },
          transaction: transaccion,
        });
      }
    });

    setFlash(res, "ok", "Entrada de mercancía actualizada correctamente.");
    res.redirect("/lotes");
  } catch (err) {
    console.error(err);
    const datos = await datosFormulario();
    res.render("lotes/formulario.ejs", {
      lote: { ...req.body, id_lte: req.params.id },
      especiesLote: filasEspecies(req.body),
      ...datos,
      action: `/lotes/${req.params.id}?_method=PUT`,
      method: "POST",
      error: errorFormulario(err),
    });
  }
};

const eliminar = async (req, res) => {
  try {
    await Lote.destroy({ where: { id_lte: req.params.id } });
    setFlash(res, "ok", "Entrada de mercancía eliminada correctamente.");
  } catch (err) {
    console.error(err);
    setFlash(
      res,
      "error",
      "No se puede eliminar la mercancía porque tiene compras o especies asociadas.",
    );
  }
  res.redirect("/lotes");
};

export { inicio, verCrear, registro, editar, actualizar, eliminar };
