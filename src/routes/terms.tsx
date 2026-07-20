import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "利用規約 / Terms of Service — Prompt Atelier" },
      {
        name: "description",
        content:
          "Prompt Atelier の利用規約。自己責任での利用、生成物の正確性、商用利用、免責事項について。",
      },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: TermsPage,
});

function TermsPage() {
  const [, lang] = useT();
  const isJa = lang === "ja";
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-2xl px-6 py-14 sm:px-8">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {isJa ? "戻る" : "Back"}
        </Link>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight text-foreground">
          {isJa ? "利用規約" : "Terms of Service"}
        </h1>

        {isJa ? (
          <ul className="mt-8 list-disc space-y-3 pl-6 text-sm leading-relaxed text-foreground">
            <li>本アプリは自己責任で利用してください。</li>
            <li>生成された内容の正確性は保証しません。</li>
            <li>商用利用の可否は利用する AI サービスの規約に従ってください。</li>
            <li>本アプリの利用により生じた損害について責任を負いません。</li>
          </ul>
        ) : (
          <ul className="mt-8 list-disc space-y-3 pl-6 text-sm leading-relaxed text-foreground">
            <li>Use this App at your own risk.</li>
            <li>We do not guarantee the accuracy of generated content.</li>
            <li>
              Whether commercial use is permitted depends on the terms of the AI service you
              use — please follow those terms.
            </li>
            <li>
              We are not liable for any damages arising from the use of this App.
            </li>
          </ul>
        )}
      </div>
    </div>
  );
}
