import { DataTypes } from "sequelize";
import db from "../config/db.js";

const Compra = db.define(
  "Compra",
  {
    id_cmp: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    // FK hacia Lote. Es única para cumplir la relación 1:1: un lote solo se
    // puede comprar una vez.
    id_lte: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
      validate: {
        loteValido(value) {
          if (!Number.isInteger(Number(value)) || Number(value) < 1) {
            throw new Error("Elige una mercancía válida.");
          }
        },
      },
    },
    codigo_cpr: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      validate: {
        compradorValido(value) {
          if (!Number.isInteger(Number(value)) || Number(value) < 1) {
            throw new Error("Elige un comprador válido.");
          }
        },
      },
    },
    // Ambos precios se calculan desde el lote de mercancía; nunca los envía
    // el formulario de compra.
    precio_kilo_final: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        precioKiloValido(value) {
          if (!(Number(value) >= 0)) {
            throw new Error("El precio por kilo no puede ser negativo.");
          }
        },
      },
    },
    precio_total: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      validate: {
        precioTotalValido(value) {
          if (!(Number(value) >= 0)) {
            throw new Error("El total a pagar no puede ser negativo.");
          }
        },
      },
    },
    fecha: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      validate: {
        fechaValida(value) {
          if (Number.isNaN(new Date(value).getTime())) {
            throw new Error("La fecha de la compra no es válida.");
          }
        },
      },
    },
  },
  {
    tableName: "compra",
    timestamps: false,
  },
);

export default Compra;
