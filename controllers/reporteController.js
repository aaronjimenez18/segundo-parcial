import { Op } from "sequelize";
import {
  Compra,
  Lote,
  Comprador,
  Especie,
  Tipo,
} from "../models/index.js";

const hoyLocal = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

const rangoDia = (fechaParam) => {
  const fecha =
    typeof fechaParam === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fechaParam)
      ? fechaParam
      : hoyLocal();
  const [anio, mes, dia] = fecha.split("-").map(Number);
  return {
    fecha,
    inicio: new Date(anio, mes - 1, dia, 0, 0, 0, 0),
    fin: new Date(anio, mes - 1, dia, 23, 59, 59, 999),
  };
};

// Reporte diario de compras: detalle y resumen por comprador
const diario = async (req, res) => {
  const { fecha, inicio, fin } = rangoDia(req.query.fecha);

  const compras = await Compra.findAll({
    where: { fecha: { [Op.between]: [inicio, fin] } },
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
    order: [
      ["fecha", "ASC"],
      ["id_cmp", "ASC"],
    ],
  });

  const mapa = new Map();
  for (const compra of compras) {
    const clave = compra.comprador ? compra.comprador.codigo_cpr : 0;
    const fila = mapa.get(clave) || {
      codigo: clave,
      nombre: compra.comprador
        ? `${compra.comprador.nombre} ${compra.comprador.apellido_paterno} ${compra.comprador.apellido_materno}`
        : "Sin comprador",
      compras: 0,
      kilos: 0,
      total: 0,
    };
    fila.compras += 1;
    fila.kilos += Number(compra.lote?.kilos || 0);
    fila.total += Number(compra.precio_total || 0);
    mapa.set(clave, fila);
  }

  const resumen = [...mapa.values()].sort((a, b) => b.total - a.total);

  res.render("reportes/diario.ejs", { fecha, compras, resumen });
};

export { diario };
