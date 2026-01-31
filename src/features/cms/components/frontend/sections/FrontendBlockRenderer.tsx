"use client";

import React from "react";
import NextImage from "next/image";
import type { BlockInstance } from "../../../types/page-builder";
import type { GsapAnimationConfig } from "@/features/gsap";
import { GsapAnimationWrapper } from "../GsapAnimationWrapper";
import { getBlockTypographyStyles } from "../theme-styles";
import { APP_EMBED_OPTIONS, type AppEmbedId } from "@/features/app-embeds/lib/constants";
import { useMediaStyles } from "../media-styles-context";

// ---------------------------------------------------------------------------
// Render a single element block to real HTML
// ---------------------------------------------------------------------------

interface FrontendBlockRendererProps {
  block: BlockInstance;
}

export function FrontendBlockRenderer({ block }: FrontendBlockRendererProps): React.ReactNode {
  const animConfig = block.settings["gsapAnimation"] as GsapAnimationConfig | undefined;
  const mediaStyles = useMediaStyles();
  const content = renderBlockContent(block, mediaStyles);

  if (!content) return null;

  return (
    <GsapAnimationWrapper config={animConfig}>
      {content}
    </GsapAnimationWrapper>
  );
}

function renderBlockContent(block: BlockInstance, mediaStyles: React.CSSProperties | null): React.ReactNode {
  switch (block.type) {
    case "Heading":
      return <HeadingBlock settings={block.settings} />;
    case "Text":
      return <TextBlock settings={block.settings} />;
    case "TextElement":
      return <TextElementBlock settings={block.settings} />;
    case "Announcement":
      return <AnnouncementBlock settings={block.settings} />;
    case "Button":
      return <ButtonBlock settings={block.settings} />;
    case "RichText":
      return <RichTextBlock settings={block.settings} />;
    case "Image":
      return <ImageBlock settings={block.settings} mediaStyles={mediaStyles} />;
    case "VideoEmbed":
      return <VideoEmbedBlock settings={block.settings} mediaStyles={mediaStyles} />;
    case "Divider":
      return <DividerBlock settings={block.settings} />;
    case "SocialLinks":
      return <SocialLinksBlock settings={block.settings} />;
    case "Icon":
      return <IconBlock settings={block.settings} />;
    case "AppEmbed":
      return <AppEmbedBlock settings={block.settings} />;
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Individual block components
// ---------------------------------------------------------------------------

function HeadingBlock({ settings }: { settings: Record<string, unknown> }): React.ReactNode {
  const text = (settings["headingText"] as string) || "Heading";
  const size = (settings["headingSize"] as string) || "medium";
  const typoStyles = getBlockTypographyStyles(settings);

  if (size === "small") {
    return <h3 className="text-xl font-bold leading-tight tracking-tight md:text-2xl" style={typoStyles}>{text}</h3>;
  }
  if (size === "large") {
    return <h2 className="text-3xl font-bold leading-tight tracking-tight md:text-5xl" style={typoStyles}>{text}</h2>;
  }
  // medium
  return <h2 className="text-2xl font-bold leading-tight tracking-tight md:text-3xl" style={typoStyles}>{text}</h2>;
}

function TextBlock({ settings }: { settings: Record<string, unknown> }): React.ReactNode {
  const text = (settings["textContent"] as string) || "";
  if (!text) return null;
  const typoStyles = getBlockTypographyStyles(settings);
  return <p className="text-base leading-relaxed text-gray-300 md:text-lg" style={typoStyles}>{text}</p>;
}

function TextElementBlock({ settings }: { settings: Record<string, unknown> }): React.ReactNode {
  const text = (settings["textContent"] as string) || "";
  if (!text) return null;
  const typoStyles = getBlockTypographyStyles(settings);
  return <p className="text-base leading-relaxed text-gray-200" style={typoStyles}>{text}</p>;
}

function AnnouncementBlock({ settings }: { settings: Record<string, unknown> }): React.ReactNode {
  const text = (settings["text"] as string) || "";
  const link = (settings["link"] as string) || "";
  if (!text) return null;
  const typoStyles = getBlockTypographyStyles(settings);

  if (link) {
    return (
      <a
        href={link}
        className="text-sm font-medium text-blue-200 underline decoration-blue-400/50 hover:text-blue-100"
        style={typoStyles}
      >
        {text}
      </a>
    );
  }

  return (
    <span className="text-sm text-gray-200" style={typoStyles}>
      {text}
    </span>
  );
}

function ButtonBlock({ settings }: { settings: Record<string, unknown> }): React.ReactNode {
  const label = (settings["buttonLabel"] as string) || "Button";
  const link = (settings["buttonLink"] as string) || "#";
  const style = (settings["buttonStyle"] as string) || "solid";

  const baseClasses = "cms-hover-button inline-block rounded-md px-6 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";

  const customStyles: React.CSSProperties = {};
  const fontFamily = settings["fontFamily"] as string | undefined;
  const fontSize = settings["fontSize"] as number | undefined;
  const fontWeight = settings["fontWeight"] as string | undefined;
  const textColor = settings["textColor"] as string | undefined;
  const bgColor = settings["bgColor"] as string | undefined;
  const borderColor = settings["borderColor"] as string | undefined;
  const borderRadius = settings["borderRadius"] as number | undefined;
  const borderWidth = settings["borderWidth"] as number | undefined;

  if (fontFamily) customStyles.fontFamily = fontFamily;
  if (fontSize && fontSize > 0) customStyles.fontSize = `${fontSize}px`;
  if (fontWeight) customStyles.fontWeight = fontWeight;
  if (textColor) customStyles.color = textColor;
  if (bgColor) customStyles.backgroundColor = bgColor;
  if (borderColor) customStyles.borderColor = borderColor;
  if (borderRadius && borderRadius > 0) customStyles.borderRadius = `${borderRadius}px`;
  if (borderWidth && borderWidth > 0) customStyles.borderWidth = `${borderWidth}px`;

  if (style === "outline") {
    return (
      <a
        href={link}
        className={`${baseClasses} border-2 border-white text-white hover:bg-white hover:text-gray-900 focus:ring-white`}
        style={customStyles}
      >
        {label}
      </a>
    );
  }

  return (
    <a
      href={link}
      className={`${baseClasses} bg-white text-gray-900 hover:bg-gray-200 focus:ring-white`}
      style={customStyles}
    >
      {label}
    </a>
  );
}

function RichTextBlock({ settings }: { settings: Record<string, unknown> }): React.ReactNode {
  // RichText currently stores no editable text content, just renders as a placeholder area
  const colorScheme = (settings["colorScheme"] as string) || "scheme-1";
  return (
    <div
      className="rounded-lg p-4 text-gray-400"
      data-color-scheme={colorScheme}
    >
      <p className="text-sm italic">Rich text content area</p>
    </div>
  );
}

function ImageBlock({
  settings,
  mediaStyles,
}: {
  settings: Record<string, unknown>;
  mediaStyles: React.CSSProperties | null;
}): React.ReactNode {
  const src = (settings["src"] as string) || "";
  const alt = (settings["alt"] as string) || "";
  const width = (settings["width"] as number) || 100;
  const borderRadius = (settings["borderRadius"] as number) || 0;
  const resolvedStyles: React.CSSProperties = {
    ...(mediaStyles ?? {}),
    ...(borderRadius > 0 ? { borderRadius: `${borderRadius}px` } : {}),
  };

  if (!src) {
    return (
      <div
        className="cms-media flex items-center justify-center bg-gray-800/50 py-8 text-gray-500 text-sm"
        style={{ width: `${width}%`, ...resolvedStyles }}
      >
        No image selected
      </div>
    );
  }

  return (
    <div className="cms-media" style={{ width: `${width}%`, ...resolvedStyles }}>
      <NextImage
        src={src}
        alt={alt}
        width={800}
        height={600}
        className="h-auto w-full"
      />
    </div>
  );
}

function VideoEmbedBlock({
  settings,
  mediaStyles,
}: {
  settings: Record<string, unknown>;
  mediaStyles: React.CSSProperties | null;
}): React.ReactNode {
  const url = (settings["url"] as string) || "";
  const aspectRatio = (settings["aspectRatio"] as string) || "16:9";
  const autoplay = (settings["autoplay"] as string) === "yes";

  let embedUrl: string | null = null;
  if (url) {
    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?#]+)/);
    if (ytMatch) embedUrl = `https://www.youtube.com/embed/${ytMatch[1]}`;
    else {
      const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
      if (vimeoMatch) embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}`;
      else if (url.includes("embed") || url.includes("player")) embedUrl = url;
    }
  }

  const paddingBottom = aspectRatio === "4:3" ? "75%" : aspectRatio === "1:1" ? "100%" : "56.25%";

  const resolvedStyles: React.CSSProperties = {
    ...(mediaStyles ?? {}),
    paddingBottom,
  };

  if (!embedUrl) {
    return (
      <div className="cms-media flex items-center justify-center bg-gray-800/50 py-8 text-gray-500 text-sm" style={resolvedStyles}>
        Enter a video URL
      </div>
    );
  }

  return (
    <div className="cms-media relative w-full" style={resolvedStyles}>
      <iframe
        className="absolute inset-0 h-full w-full"
        src={`${embedUrl}${autoplay ? "?autoplay=1&mute=1" : ""}`}
        title="Embedded video"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}

function DividerBlock({ settings }: { settings: Record<string, unknown> }): React.ReactNode {
  const style = (settings["dividerStyle"] as string) || "solid";
  const thickness = (settings["thickness"] as number) || 1;
  const color = (settings["dividerColor"] as string) || "#4b5563";

  return <hr className="my-2 border-0" style={{ borderTopStyle: style as "solid" | "dashed" | "dotted", borderTopWidth: `${thickness}px`, borderTopColor: color }} />;
}

function SocialLinksBlock({ settings }: { settings: Record<string, unknown> }): React.ReactNode {
  const platforms = (settings["platforms"] as string) || "";
  const links = platforms.split(",").map((l: string) => l.trim()).filter(Boolean);

  if (links.length === 0) {
    return <p className="text-sm text-gray-500">Add social media URLs in settings</p>;
  }

  return (
    <div className="flex items-center gap-4">
      {links.map((link: string, idx: number) => {
        let label = "Link";
        try {
          label = new URL(link).hostname.replace("www.", "").split(".")[0] ?? "Link";
        } catch {
          // keep default
        }
        return (
          <a
            key={idx}
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-gray-600 p-2 text-gray-400 transition hover:text-white hover:border-white"
          >
            <span className="text-xs font-medium uppercase">{label.slice(0, 2)}</span>
          </a>
        );
      })}
    </div>
  );
}

function IconBlock({ settings }: { settings: Record<string, unknown> }): React.ReactNode {
  const iconName = (settings["iconName"] as string) || "Star";
  const iconSize = (settings["iconSize"] as number) || 24;
  const iconColor = (settings["iconColor"] as string) || "#ffffff";

  return (
    <div className="flex items-center justify-center">
      <span style={{ fontSize: `${iconSize}px`, color: iconColor }} role="img" aria-label={iconName}>
        {iconName === "Star" ? "★" : iconName === "Heart" ? "♥" : iconName === "Check" ? "✓" : iconName === "Arrow" ? "→" : "●"}
      </span>
    </div>
  );
}

function AppEmbedBlock({ settings }: { settings: Record<string, unknown> }): React.ReactNode {
  const appId = (settings["appId"] as AppEmbedId) || "chatbot";
  const title = (settings["title"] as string) || "";
  const embedUrl = (settings["embedUrl"] as string) || "";
  const height = (settings["height"] as number) || 420;
  const appLabel = APP_EMBED_OPTIONS.find((option: { id: AppEmbedId; label: string }) => option.id === appId)?.label ?? "App";

  return (
    <div className="cms-hover-card w-full rounded-lg border border-border/40 bg-gray-900/40 p-4">
      <div className="mb-3">
        <div className="text-sm font-semibold text-white">{title || appLabel}</div>
        <div className="text-[10px] uppercase tracking-wide text-gray-500">App embed</div>
      </div>
      {embedUrl ? (
        <iframe
          src={embedUrl}
          title={title || appLabel}
          className="w-full rounded-md border border-border/40 bg-black"
          style={{ height }}
        />
      ) : (
        <div
          className="flex items-center justify-center rounded-md border border-dashed border-border/40 bg-gray-800/40 text-xs text-gray-400"
          style={{ height }}
        >
          Provide an embed URL to render the {appLabel} app here.
        </div>
      )}
    </div>
  );
}
