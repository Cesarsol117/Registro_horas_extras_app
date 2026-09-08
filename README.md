# Horas Extras

App web para registrar horas extras, calcular el valor mensual segun salario
+ recargos legales colombianos, y exportar a la plantilla oficial de Bussie.

Mismo stack que [Mis Finanzas](https://github.com/Cesarsol117/finanzas_personales_app):
React sin build (CDN + Babel in-browser), Bootstrap 5, Chart.js, Supabase.
Deploy a GitHub Pages.

## Setup rapido

### 1. Crear proyecto en Supabase

- https://supabase.com -> New project
- Nombre: `horas-extras`, region: South America (Sao Paulo)
- Espera ~1 min a que aprovisione

### 2. Correr el schema SQL

- En Supabase: **SQL Editor -> New query**
- Pegar todo el contenido de `supabase/schema.sql`
- Run

Esto crea las 5 tablas (`colaborador`, `registros`, `salarios`, `recargos`,
`precios_manuales`) con Row Level Security para que cada usuario vea solo
sus datos.

### 3. Configurar el cliente

- En Supabase: **Settings -> API**
- Copiar **Project URL** y **anon public key**
- Editar `js/supabase-client.js` y reemplazar los dos valores

### 4. Correr localmente

Como es todo estatico, cualquier servidor sirve:

```
# opcion 1: python
python -m http.server 8000

# opcion 2: node (con npx)
npx serve

# opcion 3: extension "Live Server" en VS Code
```

Abrir http://localhost:8000

### 5. Primer uso

1. Crear cuenta con email + password
2. Ir a **Perfil** y llenar tus datos personales (van al Excel)
3. Ir a **Precios** y configurar el salario del mes
4. Ir a **Registros** y comenzar a registrar

### 6. Deploy a GitHub Pages

```
git init
git add .
git commit -m "Version inicial"
git branch -M main
git remote add origin https://github.com/Cesarsol117/horas_extras_app.git
git push -u origin main
```

En GitHub -> Settings -> Pages -> Source: `main` branch -> `/ (root)`.
En ~1 minuto queda disponible en `https://cesarsol117.github.io/horas_extras_app/`.

## Estructura

```
.
├── index.html
├── css/styles.css
├── js/
│   ├── supabase-client.js    <- credenciales
│   ├── utils.js               <- constantes, formato, formulas
│   ├── api.js                 <- CRUD contra Supabase
│   ├── app.js                 <- router + guardia de sesion
│   └── components/
│       ├── Nav.js
│       ├── Auth.js            <- login/registro
│       ├── Registros.js       <- CRUD de registros
│       ├── Resumen.js         <- KPIs + grafica + tabla
│       ├── PreciosYSalario.js <- salario, recargos %, precios manuales
│       ├── Perfil.js          <- datos del colaborador
│       └── Exportar.js        <- descarga la plantilla llenada
├── assets/
│   └── plantilla.xlsx         <- plantilla oficial de Bussie
├── supabase/
│   └── schema.sql
└── README.md
```

## Formulas de calculo

- **Hora ordinaria** = `salario / 210` (jornada 42h/semana Colombia, Ley 2101/2021)
- **Horas extras** (diurna, nocturna, dominical, festiva, nocturna festiva):
  `base × (1 + %)` — hora completa + recargo
- **Recargos puros** (nocturno, festivo, nocturno festivo):
  `base × %` — solo el adicional (la hora ya la paga la jornada ordinaria)
- Si hay un **precio manual** para el mes/tipo, ese sobrescribe todo.
