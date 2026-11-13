import { Op } from "sequelize";
import db from "../config/db.js";
import { Compra, Lote, Comprador, Especie, Tipo } from "../models/index.js";
import { mensajeError } from "../helpers/errores.js";
import { setFlash } from "../helpers/flash.js";
import { asegurarPerfilComprador } from "../helpers/compradores.js";

// Error con un mensaje pensado para mostrarse tal cual al usuario.
class ErrorCompra extends Error {}

const esAdmin = (req) => req.usuario?.rol === "admin";

const inicio = async (req, res) => {
  const admin = esAdmin(req);

  // Un comprador solo ve las compras asociadas a su perfil. Un administrador
  // ve el historial completo.
  let filtro = {};
  if (!admin) {
    const perfil = await asegurarPerfilComprador(req.usuario);
    filtro = { codigo_cpr: perfil ? perfil.codigo_cpr : 0 };
  }

  const compras = await Compra.findAll({
    where: filtro,
    order: [["id_cmp", "DESC"]],
    include: [
      {
        model: Lote,
        as: "lote",
        include: [
          {
            model: Especie,
            as: "especies",
            include: [{ model: Tipo, as: "tipo" }],
          },
        ],
      },
      { model: Comprador, as: "comprador" },
    ],
  });
  res.render("compras/index.ejs", { compras });
};

// Solo se muestran los lotes que todavía no tienen una compra registrada.
// Al editar, se conserva el lote de la compra actual.
const formulario = async (extra = {}) => {
  const { compraActual = null, ...resto } = extra;

  const registros = await Compra.findAll({
    attributes: ["id_cmp", "id_lte"],
    raw: true,
  });
  const lotesComprados = new Set(
    registros
      .filter(
        (registro) =>
          !compraActual ||
          Number(registro.id_cmp) !== Number(compraActual.id_cmp),
      )
      .map((registro) => Number(registro.id_lte)),
  );

  const lotes = (
    await Lote.findAll({
      order: [["id_lte", "DESC"]],
      include: [
        {
          model: Especie,
          as: "especies",
          include: [{ model: Tipo, as: "tipo" }],
        },
      ],
    })
  ).filter((lote) => !lotesComprados.has(Number(lote.id_lte)));

  // El administrador puede registrar una compra a nombre de cualquier
  // comprador. El comprador que inició sesión la registra a su propio nombre.
  const compradores = await Comprador.findAll({
    order: [
      ["apellido_paterno", "ASC"],
      ["nombre", "ASC"],
    ],
  });

  return { lotes, compradores, ...resto };
};

// La compra siempre es por el lote completo: los kilos y el precio por kilo
// salen del registro de mercancía, nunca del formulario.
const datosDesdeLote = async (
  id_lte,
  { transaccion = null, compraId = null } = {},
) => {
  if (!id_lte) {
    throw new ErrorCompra("Elige el lote que se va a comprar.");
  }

  const lote = await Lote.findByPk(id_lte, {
    transaction: transaccion,
    ...(transaccion ? { lock: transaccion.LOCK.UPDATE } : {}),
  });
  if (!lote) {
    throw new ErrorCompra("El lote seleccionado no existe.");
  }

  const filtro = { id_lte: lote.id_lte };
  if (compraId) {
    filtro.id_cmp = { [Op.ne]: compraId };
  }
  const yaVendida = await Compra.findOne({
    where: filtro,
    transaction: transaccion,
  });
  if (yaVendida) {
    throw new ErrorCompra("Ese lote ya fue comprado. Elige otro.");
  }

  const kilos = Number(lote.kilos);
  const precioKilo = Number(lote.precio_kilo_salida);

  return {
    id_lte: lote.id_lte,
    precio_kilo_final: precioKilo,
    precio_total: Number((kilos * precioKilo).toFixed(2)),
  };
};

// Determina a nombre de quién queda la compra.
const resolverComprador = async (req) => {
  if (esAdmin(req)) {
    const codigo = req.body.codigo_cpr;
    if (!codigo) {
      throw new ErrorCompra("Elige el comprador.");
    }

    const perfil = await Comprador.findByPk(codigo);
    if (!perfil) {
      throw new ErrorCompra("El comprador seleccionado no existe.");
    }
    return perfil;
  }

  const perfil = await asegurarPerfilComprador(req.usuario);
  if (!perfil) {
    throw new ErrorCompra("Tu cuenta no tiene un perfil de comprador válido.");
  }
  return perfil;
};

const errorFormulario = (err) =>
  err instanceof ErrorCompra ? err.message : mensajeError(err);

const verCrear = async (req, res) => {
  const datos = await formulario();
  res.render("compras/formulario.ejs", {
    compra: null,
    ...datos,
    action: "/compras/registrar",
    method: "POST",
    error: null,
  });
};

const registro = async (req, res) => {
  try {
    const { id_lte, fecha } = req.body;
    const perfil = await resolverComprador(req);

    await db.transaction(async (transaccion) => {
      const datos = await datosDesdeLote(id_lte, { transaccion });
      await Compra.create(
        {
          ...datos,
          codigo_cpr: perfil.codigo_cpr,
          fecha: fecha || new Date(),
        },
        { transaction: transaccion },
      );
    });

    setFlash(
      res,
      "ok",
      esAdmin(req)
        ? "Compra registrada correctamente."
        : "Compra realizada correctamente.",
    );
    res.redirect("/compras");
  } catch (err) {
    console.error(err);
    const datos = await formulario();
    res.render("compras/formulario.ejs", {
      compra: { ...req.body },
      ...datos,
      action: "/compras/registrar",
      method: "POST",
      error: errorFormulario(err),
    });
  }
};

const editar = async (req, res) => {
  const compra = await Compra.findByPk(req.params.id);
  if (!compra) return res.redirect("/compras");
  const datos = await formulario({ compraActual: compra });
  res.render("compras/formulario.ejs", {
    compra,
    ...datos,
    action: `/compras/${compra.id_cmp}?_method=PUT`,
    method: "POST",
    error: null,
  });
};

const actualizar = async (req, res) => {
  try {
    const compra = await Compra.findByPk(req.params.id);
    if (!compra) return res.redirect("/compras");

    const { id_lte, fecha } = req.body;
    const perfil = await resolverComprador(req);

    await db.transaction(async (transaccion) => {
      const datos = await datosDesdeLote(id_lte, {
        transaccion,
        compraId: compra.id_cmp,
      });
      await compra.update(
        {
          ...datos,
          codigo_cpr: perfil.codigo_cpr,
          fecha: fecha || compra.fecha,
        },
        { transaction: transaccion },
      );
    });

    setFlash(res, "ok", "Compra actualizada correctamente.");
    res.redirect("/compras");
  } catch (err) {
    console.error(err);
    const datos = await formulario({
      compraActual: { id_cmp: req.params.id },
    });
    res.render("compras/formulario.ejs", {
      compra: { ...req.body, id_cmp: req.params.id },
      ...datos,
      action: `/compras/${req.params.id}?_method=PUT`,
      method: "POST",
      error: errorFormulario(err),
    });
  }
};

const eliminar = async (req, res) => {
  try {
    const compra = await Compra.findByPk(req.params.id);
    if (!compra) {
      setFlash(res, "error", "La compra ya no existe.");
      return res.redirect("/compras");
    }

    await compra.destroy();
    setFlash(res, "ok", "Compra eliminada correctamente.");
  } catch (err) {
    console.error(err);
    setFlash(res, "error", mensajeError(err));
  }
  res.redirect("/compras");
};

export { inicio, verCrear, registro, editar, actualizar, eliminar };
