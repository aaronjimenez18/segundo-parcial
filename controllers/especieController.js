import { Especie, Lote, Tipo } from "../models/index.js";
import { mensajeError } from "../helpers/errores.js";
import { setFlash } from "../helpers/flash.js";

const inicio = async (req, res) => {
  const especies = await Especie.findAll({
    order: [["id_epe", "DESC"]],
    include: [
      { model: Lote, as: "lote" },
      { model: Tipo, as: "tipo" },
    ],
  });
  res.render("especies/index.ejs", { especies });
};

const formulario = async (extra = {}) => {
  const lotes = await Lote.findAll({ order: [["id_lte", "DESC"]] });
  const tipos = await Tipo.findAll({ order: [["nombre", "ASC"]] });
  return { lotes, tipos, ...extra };
};

const verCrear = async (req, res) => {
  const datos = await formulario();
  res.render("especies/formulario.ejs", {
    especie: null,
    ...datos,
    action: "/especies/registrar",
    method: "POST",
    error: null,
  });
};

const registro = async (req, res) => {
  try {
    const { nombre, id_lte, id_tpo, imagen } = req.body;
    await Especie.create({
      nombre,
      id_lte,
      id_tpo,
      imagen: imagen || null,
    });
    setFlash(res, "ok", "Especie registrada correctamente.");
    res.redirect("/especies");
  } catch (err) {
    console.error(err);
    const datos = await formulario();
    res.render("especies/formulario.ejs", {
      especie: { ...req.body },
      ...datos,
      action: "/especies/registrar",
      method: "POST",
      error: mensajeError(err),
    });
  }
};

const editar = async (req, res) => {
  const especie = await Especie.findByPk(req.params.id);
  if (!especie) return res.redirect("/especies");
  const datos = await formulario();
  res.render("especies/formulario.ejs", {
    especie,
    ...datos,
    action: `/especies/${especie.id_epe}?_method=PUT`,
    method: "POST",
    error: null,
  });
};

const actualizar = async (req, res) => {
  try {
    const especie = await Especie.findByPk(req.params.id);
    if (!especie) return res.redirect("/especies");
    const { nombre, id_lte, id_tpo, imagen } = req.body;
    await especie.update({
      nombre,
      id_lte,
      id_tpo,
      imagen: imagen || null,
    });
    setFlash(res, "ok", "Especie actualizada correctamente.");
    res.redirect("/especies");
  } catch (err) {
    console.error(err);
    const datos = await formulario();
    res.render("especies/formulario.ejs", {
      especie: { ...req.body, id_epe: req.params.id },
      ...datos,
      action: `/especies/${req.params.id}?_method=PUT`,
      method: "POST",
      error: mensajeError(err),
    });
  }
};

const eliminar = async (req, res) => {
  try {
    await Especie.destroy({ where: { id_epe: req.params.id } });
    setFlash(res, "ok", "Especie eliminada correctamente.");
  } catch (err) {
    console.error(err);
    setFlash(res, "error", mensajeError(err));
  }
  res.redirect("/especies");
};

export { inicio, verCrear, registro, editar, actualizar, eliminar };
