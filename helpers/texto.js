// Da formato de nombre propio a textos escritos en minúsculas.
export const capitalizar = (texto = "") =>
  String(texto)
    .toLocaleLowerCase("es-MX")
    .replace(/(^|[\s-])(\p{L})/gu, (_, separador, letra) => {
      return separador + letra.toLocaleUpperCase("es-MX");
    });
