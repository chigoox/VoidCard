import { AccountBackLink } from "./AccountBackLink";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <AccountBackLink />
      {children}
    </div>
  );
}
