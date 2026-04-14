# 🤝 Encuentros - Monorepo

Proyecto full-stack con **NestJS** (Backend) + **Angular** (Frontend), orquestado con **Docker Compose** y pipeline **Jenkins** para CI/CD con **SonarQube**.

## 📁 Estructura del Proyecto

```
Encuentros/
├── backend/                 # API NestJS (Puerto 3000)
│   ├── src/                 # Código fuente del backend
│   ├── Dockerfile
│   ├── sonar-project.properties
│   ├── package.json
│   └── ...
├── frontend/                # App Angular (Puerto 80)
│   ├── src/                 # Código fuente del frontend
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── sonar-project.properties
│   ├── package.json
│   └── ...
├── docker-compose.yml       # Orquestación de todos los servicios
├── Jenkinsfile              # Pipeline CI/CD
├── .gitignore
└── README.md
```

## 🚀 Inicio Rápido

### Requisitos
- Docker & Docker Compose
- Node.js 20+ (para desarrollo local)

### Levantar todo con Docker Compose
```bash
docker-compose up -d --build
```

Esto levanta:
| Servicio   | URL                      |
|------------|--------------------------|
| Frontend   | http://localhost         |
| Backend    | http://localhost:3000    |
| Swagger    | http://localhost:3000/api-docs |
| SonarQube  | http://localhost:9000    |
| Jenkins    | http://localhost:8080    |

### Desarrollo Local

**Backend:**
```bash
cd backend
npm install
cp .env.example .env   # Editar con tus credenciales
npm run start:dev
```

**Frontend:**
```bash
cd frontend
npm install
npm start               # ng serve en http://localhost:4200
```

## 🧪 Tests

**Backend (Jest):**
```bash
cd backend
npm run test:cov
```

**Frontend (Karma + Jasmine):**
```bash
cd frontend
npx ng test --watch=false --browsers=ChromeHeadless --code-coverage
```

## 📊 SonarQube

```bash
# Desde backend/
npx sonar-scanner -Dsonar.host.url=http://localhost:9000 -Dsonar.login=<TOKEN>

# Desde frontend/
npx sonar-scanner -Dsonar.host.url=http://localhost:9000 -Dsonar.login=<TOKEN>
```

## 🔧 Jenkins Pipeline

El `Jenkinsfile` ejecuta automáticamente:
1. **Install** → `npm ci` en backend y frontend
2. **Test + Coverage** → Tests unitarios con cobertura
3. **SonarQube** → Análisis estático de código
4. **Quality Gate** → Validar que pasa el umbral de calidad
5. **Docker Build** → Construir imágenes Docker
6. **Deploy** → Levantar contenedores con docker-compose

### Configuración requerida en Jenkins:
1. **NodeJS Plugin**: Instalar y configurar NodeJS 20 como `NodeJS-20`
2. **SonarQube Scanner**: Instalar plugin y configurar servidor como `SonarQube`
3. **Docker**: Asegurar que Jenkins tenga acceso al Docker daemon
