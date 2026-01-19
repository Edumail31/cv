import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ResumeScore | AI-Powered Resume Builder | ATS-Friendly Templates",
  description: "Build professional, ATS-optimized resumes in minutes with AI. Get instant resume enhancement, company-targeted suggestions, and land your dream job. Free to start.",
  keywords: "resume builder, cv builder, ai resume, ats resume, resume maker, cv maker, professional resume, job application, career",
  authors: [{ name: "ResumeScore" }],
  openGraph: {
    title: "ResumeScore | AI-Powered Resume Builder",
    description: "Build professional, ATS-optimized resumes in minutes with AI assistance.",
    type: "website",
    locale: "en_IN",
    siteName: "ResumeScore",
  },
  twitter: {
    card: "summary_large_image",
    title: "ResumeScore | AI-Powered Resume Builder",
    description: "Build professional, ATS-optimized resumes in minutes with AI assistance.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* JSON-LD Schema for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "ResumeScore",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "INR",
              },
              "aggregateRating": {
                "@type": "AggregateRating",
                "ratingValue": "4.8",
                "ratingCount": "1200",
              },
              "description": "AI-powered resume builder with ATS optimization and company targeting features.",
            }),
          }}
        />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
