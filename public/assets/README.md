# Assets del evento

Coloca aquí los archivos del evento:

- **`eneisoft-logo.png`** — Logo de ENEISOFT (idealmente transparente, PNG, ~200px de alto)
- **`ponente.jpg`** — Foto del ponente Miguel Solis (~200x200px, cuadrada)

Luego actualiza `public/index.html`:

1. Reemplaza `<span class="header__wordmark">eneisoft</span>` por:
   ```html
   <img src="/assets/eneisoft-logo.png" alt="ENEISOFT" class="header__logo">
   ```

2. Reemplaza `<div class="speaker__photo-placeholder" ...>MS</div>` por:
   ```html
   <img src="/assets/ponente.jpg" alt="Miguel Solis" class="speaker__photo">
   ```
