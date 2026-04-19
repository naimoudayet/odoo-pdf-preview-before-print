FROM odoo:19
USER root

# Chromium + websocket-client — Odoo's HttpCase.browser_js uses Chrome
# Headless over a websocket bridge. Needed to run the Hoot/QUnit JS suites
# from --test-tags=:WebSuite.test_unit_desktop (v18+) / :WebSuite (v16/17).
RUN apt-get update \
 && apt-get install -y --no-install-recommends wget gnupg ca-certificates \
      python3-websocket \
 && wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub \
      | gpg --dearmor -o /usr/share/keyrings/google-chrome-keyring.gpg \
 && echo "deb [arch=amd64 signed-by=/usr/share/keyrings/google-chrome-keyring.gpg] https://dl.google.com/linux/chrome/deb/ stable main" \
      > /etc/apt/sources.list.d/google-chrome.list \
 && apt-get update \
 && apt-get install -y --no-install-recommends google-chrome-stable \
 && apt-get clean && rm -rf /var/lib/apt/lists/*

ENV CHROME_BIN=/usr/bin/google-chrome
USER odoo
