FROM node:24-bookworm

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000
ENV TRUST_PROXY=true
ENV ALLOW_BROWSER_COOKIES=false
ENV VIRTUAL_ENV=/opt/venv
ENV DENO_INSTALL=/opt/deno
ENV PATH="/opt/deno/bin:/opt/venv/bin:${PATH}"

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl unzip python3 python3-pip python3-venv \
  && curl -fsSL https://deno.land/install.sh | sh \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci --omit=dev

RUN python3 -m venv "${VIRTUAL_ENV}" \
  && "${VIRTUAL_ENV}/bin/pip" install --no-cache-dir --upgrade pip \
  && "${VIRTUAL_ENV}/bin/pip" install --no-cache-dir "yt-dlp[default]" faster-whisper

COPY src ./src
COPY public ./public
COPY scripts ./scripts
COPY README.md ./
COPY .env.example ./

RUN mkdir -p /app/runtime
RUN npm run doctor

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=5 CMD node -e "fetch('http://127.0.0.1:3000/api/health').then((res)=>process.exit(res.ok?0:1)).catch(()=>process.exit(1))"

EXPOSE 3000

CMD ["npm", "start"]
