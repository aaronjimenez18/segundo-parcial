import Personal from "../models/Personal.js";
import Lote from "../models/Lote.js";
import Compra from "../models/Compra.js";
import Comprador from "../models/Comprador.js";
import Especie from "../models/Especie.js";
import Tipo from "../models/Tipo.js";

// Lote 1:1 Compra. Un lote solo puede venderse una vez y una compra
// corresponde a un único lote. RESTRICT evita borrar mercancía ya comprada.
Lote.hasOne(Compra, {
  foreignKey: "id_lte",
  as: "compra",
  onDelete: "RESTRICT",
});
Compra.belongsTo(Lote, {
  foreignKey: "id_lte",
  as: "lote",
  onDelete: "RESTRICT",
});

// Comprador 1:N Compra. No se puede borrar un cliente con compras.
Comprador.hasMany(Compra, {
  foreignKey: "codigo_cpr",
  as: "compras",
  onDelete: "RESTRICT",
});
Compra.belongsTo(Comprador, {
  foreignKey: "codigo_cpr",
  as: "comprador",
  onDelete: "RESTRICT",
});

// Lote 1:N Especie.
Lote.hasMany(Especie, {
  foreignKey: "id_lte",
  as: "especies",
  onDelete: "RESTRICT",
});
Especie.belongsTo(Lote, {
  foreignKey: "id_lte",
  as: "lote",
  onDelete: "RESTRICT",
});

// Tipo 1:N Especie.
Tipo.hasMany(Especie, {
  foreignKey: "id_tpo",
  as: "especies",
  onDelete: "RESTRICT",
});
Especie.belongsTo(Tipo, {
  foreignKey: "id_tpo",
  as: "tipo",
  onDelete: "RESTRICT",
});

export { Personal, Lote, Compra, Comprador, Especie, Tipo };
