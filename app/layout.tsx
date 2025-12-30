import "./globals.css";
import Header from "./components/Header";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className="bg-gray-50 text-gray-900">
        <div className="max-w-4xl mx-auto px-6 py-8">
          <Header />
          {children}
        </div>
      </body>
    </html>
  );
}
