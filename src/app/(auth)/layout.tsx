/**
 * Auth layout
 * Layout for signup and login pages
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 to-blue-50">
      {children}
    </div>
  );
}