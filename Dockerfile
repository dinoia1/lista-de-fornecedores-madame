FROM node:24-alpine@sha256:50c8e8ca1d27439048670df5883f32d57cf81cff6233222c893fd0d9884cbd81
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4173
WORKDIR /app
COPY --chown=node:node package.json server.mjs lead-store.mjs admin-store.mjs attribution.mjs security.mjs ./
COPY --chown=node:node public ./public
RUN chmod -R a+rX /app
USER node
EXPOSE 4173
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 CMD node -e "fetch('http://127.0.0.1:4173/healthz').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"
CMD ["node", "server.mjs"]
