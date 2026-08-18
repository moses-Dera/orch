import type { Appearance } from "@clerk/types"

export const clerkAppearance: Appearance = {
  layout: {
    socialButtonsPlacement: "bottom",
    socialButtonsVariant: "blockButton",
    showOptionalFields: false,
  },
  variables: {
    colorPrimary: "#6366f1",
    colorDanger: "#ef4444",
    borderRadius: "8px",
    fontFamily: "inherit",
    fontSize: "14px",
  },
  elements: {
    // Strip the outer card entirely — we provide the container
    userButtonPopoverCard: "bg-[var(--surface)] border border-[var(--border)] shadow-xl",
    userPreviewMainIdentifier: "text-[var(--text-primary)] font-semibold",
    userPreviewSecondaryIdentifier: "text-[var(--text-secondary)]",
    userButtonPopoverActionButton: "hover:bg-[var(--background)] transition-colors",
    userButtonPopoverActionButtonText: "text-[var(--text-primary)]",
    userButtonPopoverActionButtonIcon: "text-[var(--text-secondary)]",
    
    // Profile Page elements
    profileSectionTitle: "text-[var(--text-primary)] border-b border-[var(--border)]",
    profileSectionPrimaryButton: "text-[var(--text-primary)]",
    profilePage: "bg-[var(--background)] text-[var(--text-primary)]",
    navbar: "bg-[var(--surface)] border-r border-[var(--border)]",
    navbarButton: "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--background)]",
    breadcrumbsItem: "text-[var(--text-primary)]",
    breadcrumbsItemDivider: "text-[var(--text-secondary)]",
    pageScrollBox: "bg-[var(--background)]",
    badge: "text-[var(--text-primary)] bg-[var(--surface)] border border-[var(--border)]",
    card: "shadow-none border-0 bg-transparent p-0 gap-6",
    headerTitle: "text-xl font-semibold text-[var(--text-primary)]",
    headerSubtitle: "text-sm text-[var(--text-secondary)]",

    // Form fields
    formFieldLabel: "text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wide",
    formFieldInput: [
      "w-full rounded-md border border-[var(--border)] bg-[var(--background)]",
      "px-3 py-2 text-sm text-[var(--text-primary)] outline-none",
      "focus:ring-1 focus:ring-[#6366f1] focus:border-[#6366f1]",
      "placeholder:text-[var(--text-secondary)]",
      "transition-colors",
    ].join(" "),
    formFieldInputShowPasswordButton: "text-[var(--text-secondary)] hover:text-[var(--text-primary)]",

    // Primary button
    formButtonPrimary: [
      "w-full rounded-md bg-[#6366f1] hover:bg-[#4f46e5]",
      "px-4 py-2 text-sm font-medium text-white",
      "transition-colors normal-case shadow-none",
    ].join(" "),

    // Social buttons
    socialButtonsBlockButton: [
      "w-full rounded-md border border-[var(--border)] bg-[var(--surface)]",
      "hover:bg-[var(--border)] px-4 py-2 text-sm font-medium",
      "text-[var(--text-primary)] transition-colors shadow-none normal-case",
    ].join(" "),
    socialButtonsBlockButtonText: "text-sm font-medium",
    socialButtonsProviderIcon: "w-4 h-4",

    // Divider
    dividerLine: "bg-[var(--border)]",
    dividerText: "text-xs text-[var(--text-secondary)]",

    // Footer links
    footerActionLink: "text-[#6366f1] hover:text-[#4f46e5] font-medium",
    footerActionText: "text-sm text-[var(--text-secondary)]",
    footer: "pt-2",

    // Error / alert
    formFieldErrorText: "text-xs text-[#ef4444] mt-1",
    alertText: "text-sm",
    alert: "rounded-md border border-[#ef4444]/20 bg-[#ef4444]/5 px-3 py-2",

    // Internal card parts we don't want
    cardBox: "shadow-none",
    main: "gap-5",
    form: "gap-4",
  },
}
