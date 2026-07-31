# AWS IoT Dashboard — Frontend (React + Vite + Tailwind CSS)

[Tiếng Việt](README.vi.md)

A real-time AWS-based dashboard for monitoring and controlling IoT devices. It
includes granular data-source tracking and automatic connection recovery.

---

## 1. Requirements

- Node.js 18.x, 20.x, or newer
- npm or yarn

## 2. Fresh installation

Open a terminal in the repository root (`aws-iot-dashboard`), then run:

```bash
# Enter the frontend directory
cd frontend

# Install dependencies
npm install
```

## 3. Backend configuration

In development, Vite forwards requests beginning with `/api` to the backend
configured in `vite.config.ts`:

```ts
proxy: {
  '/api': {
    target: 'http://<BACKEND_HOST>:8000',
    changeOrigin: true,
    secure: false,
  },
},
```

Replace `<BACKEND_HOST>` with a reachable local backend or the backend ALB DNS
name. Do not commit credentials or secrets to the frontend source.

## 4. Run the development server

```bash
npm run dev
```

Open `http://localhost:5173`.

## 5. Validate and build for production

```bash
npm run lint
npm run build
npm run preview
```

The production output is written to `dist/`.

## 6. Deploy to S3 and CloudFront

Upload the production build to the private frontend S3 bucket and invalidate
the CloudFront cache:

```powershell
aws s3 sync dist "s3://<FRONTEND_BUCKET>" --delete
aws cloudfront create-invalidation `
  --distribution-id "<CLOUDFRONT_DISTRIBUTION_ID>" `
  --paths "/*"
```

Use the S3 bucket as CloudFront's default origin through Origin Access Control.
Use the Application Load Balancer as a second origin and route `/api/*` to it
with caching disabled and all required HTTP methods allowed. Attach the WAF web
ACL to the CloudFront distribution.

## 7. Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite development server |
| `npm run build` | Type-check and create a production build |
| `npm run lint` | Run Oxlint |
| `npm run preview` | Preview the production build |
