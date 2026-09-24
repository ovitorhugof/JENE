"use strict";

(() => {
  const client = window.JeneSupabase;
  const authorizedRoles = new Set(["admin", "gestor"]);

  class AuthenticationError extends Error {
    constructor(message, code = "authentication_error") {
      super(message);
      this.name = "AuthenticationError";
      this.code = code;
    }
  }

  class AccessDeniedError extends Error {
    constructor(message = "Seu usuário não tem permissão para acessar o sistema.") {
      super(message);
      this.name = "AccessDeniedError";
      this.code = "access_denied";
    }
  }

  async function signIn(email, password) {
    const { data, error } = await client.auth.signInWithPassword({ email, password });
    if (error) {
      const message = error.code === "invalid_credentials"
        ? "E-mail ou senha inválidos."
        : "Não foi possível entrar agora. Verifique sua conexão e tente novamente.";
      throw new AuthenticationError(message, error.code);
    }
    return data;
  }

  async function signOut() {
    const { error } = await client.auth.signOut();
    if (error) throw new AuthenticationError("Não foi possível encerrar a sessão. Tente novamente.", error.code);
  }

  async function getSession() {
    const { data, error } = await client.auth.getSession();
    if (error) throw new AuthenticationError("Não foi possível consultar a sessão.", error.code);
    return data.session;
  }

  async function getCurrentUser() {
    const { data, error } = await client.auth.getUser();
    if (error) {
      if (error.name === "AuthSessionMissingError") return null;
      throw new AuthenticationError("Não foi possível validar a sessão.", error.code);
    }
    return data.user;
  }

  async function getCurrentProfile(user = null) {
    const currentUser = user || await getCurrentUser();
    if (!currentUser) return null;
    const { data, error } = await client
      .from("profiles")
      .select("id, role, active")
      .eq("id", currentUser.id)
      .maybeSingle();
    if (error) throw new AuthenticationError("Não foi possível consultar seu perfil de acesso.", error.code);
    return data;
  }

  async function requireAuthenticatedUser() {
    const user = await getCurrentUser();
    if (!user) throw new AuthenticationError("Sua sessão expirou. Entre novamente.", "session_required");
    return user;
  }

  async function requireAuthorizedUser() {
    const user = await requireAuthenticatedUser();
    const profile = await getCurrentProfile(user);
    const role = String(profile?.role || "").toLowerCase();
    if (!profile || profile.active !== true || !authorizedRoles.has(role)) {
      throw new AccessDeniedError();
    }
    return { user, profile };
  }

  window.JeneAuth = {
    signIn,
    signOut,
    getSession,
    getCurrentUser,
    getCurrentProfile,
    requireAuthenticatedUser,
    requireAuthorizedUser,
    AuthenticationError,
    AccessDeniedError
  };

  const pageMode = document.body.dataset.auth;
  window.JeneAuthReady = (async () => {
    if (pageMode === "protected") {
      try {
        const access = await requireAuthorizedUser();
        document.body.classList.remove("auth-pending");
        return access;
      } catch (error) {
        const denied = error instanceof AccessDeniedError;
        if (denied) {
          try { await signOut(); } catch { /* O redirecionamento ainda deve ocorrer. */ }
        }
        const reason = denied ? "access-denied" : "session-required";
        location.replace("login.html?reason=" + reason);
        return null;
      }
    }

    if (pageMode === "guest") {
      try {
        const user = await getCurrentUser();
        if (user) {
          try {
            await requireAuthorizedUser();
            location.replace("index.html");
            return null;
          } catch (error) {
            if (error instanceof AccessDeniedError) {
              try { await signOut(); } catch { /* Mantém a tela de login disponível. */ }
              history.replaceState(null, "", "login.html?reason=access-denied");
            } else {
              throw error;
            }
          }
        }
      } catch {
        history.replaceState(null, "", "login.html?reason=authorization-error");
      }
      document.body.classList.remove("auth-pending");
    }
    return null;
  })();
})();
