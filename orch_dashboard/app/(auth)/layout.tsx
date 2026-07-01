export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex bg-[var(--background)]">

      {/* Left — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-[var(--surface)] border-r">
        <div>
          <span className="text-lg font-semibold tracking-tight">Orch</span>
        </div>

        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-3xl font-semibold leading-snug tracking-tight">
              Bring your own AI.<br />
              We make sure it<br />
              follows your rules.
            </p>
            <p className="text-sm text-[var(--text-secondary)] max-w-sm leading-relaxed">
              Constraint enforcement, model governance, and per-developer audit logs —
              without changing how your team works.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {[
              { label: "Constraint enforcement", desc: "Every prompt runs through your org's rules." },
              { label: "Model governance", desc: "Enforced, allowlist, or open — you decide." },
              { label: "Full audit trail", desc: "Every session attributed to a developer." },
            ].map((f) => (
              <div key={f.label} className="flex items-start gap-3">
                <div className="mt-0.5 w-4 h-4 rounded-full bg-[var(--accent)]/15 flex items-center justify-center shrink-0">
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                </div>
                <div>
                  <p className="text-sm font-medium">{f.label}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-[var(--text-secondary)]">
          © {new Date().getFullYear()} Orch. All rights reserved.
        </p>
      </div>

      {/* Right — auth widget */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="lg:hidden text-center space-y-1">
            <p className="text-xl font-semibold">Orch</p>
            <p className="text-sm text-[var(--text-secondary)]">Bring your own AI. We make sure it follows your rules.</p>
          </div>
          {children}
        </div>
      </div>

    </div>
  )
}
