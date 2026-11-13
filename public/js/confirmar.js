(() => {
  const modal = document.getElementById("confirm-modal");
  if (!modal) return;

  const titulo = modal.querySelector("#confirm-title");
  const texto = modal.querySelector("#confirm-text");
  const aceptar = modal.querySelector("[data-confirm-accept]");
  const tarjeta = modal.querySelector(".confirm-card");
  const codigoWrap = modal.querySelector("#confirm-code-wrap");
  const codigoInput = modal.querySelector("#confirm-code");
  let formulario = null;
  let focoAnterior = null;

  const pideCodigo = (form) => form.dataset.confirmAdmin === "1";

  const abrir = (form) => {
    formulario = form;
    titulo.textContent = form.dataset.confirmTitle || "Eliminar registro";
    texto.textContent =
      form.dataset.confirm || "Esta acción no se puede deshacer.";
    focoAnterior = document.activeElement;

    if (pideCodigo(form)) {
      codigoWrap.hidden = false;
      codigoInput.value = "";
      codigoInput.removeAttribute("aria-invalid");
    } else {
      codigoWrap.hidden = true;
      codigoInput.value = "";
    }

    modal.hidden = false;
    document.body.classList.add("modal-open");

    if (pideCodigo(form)) codigoInput.focus();
    else aceptar.focus();
  };

  const cerrar = () => {
    modal.hidden = true;
    document.body.classList.remove("modal-open");
    codigoWrap.hidden = true;
    codigoInput.value = "";
    codigoInput.removeAttribute("aria-invalid");
    formulario = null;
    if (focoAnterior && typeof focoAnterior.focus === "function") {
      focoAnterior.focus();
    }
  };

  document.addEventListener("submit", (evento) => {
    const form = evento.target.closest("form[data-confirm]");
    if (!form) return;

    if (form.dataset.confirmado === "1") {
      delete form.dataset.confirmado;
      return;
    }

    evento.preventDefault();
    abrir(form);
  });

  modal.querySelectorAll("[data-confirm-cancel]").forEach((el) => {
    el.addEventListener("click", cerrar);
  });

  const confirmar = () => {
    if (!formulario) return;

    if (pideCodigo(formulario)) {
      const codigo = codigoInput.value;
      if (!codigo) {
        codigoInput.setAttribute("aria-invalid", "true");
        codigoInput.focus();
        return;
      }
      const destino = formulario.querySelector("[data-confirm-code-input]");
      if (destino) destino.value = codigo;
    }

    formulario.dataset.confirmado = "1";
    formulario.requestSubmit();
    setTimeout(() => {
      if (formulario) delete formulario.dataset.confirmado;
    }, 0);
  };

  aceptar.addEventListener("click", confirmar);

  codigoInput.addEventListener("keydown", (evento) => {
    if (evento.key === "Enter") {
      evento.preventDefault();
      confirmar();
    }
  });

  document.addEventListener("keydown", (evento) => {
    if (modal.hidden) return;

    if (evento.key === "Escape") {
      evento.preventDefault();
      cerrar();
      return;
    }

    if (evento.key === "Tab") {
      const enfocables = [
        ...tarjeta.querySelectorAll(
          "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])",
        ),
      ].filter((el) => el.offsetParent !== null);
      if (!enfocables.length) return;
      const primero = enfocables[0];
      const ultimo = enfocables[enfocables.length - 1];

      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    }
  });
})();
