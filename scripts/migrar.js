// Migración idempotente para alinear la base con la ERD del segundo parcial.
//
// Conserva la tabla `personal` únicamente para el inicio de sesión y elimina
// lo que no pertenece al diseño: las tablas `persona`, `producto` y `venta`,
// la columna `lote.precio_kilo_compra` y la columna `compra.personalId`.
// También refuerza la relación 1:1 entre Lote y Compra.
//
// Uso: npm run migrar
import { QueryTypes } from "sequelize";
import dotenv from "dotenv";
import db from "../config/db.js";
import { Personal } from "../models/index.js";
import createInitialAdmin from "../models/config_adm.js";
import { asegurarPerfilComprador } from "../helpers/compradores.js";

dotenv.config({ path: ".env" });

// Tablas del diseño que deben existir.
const TABLAS_ERD = ["lote", "especie", "tipo", "comprador", "compra"];
// Tablas ajenas a la ERD que deben desaparecer (la de autenticación se queda).
const TABLAS_OBSOLETAS = ["venta", "producto", "persona"];
const LLAVES_ESPERADAS = [
  ["compra", "id_lte", "lote", "id_lte"],
  ["compra", "codigo_cpr", "comprador", "codigo_cpr"],
  ["especie", "id_lte", "lote", "id_lte"],
  ["especie", "id_tpo", "tipo", "id_tpo"],
];
const INDICES_FECHA = [
  ["compra", "idx_compra_fecha", "fecha"],
  ["lote", "idx_lote_fecha", "fecha"],
];

const q = async (sql, replacements = []) =>
  db.query(sql, { replacements, type: QueryTypes.SELECT });

const ejecutar = async (sql) => db.query(sql);

const existeTabla = async (tabla) => {
  const filas = await q(
    `SELECT 1 FROM information_schema.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
      LIMIT 1`,
    [tabla],
  );
  return filas.length > 0;
};

async function confirmarAdministradores() {
  const [, afectados] = await db.query(
    "UPDATE personal SET confirmar = 1 WHERE rol = 'admin' AND (confirmar = 0 OR confirmar IS NULL)",
    { type: QueryTypes.UPDATE },
  );
  console.log(`✓ administradores confirmados: ${afectados ?? 0}`);
}

async function convertirTrabajadoresACompradores() {
  const [, afectados] = await db.query(
    "UPDATE personal SET rol = 'comprador' WHERE rol = 'trabajador'",
    { type: QueryTypes.UPDATE },
  );
  console.log(`✓ cuentas convertidas a comprador: ${afectados ?? 0}`);
}

// Cada cuenta con rol comprador necesita su perfil en la tabla comprador para
// poder asociar sus compras.
async function asegurarPerfilesCompradores() {
  const compradores = await Personal.findAll({ where: { rol: "comprador" } });
  let creados = 0;

  for (const persona of compradores) {
    const antes = await db.query(
      "SELECT codigo_cpr FROM comprador WHERE correo = ? LIMIT 1",
      {
        replacements: [String(persona.email).trim().toLowerCase()],
        type: QueryTypes.SELECT,
      },
    );
    if (!antes.length) creados++;
    await asegurarPerfilComprador(persona);
  }

  console.log(
    `✓ perfiles de comprador asegurados: ${compradores.length} (${creados} nuevos)`,
  );
}

// Deja tipos básicos para que el alta de mercancía permita elegir el producto
// desde el primer uso. Solo actúa si el catálogo está vacío.
async function asegurarTiposBase() {
  const [{ total }] = await q("SELECT COUNT(*) AS total FROM tipo");
  if (Number(total) > 0) {
    console.log("· tipos ya registrados, se omite el catálogo base");
    return;
  }

  for (const nombre of ["Pescado", "Marisco", "Molusco"]) {
    await db.query("INSERT INTO tipo (nombre) VALUES (?)", {
      replacements: [nombre],
      type: QueryTypes.INSERT,
    });
  }
  console.log("✓ tipos base agregados: Pescado, Marisco, Molusco");
}

async function limpiarIndicesDuplicados() {
  const interfaz = db.getQueryInterface();
  const tabla = "personal";

  let indices;
  try {
    indices = await interfaz.showIndex(tabla);
  } catch {
    console.log(`· ${tabla} no existe, se omite`);
    return;
  }

  const vistos = new Map();
  const sobrantes = [];

  for (const indice of indices) {
    if (indice.name === "PRIMARY") continue;
    const firma = `${indice.unique ? "u" : "n"}:${indice.fields
      .map((f) => f.attribute ?? f.name)
      .join(",")}`;
    if (!vistos.has(firma)) {
      vistos.set(firma, indice.name);
      continue;
    }
    // Conserva el índice con el nombre más corto (normalmente "email").
    const actual = vistos.get(firma);
    if (indice.name.length < actual.length) {
      sobrantes.push(actual);
      vistos.set(firma, indice.name);
    } else {
      sobrantes.push(indice.name);
    }
  }

  for (const nombre of sobrantes) {
    await ejecutar(`ALTER TABLE \`${tabla}\` DROP INDEX \`${nombre}\``);
  }
  console.log(`✓ ${tabla}: ${sobrantes.length} índices duplicados eliminados`);
}

// Elimina la llave foránea de compra.personalId si todavía existe.
async function quitarLlavePersonal() {
  const llaves = await q(
    `SELECT CONSTRAINT_NAME
       FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'compra'
        AND COLUMN_NAME = 'personalId'
        AND REFERENCED_TABLE_NAME IS NOT NULL`,
  );

  for (const llave of llaves) {
    await ejecutar(
      `ALTER TABLE \`compra\` DROP FOREIGN KEY \`${llave.CONSTRAINT_NAME}\``,
    );
    console.log(`✓ llave ${llave.CONSTRAINT_NAME} eliminada`);
  }
}

// Elimina índices que usen una columna concreta (excepto PRIMARY).
async function quitarIndicesDeColumna(tabla, columna) {
  const indices = await db.getQueryInterface().showIndex(tabla);

  for (const indice of indices) {
    if (indice.name === "PRIMARY") continue;
    const campos = indice.fields.map((f) => f.attribute ?? f.name);
    if (!campos.includes(columna)) continue;
    await ejecutar(`ALTER TABLE \`${tabla}\` DROP INDEX \`${indice.name}\``);
    console.log(`✓ índice ${indice.name} eliminado`);
  }
}

async function quitarColumnasExtra() {
  const interfaz = db.getQueryInterface();

  let columnasCompra;
  try {
    columnasCompra = await interfaz.describeTable("compra");
  } catch {
    console.log("· compra no existe, se omite");
    return;
  }

  if (columnasCompra.personalId) {
    await quitarLlavePersonal();
    await quitarIndicesDeColumna("compra", "personalId");
    await interfaz.removeColumn("compra", "personalId");
    console.log("✓ compra.personalId eliminada");
  } else {
    console.log("· compra.personalId ya no existe");
  }

  const columnasLote = await interfaz.describeTable("lote");
  if (columnasLote.precio_kilo_compra) {
    await interfaz.removeColumn("lote", "precio_kilo_compra");
    console.log("✓ lote.precio_kilo_compra eliminada");
  } else {
    console.log("· lote.precio_kilo_compra ya no existe");
  }
}

async function eliminarTablasObsoletas() {
  for (const tabla of TABLAS_OBSOLETAS) {
    if (!(await existeTabla(tabla))) {
      console.log(`· ${tabla} ya no existe`);
      continue;
    }
    await ejecutar(`DROP TABLE \`${tabla}\``);
    console.log(`✓ tabla ${tabla} eliminada`);
  }
}

// Relación 1:1 Lote–Compra: id_lte debe ser único dentro de compra.
async function asegurarCompraUnicaPorLote() {
  const duplicados = await q(
    `SELECT id_lte, COUNT(*) AS total
       FROM compra
      GROUP BY id_lte
     HAVING total > 1`,
  );

  if (duplicados.length) {
    console.log(
      `⚠ hay ${duplicados.length} lotes con más de una compra; no se puede crear el índice único`,
    );
    return;
  }

  const indices = await db.getQueryInterface().showIndex("compra");
  const yaUnico = indices.some(
    (i) =>
      i.unique &&
      i.fields.length === 1 &&
      (i.fields[0].attribute ?? i.fields[0].name) === "id_lte",
  );
  if (yaUnico) {
    console.log("· compra.id_lte ya es único");
    return;
  }

  await ejecutar(
    "ALTER TABLE `compra` ADD UNIQUE INDEX `uq_compra_id_lte` (`id_lte`)",
  );
  console.log("✓ índice único uq_compra_id_lte en compra.id_lte");
}

async function ajustarLlavesForaneas() {
  const llaves = await q(
    `SELECT k.TABLE_NAME, k.CONSTRAINT_NAME, k.COLUMN_NAME,
            k.REFERENCED_TABLE_NAME, k.REFERENCED_COLUMN_NAME, r.DELETE_RULE
       FROM information_schema.KEY_COLUMN_USAGE k
       JOIN information_schema.REFERENTIAL_CONSTRAINTS r
         ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
        AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
        AND r.TABLE_NAME = k.TABLE_NAME
      WHERE k.TABLE_SCHEMA = DATABASE()
        AND k.TABLE_NAME IN ('compra', 'especie')
        AND k.REFERENCED_TABLE_NAME IS NOT NULL`,
  );

  const deseadas = new Map(
    LLAVES_ESPERADAS.map(([tabla, columna, refTabla, refColumna]) => [
      `${tabla}.${columna}`,
      { tabla, columna, refTabla, refColumna },
    ]),
  );

  for (const llave of llaves) {
    const clave = `${llave.TABLE_NAME}.${llave.COLUMN_NAME}`;
    const esperada = deseadas.get(clave);
    if (!esperada) continue;

    const yaCorrecta =
      llave.DELETE_RULE === "RESTRICT" &&
      llave.REFERENCED_TABLE_NAME === esperada.refTabla &&
      llave.REFERENCED_COLUMN_NAME === esperada.refColumna;

    if (yaCorrecta) {
      console.log(`· ${clave} ya está en RESTRICT`);
      continue;
    }

    await ejecutar(
      `ALTER TABLE \`${llave.TABLE_NAME}\` DROP FOREIGN KEY \`${llave.CONSTRAINT_NAME}\``,
    );

    const nombre = `fk_${esperada.tabla}_${esperada.columna}`;
    await ejecutar(
      `ALTER TABLE \`${esperada.tabla}\`
         ADD CONSTRAINT \`${nombre}\`
         FOREIGN KEY (\`${esperada.columna}\`)
         REFERENCES \`${esperada.refTabla}\` (\`${esperada.refColumna}\`)
         ON DELETE RESTRICT ON UPDATE CASCADE`,
    );
    console.log(
      `✓ ${clave} → ${esperada.refTabla} (antes ${llave.DELETE_RULE}, ahora RESTRICT)`,
    );
  }
}

async function agregarIndicesFecha() {
  const interfaz = db.getQueryInterface();

  for (const [tabla, nombre, columna] of INDICES_FECHA) {
    let indices;
    try {
      indices = await interfaz.showIndex(tabla);
    } catch {
      console.log(`· ${tabla} no existe, se omite`);
      continue;
    }

    const yaExiste = indices.some(
      (i) =>
        i.name === nombre ||
        (i.fields.length === 1 &&
          (i.fields[0].attribute ?? i.fields[0].name) === columna),
    );
    if (yaExiste) {
      console.log(`· ${tabla}.${columna} ya tiene índice`);
      continue;
    }

    await ejecutar(
      `ALTER TABLE \`${tabla}\` ADD INDEX \`${nombre}\` (\`${columna}\`)`,
    );
    console.log(`✓ índice ${nombre} en ${tabla}.${columna}`);
  }
}

async function verificarTablasErd() {
  for (const tabla of TABLAS_ERD) {
    if (!(await existeTabla(tabla))) {
      throw new Error(`Falta la tabla ${tabla} del diseño.`);
    }
  }

  const [columnasCompra, columnasLote] = await Promise.all([
    db.getQueryInterface().describeTable("compra"),
    db.getQueryInterface().describeTable("lote"),
  ]);

  if (columnasCompra.personalId || columnasLote.precio_kilo_compra) {
    throw new Error("Todavía quedan columnas ajenas a la ERD.");
  }

  console.log("✓ esquema alineado con la ERD (personal se conserva para login)");
}

async function main() {
  try {
    await db.authenticate();
    // Crea las tablas que falten en una instalación nueva.
    await db.sync();
    await createInitialAdmin();
    await confirmarAdministradores();
    await convertirTrabajadoresACompradores();
    await asegurarPerfilesCompradores();
    await asegurarTiposBase();
    await limpiarIndicesDuplicados();
    await quitarColumnasExtra();
    await eliminarTablasObsoletas();
    await asegurarCompraUnicaPorLote();
    await ajustarLlavesForaneas();
    await agregarIndicesFecha();
    await verificarTablasErd();
    console.log("Migración terminada.");
  } catch (err) {
    console.error("La migración falló:", err.message);
    process.exitCode = 1;
  } finally {
    await db.close();
  }
}

main();
