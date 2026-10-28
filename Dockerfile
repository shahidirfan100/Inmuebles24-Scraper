FROM apify/actor-node-playwright-chrome:24-1.64.1

RUN npm ls apify patchright impit || true

COPY --chown=myuser:myuser package*.json ./

RUN npm --quiet set progress=false \
    && npm install --omit=dev \
    && echo "Installed NPM packages:" \
    && (npm list --omit=dev --all || true) \
    && echo "Node.js version:" \
    && node --version \
    && echo "NPM version:" \
    && npm --version \
    && rm -r ~/.npm

ENV PLAYWRIGHT_BROWSERS_PATH=/home/myuser/pw-browsers
RUN npx patchright install chromium

COPY --chown=myuser:myuser . ./

ENV APIFY_DISABLE_OUTDATED_WARNING=1

CMD npm start --silent
