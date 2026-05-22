import { defineConfig } from '@hey-api/openapi-ts';

export default defineConfig({
  input: 'src/data/openapi-spec.json',
  output: {
    path: 'src/data/openapi',
  },
  plugins: [
    '@hey-api/client-fetch',
    '@hey-api/schemas',
    '@hey-api/sdk',
    '@hey-api/typescript',
  ],
});
