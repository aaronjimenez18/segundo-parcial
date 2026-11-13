(() => {
  const lote = document.getElementById("select-lote");
  const kilos = document.getElementById("resumen-kilos");
  const precio = document.getElementById("resumen-precio");
  const total = document.getElementById("resumen-total");
  const ayuda = document.getElementById("ayuda-total");
  if (!lote || !kilos || !precio || !total) return;

  const dinero = (n) => `$${Number(n || 0).toFixed(2)}`;

  const recalcular = () => {
    const opcion = lote.selectedOptions[0];
    const elegido = opcion && opcion.value;

    if (!elegido) {
      kilos.textContent = "—";
      precio.textContent = "—";
      total.textContent = "—";
      if (ayuda) {
        ayuda.textContent = "Elige un lote para calcular el total automáticamente.";
      }
      return;
    }

    const kg = Number(opcion.dataset.kilos || 0);
    const precioKilo = Number(opcion.dataset.precio || 0);
    const importe = kg * precioKilo;

    kilos.textContent = `${kg.toFixed(2)} kg`;
    precio.textContent = dinero(precioKilo);
    total.textContent = dinero(importe);
    if (ayuda) {
      ayuda.textContent = `${kg.toFixed(2)} kg × ${dinero(precioKilo)} = ${dinero(importe)}`;
    }
  };

  lote.addEventListener("change", recalcular);
  recalcular();
})();
