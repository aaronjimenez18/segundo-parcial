// Agrega y quita filas de especies dentro del formulario de un lote.
// Va en un archivo aparte para respetar la política CSP (sin scripts inline).
(() => {
  const contenedor = document.getElementById("especies-lote");
  const plantilla = document.getElementById("especie-plantilla");
  const agregar = document.querySelector("[data-agregar-especie]");

  if (!contenedor || !plantilla || !agregar) return;

  const filas = () => contenedor.querySelectorAll(".especie-row");

  const limpiarFila = (fila) => {
    fila.querySelectorAll('input[name="id_epe[]"]').forEach((campo) => {
      campo.value = "";
    });
    fila.querySelectorAll("select").forEach((campo) => {
      campo.value = "";
    });
    fila.querySelectorAll('input[name="nombre_especie[]"]').forEach((campo) => {
      campo.value = "";
    });
  };

  agregar.addEventListener("click", () => {
    const fragmento = plantilla.content.cloneNode(true);
    contenedor.appendChild(fragmento);
    const lista = filas();
    const ultima = lista[lista.length - 1];
    if (ultima) {
      const primerCampo = ultima.querySelector("select, input");
      if (primerCampo) primerCampo.focus();
    }
  });

  contenedor.addEventListener("click", (evento) => {
    const boton = evento.target.closest("[data-quitar-especie]");
    if (!boton) return;

    const fila = boton.closest(".especie-row");
    if (!fila) return;

    if (filas().length === 1) {
      // El formulario siempre conserva una fila para poder capturar la especie.
      limpiarFila(fila);
      const primerCampo = fila.querySelector("select, input");
      if (primerCampo) primerCampo.focus();
      return;
    }

    fila.remove();
  });
})();
