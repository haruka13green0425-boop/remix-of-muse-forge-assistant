import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "プライバシーポリシー / Privacy Policy — Prompt Atelier" },
      {
        name: "description",
        content:
          "Prompt Atelier のプライバシーポリシー。取得する情報、利用目的、広告、第三者サービス、お問い合わせ窓口について。",
      },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
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
          {isJa ? "プライバシーポリシー" : "Privacy Policy"}
        </h1>

        {isJa ? <PolicyJa /> : <PolicyEn />}
      </div>
    </div>
  );
}

function PolicyJa() {
  return (
    <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground">
      <p>
        Prompt Atelier（以下、「本アプリ」）は、利用者のプライバシーを尊重し、以下の方針で個人情報を取り扱います。
      </p>

      <Section title="取得する情報">
        <p>本アプリは、以下の情報を取得する場合があります。</p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>アプリ利用状況</li>
          <li>広告配信に必要な情報</li>
          <li>クラッシュレポート</li>
          <li>お問い合わせ時に送信された情報</li>
        </ul>
      </Section>

      <Section title="利用目的">
        <p>取得した情報は以下の目的で利用します。</p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>サービス改善</li>
          <li>不具合修正</li>
          <li>広告配信</li>
          <li>お問い合わせ対応</li>
        </ul>
      </Section>

      <Section title="広告について">
        <p>本アプリでは Google AdSense 等の広告サービスを利用する場合があります。</p>
        <p>広告配信事業者は Cookie 等を利用して、利用者に適した広告を表示することがあります。</p>
      </Section>

      <Section title="第三者サービス">
        <p>本アプリでは以下のサービスを利用する場合があります。</p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>Google AdSense</li>
          <li>Google Analytics</li>
          <li>Firebase</li>
        </ul>
      </Section>

      <Section title="お問い合わせ">
        <p>ご質問・ご要望・不具合報告は、以下までお願いいたします。</p>
        <p className="mt-2">
          メールアドレス:{" "}
          <a
            href="mailto:researchsimplify0123@gmail.com"
            className="text-primary underline underline-offset-2"
          >
            researchsimplify0123@gmail.com
          </a>
        </p>
      </Section>

      <Section title="個人情報">
        <p>本アプリは、お問い合わせ以外で氏名・住所等の個人情報を収集しません。</p>
      </Section>

      <Section title="プライバシーポリシーの変更">
        <p>必要に応じて内容を変更する場合があります。</p>
      </Section>
    </div>
  );
}

function PolicyEn() {
  return (
    <div className="mt-8 space-y-8 text-sm leading-relaxed text-foreground">
      <p>
        Prompt Atelier ("the App") respects the privacy of its users and handles personal
        information in accordance with the policy below.
      </p>

      <Section title="Information We Collect">
        <p>The App may collect the following information:</p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>App usage data</li>
          <li>Information required for ad delivery</li>
          <li>Crash reports</li>
          <li>Information submitted via inquiries</li>
        </ul>
      </Section>

      <Section title="Purpose of Use">
        <p>Collected information is used for:</p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>Service improvement</li>
          <li>Bug fixes</li>
          <li>Ad delivery</li>
          <li>Responding to inquiries</li>
        </ul>
      </Section>

      <Section title="Advertising">
        <p>The App may use advertising services such as Google AdSense.</p>
        <p>
          Ad providers may use cookies and similar technologies to show ads suited to users.
        </p>
      </Section>

      <Section title="Third-Party Services">
        <p>The App may use the following services:</p>
        <ul className="mt-2 list-disc space-y-1 pl-6">
          <li>Google AdSense</li>
          <li>Google Analytics</li>
          <li>Firebase</li>
        </ul>
      </Section>

      <Section title="Contact">
        <p>For questions, requests, or bug reports, please contact:</p>
        <p className="mt-2">
          Email:{" "}
          <a
            href="mailto:researchsimplify0123@gmail.com"
            className="text-primary underline underline-offset-2"
          >
            researchsimplify0123@gmail.com
          </a>
        </p>
      </Section>

      <Section title="Personal Information">
        <p>
          The App does not collect personal information such as name or address, other than
          through inquiries.
        </p>
      </Section>

      <Section title="Changes to This Policy">
        <p>The contents of this policy may be updated as necessary.</p>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="mt-2 text-muted-foreground">{children}</div>
    </section>
  );
}
