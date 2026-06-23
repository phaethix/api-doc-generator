import { type PageProps } from "$fresh/server.ts";
import { Head } from "$fresh/runtime.ts";
import Header from "../components/Header.tsx";
import Footer from "../components/Footer.tsx";

export default function App({ Component }: PageProps) {
  return (
    <html lang="zh-CN" class="h-full">
      <Head>
        <title>API Doc Generator</title>
        <meta
          name="description"
          content="将 OpenAPI 规范一键转换为精美的 API 文档"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#2563eb" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link
          rel="preconnect"
          href="https://fonts.googleapis.com"
        />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <link rel="stylesheet" href="/styles.css" />
      </Head>
      <body class="min-h-full bg-gradient-to-br from-slate-50 via-white to-blue-50 font-sans text-slate-900 antialiased">
        <div class="flex min-h-screen flex-col">
          <Header />
          <main class="flex-1">
            <Component />
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
