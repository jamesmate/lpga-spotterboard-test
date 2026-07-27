import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves project sites from /<repo-name>/, so asset URLs
  // need that prefix. Set this to match your repo's name before deploying
  // (e.g. '/spotterboard/'). Leave as '/' if you're deploying to a
  // <username>.github.io repo (a "user/organization" site) instead of a
  // project site, or if you're hosting elsewhere (Netlify, Vercel, etc).
  base: '/lpga-spotterboard-test/',
})
