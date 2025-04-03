import { Hono } from "hono";
import type SentryMCP from "../mcp";
import { css, Style } from "hono/css";

const copyPasteHelper = `
const nodes = document.querySelectorAll("[data-copy]");
nodes.forEach((button) => {
  button.addEventListener("click", (e) => {
    const text = button.getAttribute("data-copy");
    navigator.clipboard.writeText(decodeURIComponent(text));
  });
});
`;

const globalStyles = css`
  :root {
    --font-sans: ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji",
      "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";
    --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas,
      "Liberation Mono", "Courier New", monospace;

    --default-font-family: var(--font-sans);
    --default-mono-font-family: var(--font-mono);

    --tw-prose-body: oklch(37.3% 0.034 259.733);
    --tw-prose-headings: oklch(21% 0.034 264.665);
    --tw-prose-links: oklch(21% 0.034 264.665);
    --tw-prose-bold: oklch(21% 0.034 264.665);
    --tw-prose-code: oklch(21% 0.034 264.665);
    --tw-prose-pre-code: oklch(92.8% 0.006 264.531);
    --tw-prose-pre-bg: oklch(27.8% 0.033 256.848);

    --color-white: #fff;
    --color-gray-500: oklch(55.1% 0.027 264.364);
    --color-gray-600: oklch(44.6% 0.03 256.802);
  }

  html {
    font-family: var(
      --default-font-family,
      ui-sans-serif,
      system-ui,
      sans-serif,
      "Apple Color Emoji",
      "Segoe UI Emoji",
      "Segoe UI Symbol",
      "Noto Color Emoji"
    );

    line-height: 1.5;
    -webkit-text-size-adjust: 100%;
    tab-size: 4;
  }

  body {
    padding: 2rem;
    background: #fff;
    color: var(--tw-prose-body);
    font-size: 1rem;
    line-height: 1.75;
  }

  h1 {
    color: var(--tw-prose-headings);
    font-weight: 800;
    font-size: 2.25em;
    margin-top: 0;
    margin-bottom: 0.8888889em;
    line-height: 1.1111111;
  }

  p,
  h1,
  h2,
  h3,
  ul,
  ol,
  pre {
    margin: 1.25rem 0;
  }

  a {
    color: var(--tw-prose-links);
    text-decoration: underline;
    font-weight: 500;
  }

  pre {
    font-family: var(
      --default-mono-font-family,
      ui-monospace,
      SFMono-Regular,
      Menlo,
      Monaco,
      Consolas,
      "Liberation Mono",
      "Courier New",
      monospace
    );
    color: var(--tw-prose-pre-code);
    background-color: var(--tw-prose-pre-bg);
    overflow-x: auto;
    font-weight: 400;
    font-size: 0.875em;
    border-radius: 0.375rem;
    padding: 0.85em 1.15em;
  }

  small {
    font-size: 0.85rem;
  }

  article {
    max-width: 600px;
  }

  button {
    border-radius: 0.25rem;
    border: 0;

    color: var(--color-white);
    background-color: var(--color-gray-600);
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    cursor: pointer;

    &:hover {
      background-color: var(--color-gray-500);
    }
  }
`;

export default new Hono<{
  Bindings: Env & {
    MCP_OBJECT: DurableObjectNamespace<SentryMCP>;
  };
}>().get("/", async (c) => {
  const mcpSnippet = JSON.stringify(
    {
      mcpServers: {
        sentry: {
          command: "npx",
          args: ["mcp-remote", new URL("/sse", c.req.url).href],
        },
      },
    },
    undefined,
    2,
  );

  return c.html(
    <html lang="en">
      <head>
        <title>Sentry MCP</title>
        <Style>{globalStyles}</Style>
      </head>
      <body>
        <article>
          <h1>Sentry MCP</h1>
          <p>
            This service provides a Model Context Provider for interacting with{" "}
            <a href="https://docs.sentry.io/api/">Sentry's API</a>.
          </p>
          <div>
            <button type="button" data-copy={mcpSnippet}>
              Copy Configuration
            </button>
            <pre>{mcpSnippet}</pre>
          </div>
          <h3>With Cursor</h3>
          <ol>
            <li>
              <strong>Cmd + Shift + J</strong> to open Cursor Settings.
            </li>
            <li>
              Select <strong>MCP</strong>.
            </li>
            <li>
              Select <strong>Add new global MCP server</strong>.
            </li>
          </ol>
          <h3>With Windsurf</h3>
          <ol>
            <li>Open Windsurf Settings.</li>
            <li>
              Under <strong>Cascade</strong>, you'll find{" "}
              <strong>Model Context Provider Servers</strong>.
            </li>
            <li>
              Select <strong>Add Server</strong>.
            </li>
          </ol>
          <p>
            <small>Note: Windsurf requires an enterprise account to utilize MCP. 😕</small>
          </p>

          <h2>Available Tools</h2>
          <p>TODO:</p>
        </article>
        <footer>
          <a href="https://github.com/getsentry/sentry-mcp">GitHub</a>
        </footer>

        <script dangerouslySetInnerHTML={{ __html: copyPasteHelper }} />
      </body>
    </html>,
  );
});
