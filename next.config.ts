import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
        ]
      },
      ...["/dashboard/:path*", "/auth/:path*", "/onboarding/:path*", "/store/:path*", "/api/:path*"].map(source => ({
        source,
        headers: [{ key: "Cache-Control", value: "private, no-store, max-age=0, must-revalidate" }]
      }))
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.cloudinary.com" }
    ]
  }
};

export default nextConfig;