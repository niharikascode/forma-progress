import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  FolderOpen,
  NotebookPen,
  Sun,
  TrendingUp,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { ScreenTour } from "@/components/screen-tour";
import { currentAccount } from "@/lib/auth";
import "./site.css";

export const dynamic = "force-dynamic";

const features = [
  {
    icon: Sun,
    title: "A calm Today view",
    text: "Pick the handful of tasks you’ll move forward together. Carry unfinished work to tomorrow without losing its progress.",
  },
  {
    icon: CheckCircle2,
    title: "Progress from real steps",
    text: "Break tasks into small checklists. Task and project progress comes from steps finished, not hours logged.",
  },
  {
    icon: NotebookPen,
    title: "A notepad on every task",
    text: "Sketch, diagram and jot ideas on a canvas attached to the work itself.",
  },
  {
    icon: FolderOpen,
    title: "Projects and milestones",
    text: "Connect daily tasks to bigger goals, with dependencies that keep the order of work honest.",
  },
  {
    icon: TrendingUp,
    title: "An output history",
    text: "Every completed task records what you produced, so you can see what a week actually added up to.",
  },
  {
    icon: BookOpen,
    title: "Daily reviews",
    text: "Close the day with what got done, what’s blocked and what comes next.",
  },
];

export default async function Home() {
  const account = await currentAccount();
  return (
    <div className="site">
      <header className="site-header">
        <Brand />
        <nav className="site-nav" aria-label="Account">
          {account ? (
            <Link href="/app" className="site-btn primary">
              Open workspace <ArrowRight size={15} />
            </Link>
          ) : (
            <>
              <Link href="/login" className="site-btn ghost">
                Log in
              </Link>
              <Link href="/signup" className="site-btn primary">
                Sign up
              </Link>
            </>
          )}
        </nav>
      </header>

      <main>
        <section className="hero">
          <p className="eyebrow">Small steps. Real progress.</p>
          <h1>
            Focus on what you create,
            <br /> not how long you work.
          </h1>
          <p className="lede">
            Forma is a quiet workspace for your projects. Plan the day, finish
            small steps, and keep a record of what you actually produced. No
            timers, no streaks, no scores.
          </p>
          <div className="hero-cta">
            <Link
              href={account ? "/app" : "/signup"}
              className="site-btn primary large"
            >
              {account ? "Open your workspace" : "Create a free account"}
              <ArrowRight size={16} />
            </Link>
            {!account && (
              <Link href="/login" className="site-btn ghost large">
                I already have an account
              </Link>
            )}
          </div>

          <div className="hero-shot">
            <div className="frame">
              <div className="frame-bar" aria-hidden>
                <span />
                <span />
                <span />
                <em>forma-progress.vercel.app</em>
              </div>
              <Image
                src="/screens/today.webp"
                alt="The Forma Today view: planned tasks with subtask progress and a daily summary"
                width={2400}
                height={1500}
                sizes="(max-width: 1120px) 100vw, 1000px"
                priority
              />
            </div>
            <div className="phone">
              <Image
                src="/screens/mobile-today.webp"
                alt="Forma on a phone"
                width={780}
                height={1688}
                sizes="200px"
              />
            </div>
          </div>
        </section>

        <section className="screens" aria-labelledby="screens-title">
          <p className="eyebrow">A look inside</p>
          <h2 id="screens-title">Real screens from the app</h2>
          <ScreenTour />
        </section>

        <section className="features" aria-labelledby="features-title">
          <h2 id="features-title">Everything points at the output.</h2>
          <div className="feature-grid">
            {features.map(({ icon: Icon, title, text }) => (
              <article className="feature" key={title}>
                <span className="feature-icon">
                  <Icon size={18} />
                </span>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="steps" aria-labelledby="steps-title">
          <h2 id="steps-title">How a day in Forma goes</h2>
          <ol>
            <li>
              <span>1</span>
              <div>
                <h3>Plan</h3>
                <p>Choose today’s tasks from your projects.</p>
              </div>
            </li>
            <li>
              <span>2</span>
              <div>
                <h3>Make</h3>
                <p>Work through small steps and capture notes as you go.</p>
              </div>
            </li>
            <li>
              <span>3</span>
              <div>
                <h3>Record</h3>
                <p>Complete with what you produced, then review the day.</p>
              </div>
            </li>
          </ol>
        </section>

        <section className="closing">
          <h2>Start with one meaningful task.</h2>
          <p>
            Your workspace is private to your account. New accounts include
            example projects you can clear anytime.
          </p>
          <Link
            href={account ? "/app" : "/signup"}
            className="site-btn primary large"
          >
            {account ? "Open your workspace" : "Get started"}
            <ArrowRight size={16} />
          </Link>
        </section>
      </main>

      <footer className="site-footer">
        <Brand />
        <span>Make it meaningful.</span>
      </footer>
    </div>
  );
}
