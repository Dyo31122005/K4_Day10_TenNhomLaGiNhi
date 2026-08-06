import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Day 10 Paper RAG Chatbot",
  description: "Chatbot hỏi-đáp trên corpus paper Crossref của nhóm Day 10.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
