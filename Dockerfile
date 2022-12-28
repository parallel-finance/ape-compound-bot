# ===== FIRST STAGE ======
FROM node:14.17.0 as builder
RUN curl -f https://get.pnpm.io/v6.16.js | node - add --global pnpm

LABEL description="This is the build stage for paraspace-ape-compound-bot. Here we create the dist."

WORKDIR /paraspace-ape-compound-bot

COPY pnpm-lock.yaml /paraspace-ape-compound-bot
RUN pnpm fetch

ADD . /paraspace-ape-compound-bot
RUN pnpm install -r --offline && pnpm build

# ===== SECOND STAGE ======
FROM node:14.17.0
LABEL description="This is the 2nd stage: a very small image where we copy the paraspace-ape-compound-bot."

COPY --from=builder /paraspace-ape-compound-bot /usr/local/lib/paraspace-ape-compound-bot
COPY --from=builder /paraspace-ape-compound-bot/node_modules /usr/local/lib/node_modules

RUN chmod +x /usr/local/lib/paraspace-ape-compound-bot/packages/bot/dist/index.js \
    && ln -s /usr/local/lib/paraspace-ape-compound-bot/packages/bot/dist/index.js /usr/local/bin/paraspace-ape-compound-bot

RUN curl -fsSL -o /usr/local/bin/shush \
    https://github.com/realestate-com-au/shush/releases/download/v1.5.2/shush_linux_amd64 \
 && chmod +x /usr/local/bin/shush

ENTRYPOINT ["/usr/local/bin/shush", "exec", "--", "node", "/usr/local/bin/paraspace-ape-compound-bot"]