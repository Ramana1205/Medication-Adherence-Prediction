# Authentication Deployment

Configure these variables in the FastAPI hosting service before deploying:

```text
JWT_SECRET=<long random production secret>
DOCTOR_ID=<doctor identifier>
DOCTOR_EMAIL=<doctor email>
DOCTOR_NAME=<doctor display name>
DOCTOR_PASSWORD=<doctor password>
```

Keep these values server-side. Do not add them to the React `.env`, Vite configuration, or committed files. After changing them, restart/redeploy the backend so `/auth/doctor/login` can issue tokens.

The frontend must use the deployed API URL in `VITE_API_URL`, then be rebuilt and redeployed. Existing browser sessions with tokens issued by a previous `JWT_SECRET` must log in again after a secret rotation.