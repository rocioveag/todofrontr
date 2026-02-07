import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, setAuth } from "../api";
import logo from "../assets/Logo.jpeg";

export default function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await api.post("/login", {
        email,
        password,
      });

      const { token } = response.data;
      setAuth(token);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err.response?.data?.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="card">
        <div className="brand">
          <img src={logo} alt="Logo" className="logo-img" />
          <h2>App Moragsa</h2>
          <p className="text-muted">
            Bienvenido, inicia sesión para continuar
          </p>
        </div>

        {error && <p className="error">{error}</p>}

        <form onSubmit={onSubmit}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            placeholder="correo@dominio.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label htmlFor="password">Contraseña</label>
          <div className="pass">
            <input
              id="password"
              type={show ? "text" : "password"}
              placeholder="Ingresa tu contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              className="pass-show"
              onClick={() => setShow(!show)}
              aria-label="Mostrar u ocultar contraseña"
            >
              {show ? "🙈" : "👁️"}
            </button>
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading || !email || !password}
          >
            {loading ? "Cargando..." : "Iniciar sesión"}
          </button>
        </form>

        <p className="text-center">
          ¿No tienes cuenta? <Link to="/register">Regístrate</Link>
        </p>
      </div>
    </div>
  );
}
