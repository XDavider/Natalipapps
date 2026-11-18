# Natalipapp 🚀

Un HUB minimalista y ligero para alojar pequeñas aplicaciones web basadas en un único archivo HTML.

## 📁 Estructura

```text
Natalipapp/
├── index.html         # Página principal / HUB con accesos a cada app
└── apps/              # Carpeta donde van tus mini aplicaciones HTML
    ├── notas.html     # App de ejemplo: Bloc de notas rápido
    └── decision.html  # App de ejemplo: Tomador de decisiones
```

## ➕ ¿Cómo añadir una nueva mini app?

1. Crea tu archivo HTML dentro de la carpeta `apps/` (por ejemplo, `apps/mi-app.html`).
2. Abre `index.html` y añade una nueva tarjeta en la sección `<main class="grid">`:
```html
<a href="apps/mi-app.html" class="card">
  <div class="card-icon">⚡</div>
  <h2>Mi Mini App</h2>
  <p>Descripción corta de lo que hace.</p>
  <div class="card-footer">
    Abrir app &rarr;
  </div>
</a>
```
3. Guarda y sube los cambios a GitHub. Vercel se actualizará automáticamente.
