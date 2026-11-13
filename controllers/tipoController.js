import { Tipo, Especie } from "../models/index.js";
import { mensajeError } from "../helpers/errores.js";
import { setFlash } from "../helpers/flash.js";

const inicio = async (req, res) => {
  const tipos = await Tipo.findAll({
    order: [["id_tpo", "DESC"]],
    include: [{ model: Especie, as: "especies" }],
  });
  res.render("tipos/index.ejs", { tipos });
};

const verCrear = async (req, res) => {
  res.render("tipos/formulario.ejs", {
    tipo: null,
    action: "/tipos/registrar",
    method: "POST",
    error: null,
  });
};

const registro = async (req, res) => {
  try {
    const { nombre } = req.body;
    await Tipo.create({ nombre });
    setFlash(res, "ok", "Tipo registrado correctamente.");
    res.redirect("/tipos");
  } catch (err) {
    console.error(err);
    res.render("tipos/formulario.ejs", {
      tipo: { ...req.body },
      action: "/tipos/registrar",
      method: "POST",
      error: mensajeError(err),
    });
  }
};

const editar = async (req, res) => {
  const tipo = await Tipo.findByPk(req.params.id);
  if (!tipo) return res.redirect("/tipos");
  res.render("tipos/formulario.ejs", {
    tipo,
    action: `/tipos/${tipo.id_tpo}?_method=PUT`,
    method: "POST",
    error: null,
  });
};

const actualizar = async (req, res) => {
  try {
    const tipo = await Tipo.findByPk(req.params.id);
    if (!tipo) return res.redirect("/tipos");
    await tipo.update({ nombre: req.body.nombre });
    setFlash(res, "ok", "Tipo actualizado correctamente.");
    res.redirect("/tipos");
  } catch (err) {
    console.error(err);
    res.render("tipos/formulario.ejs", {
      tipo: { ...req.body, id_tpo: req.params.id },
      action: `/tipos/${req.params.id}?_method=PUT`,
      method: "POST",
      error: mensajeError(err),
    });
  }
};

const eliminar = async (req, res) => {
  try {
    await Tipo.destroy({ where: { id_tpo: req.params.id } });
    setFlash(res, "ok", "Tipo eliminado correctamente.");
  } catch (err) {
    console.error(err);
    setFlash(res, "error", mensajeError(err));
  }
  res.redirect("/tipos");
};

export { inicio, verCrear, registro, editar, actualizar, eliminar };
