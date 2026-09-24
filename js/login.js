"use strict";

window.JeneAuthReady.then(() => {
  const form = document.getElementById("login-form");
  const feedback = document.getElementById("login-feedback");
  const submit = form.querySelector('button[type="submit"]');
  const reasons = {
    "access-denied": "Seu perfil está inativo ou não tem permissão para acessar o sistema.",
    "session-required": "Entre com sua conta para continuar.",
    "authorization-error": "Não foi possível confirmar seu acesso. Entre novamente."
  };
  const reason = new URLSearchParams(location.search).get("reason");
  if (reasons[reason]) {
    feedback.textContent = reasons[reason];
    feedback.hidden = false;
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();
    feedback.hidden = true;
    const email = form.elements.email.value.trim();
    const password = form.elements.password.value;
    if (!email || !password) {
      feedback.textContent = "Preencha o e-mail e a senha.";
      feedback.hidden = false;
      return;
    }

    submit.disabled = true;
    submit.textContent = "Entrando…";
    try {
      await JeneAuth.signIn(email, password);
      await JeneAuth.requireAuthorizedUser();
      location.replace("index.html");
    } catch (error) {
      if (error instanceof JeneAuth.AccessDeniedError) {
        try { await JeneAuth.signOut(); } catch { /* A mensagem principal é suficiente. */ }
      }
      feedback.textContent = error instanceof JeneAuth.AccessDeniedError
        ? "Seu perfil está inativo ou não tem permissão para acessar o sistema."
        : error.message || "Não foi possível entrar. Tente novamente.";
      feedback.hidden = false;
      submit.disabled = false;
      submit.textContent = "Entrar";
    }
  });
});
