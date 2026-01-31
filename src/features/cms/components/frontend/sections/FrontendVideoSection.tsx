import React from "react";
import { getSectionStyles } from "../theme-styles";

interface FrontendVideoSectionProps {
  settings: Record<string, unknown>;
}

function getEmbedUrl(url: string): string | null {
  if (!url) return null;

  // YouTube
  const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?#]+)/);
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}`;

  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) return `https://player.vimeo.com/video/${vimeoMatch[1]}`;

  // Already an embed URL or other
  if (url.includes("embed") || url.includes("player")) return url;

  return null;
}

function getAspectPadding(ratio: string): string {
  switch (ratio) {
    case "4:3":
      return "75%";
    case "1:1":
      return "100%";
    default:
      return "56.25%"; // 16:9
  }
}

export function FrontendVideoSection({ settings }: FrontendVideoSectionProps): React.ReactNode {
  const sectionStyles = getSectionStyles(settings);
  const videoUrl = (settings["videoUrl"] as string) || "";
  const aspectRatio = (settings["aspectRatio"] as string) || "16:9";
  const autoplay = (settings["autoplay"] as string) === "yes";

  const embedUrl = getEmbedUrl(videoUrl);

  return (
    <section style={sectionStyles}>
      <div className="container mx-auto max-w-4xl px-4 md:px-6">
        {embedUrl ? (
          <div className="relative w-full overflow-hidden rounded-lg" style={{ paddingBottom: getAspectPadding(aspectRatio) }}>
            <iframe
              className="absolute inset-0 h-full w-full"
              src={`${embedUrl}${autoplay ? "?autoplay=1&mute=1" : ""}`}
              title="Embedded video"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        ) : (
          <div
            className="flex items-center justify-center rounded-lg bg-gray-800/50"
            style={{ paddingBottom: getAspectPadding(aspectRatio), position: "relative" }}
          >
            <p className="absolute inset-0 flex items-center justify-center text-gray-500">
              Enter a video URL in section settings
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
