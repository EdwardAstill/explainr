# Future: Static Site Deployment

Platform-specific builds are now implemented via `readrun build github|vercel|netlify`. See [deployment.md](../deployment.md) for usage.

## Remaining work

- **CI/CD templates**: The GitHub Actions workflow is generated automatically. Vercel and Netlify could also generate CI-specific configs for monorepo setups or custom build pipelines.
- **Custom domains**: Support a `--domain` flag to configure CNAME files (GitHub Pages) or domain settings in platform configs.
- **`readrun deploy` command**: A single command that handles build + push to the target platform without needing to set up CI manually.
