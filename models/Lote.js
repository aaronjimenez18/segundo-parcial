import { DataTypes } from "sequelize";
import db from "../config/db.js";

const Lote = db.define(
  "Lote",
  {
    id_lte: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    kilos: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        kilosPositivos(value) {
          if (!(Number(value) > 0)) {
            throw new Error("Los kilos deben ser mayores a 0.");
          }
        },
      },
    },
    numero_cajas: {
      type: DataTypes.SMALLINT,
      allowNull: false,
      validate: {
        cajasValidas(value) {
          if (!Number.isInteger(Number(value)) || Number(value) < 1) {
            throw new Error("El número de cajas debe ser un entero mayor a 0.");
          }
        },
      },
    },
    // Precio al que se le vende al cliente.
    precio_kilo_salida: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: {
        precioValido(value) {
          if (!(Number(value) >= 0)) {
            throw new Error("El precio de venta no puede ser negativo.");
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
            throw new Error("La fecha de la entrada no es válida.");
          }
        },
      },
    },
  },
  {
    tableName: "lote",
    timestamps: false,
  },
);

export default Lote;
