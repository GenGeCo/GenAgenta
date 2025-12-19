# GenAgenTa

Rete Neurale Temporale delle Relazioni Commerciali.

## Setup Locale per Test

### 1. Prerequisiti

- PHP 8.x con estensione PDO_MySQL
- MySQL/MariaDB
- Node.js 18+
- npm

### 2. Database

Crea un database MySQL chiamato `genagenta`:

```sql
CREATE DATABASE genagenta CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Importa lo schema e i dati mock:

```bash
mysql -u root genagenta < database/schema.sql
mysql -u root genagenta < database/mock_data.sql
```

### 3. Configurazione Backend

Copia il file `.env.example` in `.env` e configura:

```bash
cp .env.example .env
```

Modifica `.env` con le tue credenziali:

```
DB_HOST=localhost
DB_NAME=genagenta
DB_USER=root
DB_PASS=la_tua_password
JWT_SECRET=una_stringa_casuale_lunga
ENVIRONMENT=development
```

### 4. Avvia Backend PHP

Dalla cartella `backend`:

```bash
cd backend
php -S localhost:8000
```

### 5. Installa e Avvia Frontend

Dalla cartella `frontend`:

```bash
cd frontend
npm install
npm run dev
```

### 6. Accedi all'App

Apri http://localhost:5173/genagenta

**Credenziali demo:**
- Email: `admin@gruppogea.net`
- Password: `admin123`

---

## Struttura Progetto

```
GenAgenTa/
├── backend/
│   ├── api/              # Endpoint REST
│   │   ├── auth/         # Login, PIN
│   │   ├── neuroni/      # CRUD neuroni
│   │   ├── sinapsi/      # CRUD sinapsi
│   │   ├── note/         # Note personali
│   │   └── stats/        # Dashboard
│   ├── config/           # Configurazione
│   └── includes/         # Helper functions
│
├── frontend/
│   ├── src/
│   │   ├── components/   # Componenti React
│   │   ├── pages/        # Pagine
│   │   ├── hooks/        # Custom hooks
│   │   ├── types/        # TypeScript types
│   │   └── utils/        # API client
│   └── public/
│
├── database/
│   ├── schema.sql        # Struttura DB
│   └── mock_data.sql     # Dati esempio
│
├── .env.example          # Template configurazione
├── .gitignore
└── ROADMAP.md            # Piano progetto
```

---

## API Endpoints

### Auth
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Utente corrente
- `POST /api/auth/verify-pin` - Verifica PIN area personale

### Neuroni
- `GET /api/neuroni` - Lista neuroni (con filtri)
- `GET /api/neuroni/:id` - Dettaglio neurone
- `POST /api/neuroni` - Crea neurone
- `PUT /api/neuroni/:id` - Aggiorna neurone
- `DELETE /api/neuroni/:id` - Elimina neurone
- `GET /api/neuroni/:id/sinapsi` - Sinapsi del neurone

### Sinapsi
- `GET /api/sinapsi` - Lista sinapsi (con filtri temporali)
- `POST /api/sinapsi` - Crea sinapsi
- `PUT /api/sinapsi/:id` - Aggiorna sinapsi
- `DELETE /api/sinapsi/:id` - Elimina sinapsi

### Note Personali (richiede PIN)
- `GET /api/note` - Lista note
- `POST /api/note` - Crea nota
- `PUT /api/note/:id` - Aggiorna nota
- `DELETE /api/note/:id` - Elimina nota

### Stats
- `GET /api/stats` - Statistiche dashboard

---

## Deploy su Netsons

1. Push su GitHub
2. Su cPanel → Git Version Control → Pull
3. Configura `.env` sul server con credenziali produzione
4. Importa database su MySQL Netsons
5. Testa su www.gruppogea.net/genagenta
