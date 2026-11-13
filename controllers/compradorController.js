import { Comprador, Compra } from "../models/index.js";

const inicio = async (req, res) => {
  const compradores = await Comprador.findAll({
    order: [["codigo_cpr", "DESC"]],
    include: [{ model: Compra, as: "compras" }],
  });
  res.render("compradores/index.ejs", { compradores });
};

export { inicio };
