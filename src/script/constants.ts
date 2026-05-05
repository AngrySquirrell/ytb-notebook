export const SUCCESS_HTML_RESPONSE = `
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Authentication Success</title>
    <style>
      :root {
        color-scheme: dark;
        --mantine-body: #1a1b1e;
        --mantine-paper: #25262b;
        --mantine-subtle: #2c2e33;
        --mantine-border: #373a40;
        --mantine-text: #f8f9fa;
        --mantine-dimmed: #909296;
        --mantine-primary: #228be6;
        --mantine-primary-hover: #1c7ed6;
        --mantine-shadow: 0 6px 18px rgba(0, 0, 0, 0.28);
      }

      * {
        box-sizing: border-box;
      }

      html,
      body {
        margin: 0;
        height: 100%;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
          Helvetica, Arial, sans-serif;
        color: var(--mantine-text);
        background: radial-gradient(
            circle at 15% -10%,
            rgba(34, 139, 230, 0.15),
            transparent 38%
          ),
          var(--mantine-body);
      }

      body {
        display: grid;
        place-items: center;
        padding: 16px;
      }

      .card {
        width: min(520px, 100%);
        background: var(--mantine-paper);
        border: 1px solid var(--mantine-border);
        border-radius: 8px;
        box-shadow: var(--mantine-shadow);
        padding: 24px;
        text-align: center;
        animation: enter 120ms ease-out both;
      }

      .icon-wrap {
        width: 56px;
        height: 56px;
        border-radius: 999px;
        margin: 0 auto 14px;
        display: grid;
        place-items: center;
        background: rgba(34, 139, 230, 0.16);
        border: 1px solid rgba(34, 139, 230, 0.35);
      }

      .check {
        width: 24px;
        height: 24px;
        color: var(--mantine-primary);
        stroke-width: 3;
      }

      h1 {
        margin: 0;
        font-size: 1.25rem;
        line-height: 1.3;
        font-weight: 700;
      }

      p {
        margin: 10px auto 0;
        max-width: 42ch;
        color: var(--mantine-dimmed);
        font-size: 0.95rem;
        line-height: 1.5;
      }

      .countdown {
        margin-top: 18px;
        display: inline-flex;
        align-items: center;
        gap: 8px;
        border-radius: 6px;
        background: rgba(34, 139, 230, 0.15);
        border: 1px solid var(--mantine-border);
        padding: 6px 10px;
        font-size: 0.86rem;
        font-weight: 500;
        color: var(--mantine-text);
      }

      .dot {
        width: 8px;
        height: 8px;
        border-radius: 999px;
        background: var(--mantine-primary);
      }

      .hint {
        margin-top: 12px;
        font-size: 0.82rem;
        color: #868e96;
      }

      .close-now {
        margin-top: 16px;
        border: 0;
        background: var(--mantine-primary);
        color: #fff;
        border-radius: 8px;
        font-weight: 600;
        font-size: 0.875rem;
        line-height: 1;
        min-height: 36px;
        padding: 0 14px;
        cursor: pointer;
        transition: background-color 120ms ease;
        box-shadow: none;
      }

      .close-now:hover {
        background: var(--mantine-primary-hover);
      }

      .close-now:active {
        background: #1971c2;
      }

      .close-now:focus-visible {
        outline: 2px solid rgba(34, 139, 230, 0.75);
        outline-offset: 2px;
      }

      @keyframes enter {
        from {
          opacity: 0;
          transform: translateY(6px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    </style>
  </head>
  <body>
    <main class="card" role="status" aria-live="polite">
      <div class="icon-wrap" aria-hidden="true">
        <svg
          class="check"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M5 12.5L10 17L19 8"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
      </div>

      <h1>Authentification réussie</h1>
      <p>
        Votre connexion Google est validée. Vous pouvez revenir à l'application,
        cette fenêtre va se fermer automatiquement.
      </p>

      <div class="countdown">
        <span class="dot" aria-hidden="true"></span>
        Fermeture automatique dans
        <strong><span id="seconds">5</span>s</strong>
      </div>

      <button class="close-now" id="closeNow" type="button">
        Ouvrir l'application maintenant
      </button>
      <div class="hint">
        Si rien ne se passe, vous pouvez fermer cette fenêtre manuellement.
      </div>
    </main>

    <script>
      (function () {
        let remaining = 5;
        const secondsEl = document.getElementById("seconds");
        const closeButton = document.getElementById("closeNow");
        const deeplinkUrl = "ytb-notebook://auth";

        const openApp = function () {
          // Try multiple strategies because external protocol handling can vary by OS/browser.
          try {
            window.location.assign(deeplinkUrl);
          } catch (_error) {
            // no-op
          }

          try {
            const link = document.createElement("a");
            link.href = deeplinkUrl;
            link.style.display = "none";
            document.body.appendChild(link);
            link.click();
            link.remove();
          } catch (_error) {
            // no-op
          }

          window.setTimeout(function () {
            window.close();
          }, 1200);
        };

        if (closeButton) {
          closeButton.addEventListener("click", openApp);
        }

        const timer = window.setInterval(function () {
          remaining -= 1;
          if (secondsEl) {
            secondsEl.textContent = String(Math.max(remaining, 0));
          }

          if (remaining <= 0) {
            window.clearInterval(timer);
            openApp();
          }
        }, 1000);

        window.setTimeout(openApp, 5000);
      })();
    </script>
  </body>
</html>
`;
