"use client";


import type { BlockInstance } from "../../../types/page-builder";
import type { GsapAnimationConfig } from "@/features/gsap";
import type { CssAnimationConfig } from "@/features/cms/types/css-animations";
import { GsapAnimationWrapper } from "../GsapAnimationWrapper";
import { CssAnimationWrapper } from "../CssAnimationWrapper";
import { getBlockTypographyStyles } from "../theme-styles";
import { APP_EMBED_OPTIONS, type AppEmbedId } from "@/features/app-embeds/lib/constants";
import { useMediaStyles } from "../media-styles-context";
import { Viewer3D, type EnvironmentPreset, type LightingPreset } from "@/features/viewer3d";
import { EventEffectsWrapper } from "@/features/cms/components/shared/EventEffectsWrapper";
import Image from "next/image";

// ---------------------------------------------------------------------------
// Render a single element block to real HTML
// ---------------------------------------------------------------------------

interface FrontendBlockRendererProps {
  block: BlockInstance;
  stretch?: boolean;
}

export function FrontendBlockRenderer({ block, stretch = false }: FrontendBlockRendererProps): React.ReactNode {
  const animConfig = block.settings["gsapAnimation"] as GsapAnimationConfig | undefined;
  const cssAnimConfig = block.settings["cssAnimation"] as CssAnimationConfig | undefined;
  const mediaStyles = useMediaStyles();
  const content = renderBlockContent(block, mediaStyles, stretch);

  if (!content) return null;

  return (
    <GsapAnimationWrapper config={animConfig}>
      <CssAnimationWrapper config={cssAnimConfig}>
        <EventEffectsWrapper
          settings={block.settings}
          nodeId={block.id}
          customCss={block.settings["customCss"]}
        >
          {content}
        </EventEffectsWrapper>
      </CssAnimationWrapper>
    </GsapAnimationWrapper>
  );
}

function renderBlockContent(
  block: BlockInstance,
  mediaStyles: React.CSSProperties | null,
  stretch: boolean = false
): React.ReactNode {
  switch (block.type) {
    case "Heading":
      return <HeadingBlock settings={block.settings} />;
    case "Text":
      return <TextBlock settings={block.settings} />;
    case "TextElement":
      return <TextElementBlock settings={block.settings} />;
    case "TextAtom":
      return <TextAtomBlock block={block} />;
    case "TextAtomLetter":
      return <TextAtomLetterBlock settings={block.settings} />;
    case "Announcement":
      return <AnnouncementBlock settings={block.settings} />;
    case "Button":
      return <ButtonBlock settings={block.settings} />;
    case "RichText":
      return <RichTextBlock settings={block.settings} />;
    case "ImageElement":
      return <ImageElementBlock settings={block.settings} mediaStyles={mediaStyles} stretch={stretch} />;
    case "Image":
      return <ImageBlock settings={block.settings} mediaStyles={mediaStyles} stretch={stretch} />;
    case "Model3D":
      return <Model3DBlock settings={block.settings} />;
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
  return <p className="m-0 p-0 text-base leading-relaxed text-gray-200" style={typoStyles}>{text}</p>;
}

function TextAtomBlock({ block }: { block: BlockInstance }): React.ReactNode {
  const text = (block.settings["text"] as string) || "";
  const alignment = (block.settings["alignment"] as string) || "left";
  const letterGap = (block.settings["letterGap"] as number) || 0;
  const lineGap = (block.settings["lineGap"] as number) || 0;
  const wrap = (block.settings["wrap"] as string) || "wrap";
  const letters = (block.blocks ?? []).length
    ? (block.blocks ?? [])
    : Array.from(text).map((char: string, index: number): BlockInstance => ({
        id: `text-atom-${block.id}-${index}`,
        type: "TextAtomLetter",
        settings: { textContent: char },
      }));

  if (!letters.length) return null;

  const justifyContent =
    alignment === "center"
      ? "center"
      : alignment === "right"
        ? "flex-end"
        : "flex-start";

  const containerStyle: React.CSSProperties = {
    display: "flex",
    flexWrap: wrap === "nowrap" ? "nowrap" : "wrap",
    justifyContent,
    alignItems: "baseline",
    columnGap: letterGap,
    rowGap: lineGap,
    whiteSpace: wrap === "nowrap" ? "pre" : "pre-wrap",
  };

  return (
    <div style={containerStyle}>
      {letters.map((letter: BlockInstance) => (
        <FrontendBlockRenderer key={letter.id} block={letter} />
      ))}
    </div>
  );
}

function TextAtomLetterBlock({ settings }: { settings: Record<string, unknown> }): React.ReactNode {
  const text = (settings["textContent"] as string) ?? "";
  const typoStyles = getBlockTypographyStyles(settings);
  return (
    <span className="inline-block" style={{ ...typoStyles, whiteSpace: "pre" }}>
      {text}
    </span>
  );
}

const toNumber = (value: unknown, fallback: number): number =>
  typeof value === "number" && Number.isFinite(value) ? value : fallback;

const toBoolean = (value: unknown, fallback: boolean): boolean => {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return fallback;
};

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

function Model3DBlock({ settings }: { settings: Record<string, unknown> }): React.ReactNode {
  const assetId = (settings["assetId"] as string) || "";
  if (!assetId) return null;

  const height = toNumber(settings["height"], 360);
  const backgroundColor = (settings["backgroundColor"] as string) || "#111827";
  const autoRotate = toBoolean(settings["autoRotate"], true);
  const autoRotateSpeed = toNumber(settings["autoRotateSpeed"], 2);
  const environment = (settings["environment"] as EnvironmentPreset) || "studio";
  const lighting = (settings["lighting"] as LightingPreset) || "studio";
  const lightIntensity = toNumber(settings["lightIntensity"], 1);
  const enableShadows = toBoolean(settings["enableShadows"], true);
  const enableBloom = toBoolean(settings["enableBloom"], false);
  const bloomIntensity = toNumber(settings["bloomIntensity"], 0.5);
  const exposure = toNumber(settings["exposure"], 1);
  const showGround = toBoolean(settings["showGround"], false);
  const enableContactShadows = toBoolean(settings["enableContactShadows"], true);
  const enableVignette = toBoolean(settings["enableVignette"], false);
  const autoFit = toBoolean(settings["autoFit"], true);
  const presentationMode = toBoolean(settings["presentationMode"], false);
  const position = [
    toNumber(settings["positionX"], 0),
    toNumber(settings["positionY"], 0),
    toNumber(settings["positionZ"], 0),
  ] as [number, number, number];
  const rotation = [
    toRadians(toNumber(settings["rotationX"], 0)),
    toRadians(toNumber(settings["rotationY"], 0)),
    toRadians(toNumber(settings["rotationZ"], 0)),
  ] as [number, number, number];
  const scale = toNumber(settings["scale"], 1);
  const modelUrl = `/api/assets3d/${assetId}/file`;

  return (
    <div className="w-full" style={{ height: `${Math.max(120, height)}px` }}>
      <Viewer3D
        modelUrl={modelUrl}
        backgroundColor={backgroundColor}
        autoRotate={autoRotate}
        autoRotateSpeed={autoRotateSpeed}
        environment={environment}
        lighting={lighting}
        lightIntensity={lightIntensity}
        enableShadows={enableShadows}
        enableBloom={enableBloom}
        bloomIntensity={bloomIntensity}
        exposure={exposure}
        showGround={showGround}
        enableContactShadows={enableContactShadows}
        enableVignette={enableVignette}
        autoFit={autoFit}
        presentationMode={presentationMode}
        allowUserControls={false}
        modelPosition={position}
        modelRotation={rotation}
        modelScale={scale}
        className="h-full w-full"
      />
    </div>
  );
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

function ImageElementBlock({
  settings,
  mediaStyles,
  stretch = false,
}: {
  settings: Record<string, unknown>;
  mediaStyles: React.CSSProperties | null;
  stretch?: boolean;
}): React.ReactNode {
  const src = (settings["src"] as string) || "";
  const alt = (settings["alt"] as string) || "Image";
  const width = (settings["width"] as number) || 100;
  const height = (settings["height"] as number) || 0;
  const aspectRatio = (settings["aspectRatio"] as string) || "auto";
  const objectFit = (settings["objectFit"] as React.CSSProperties["objectFit"]) || "cover";
  const objectPosition = resolveObjectPosition((settings["objectPosition"] as string) || "center");
  const opacity = clampNumber(settings["opacity"], 0, 100, 100);
  const blur = clampNumber(settings["blur"], 0, 20, 0);
  const grayscale = clampNumber(settings["grayscale"], 0, 100, 0);
  const brightness = clampNumber(settings["brightness"], 0, 200, 100);
  const contrast = clampNumber(settings["contrast"], 0, 200, 100);
  const scale = clampNumber(settings["scale"], 50, 200, 100);
  const rotate = clampNumber(settings["rotate"], -180, 180, 0);
  const shape = (settings["shape"] as string) || "none";
  const borderRadius = (settings["borderRadius"] as number) || 0;
  const borderWidth = (settings["borderWidth"] as number) || 0;
  const borderStyle = (settings["borderStyle"] as string) || "solid";
  const borderColor = (settings["borderColor"] as string) || "#ffffff";
  const overlayType = (settings["overlayType"] as string) || "none";
  const overlayColor = (settings["overlayColor"] as string) || "#000000";
  const overlayOpacity = clampNumber(settings["overlayOpacity"], 0, 100, 0) / 100;
  const overlayGradientFrom = (settings["overlayGradientFrom"] as string) || "#000000";
  const overlayGradientTo = (settings["overlayGradientTo"] as string) || "#ffffff";
  const overlayGradientDirection = (settings["overlayGradientDirection"] as string) || "to-bottom";
  const transparencyMode = (settings["transparencyMode"] as string) || "none";
  const transparencyDirection = (settings["transparencyDirection"] as string) || "bottom";
  const transparencyStrength = clampNumber(settings["transparencyStrength"], 0, 100, 0);
  const clipOverflow = toBoolean(settings["clipOverflow"], false);

  const wrapperStyles: React.CSSProperties = {
    ...(mediaStyles ?? {}),
    width: `${width}%`,
  };
  if (height > 0) wrapperStyles.height = `${height}px`;
  if (aspectRatio !== "auto") wrapperStyles.aspectRatio = aspectRatio;
  if (stretch) wrapperStyles.height = "100%";
  if (borderWidth > 0 && borderStyle !== "none") {
    wrapperStyles.borderWidth = `${borderWidth}px`;
    wrapperStyles.borderStyle = borderStyle;
    wrapperStyles.borderColor = borderColor;
  }
  if (shape === "circle") {
    wrapperStyles.borderRadius = "9999px";
    wrapperStyles.overflow = "hidden";
  } else if (shape === "rounded" && borderRadius > 0) {
    wrapperStyles.borderRadius = `${borderRadius}px`;
    wrapperStyles.overflow = "hidden";
  }
  if (clipOverflow) {
    wrapperStyles.overflow = "hidden";
  }

  const shadow = settings["imageShadow"] as Record<string, unknown> | undefined;
  if (shadow) {
    const x = (shadow.x as number) ?? 0;
    const y = (shadow.y as number) ?? 0;
    const blurShadow = (shadow.blur as number) ?? 0;
    const spread = (shadow.spread as number) ?? 0;
    const color = shadow.color as string | undefined;
    if ((x || y || blurShadow || spread) && color) {
      wrapperStyles.boxShadow = `${x}px ${y}px ${blurShadow}px ${spread}px ${color}`;
    }
  }

  Object.assign(wrapperStyles, buildTransparencyMaskStyles(transparencyMode, transparencyDirection, transparencyStrength));

  const filters: string[] = [];
  if (blur > 0) filters.push(`blur(${blur}px)`);
  if (grayscale > 0) filters.push(`grayscale(${grayscale / 100})`);
  if (brightness !== 100) filters.push(`brightness(${brightness / 100})`);
  if (contrast !== 100) filters.push(`contrast(${contrast / 100})`);

  const transforms: string[] = [];
  if (scale !== 100) transforms.push(`scale(${scale / 100})`);
  if (rotate !== 0) transforms.push(`rotate(${rotate}deg)`);

  const imageStyles: React.CSSProperties = {
    width: "100%",
    maxHeight: "100%",
    objectFit,
    objectPosition,
    opacity: opacity / 100,
    filter: filters.length ? filters.join(" ") : undefined,
    transform: transforms.length ? transforms.join(" ") : undefined,
    display: "block",
  };

  const overlayStyles: React.CSSProperties = {};
  if (overlayType === "solid") {
    overlayStyles.backgroundColor = overlayColor;
    overlayStyles.opacity = overlayOpacity;
  } else if (overlayType === "gradient") {
    overlayStyles.backgroundImage = `linear-gradient(${resolveGradientDirection(overlayGradientDirection)}, ${overlayGradientFrom}, ${overlayGradientTo})`;
    overlayStyles.opacity = overlayOpacity;
  }
  if (wrapperStyles.borderRadius) {
    overlayStyles.borderRadius = wrapperStyles.borderRadius as string;
  }

  if (!src) {
    return (
      <div
        className="cms-media flex items-center justify-center bg-gray-800/50 py-8 text-gray-500 text-sm"
        style={wrapperStyles}
      >
        No image selected
      </div>
    );
  }

  return (
    <div className="relative" style={wrapperStyles}>
      <Image
        src={src}
        alt={alt}
        fill
        style={imageStyles}
      />
      {overlayType !== "none" && (
        <div className="pointer-events-none absolute inset-0" style={overlayStyles} />
      )}
    </div>
  );
}

function ImageBlock({
  settings,
  mediaStyles,
  stretch = false,
}: {
  settings: Record<string, unknown>;
  mediaStyles: React.CSSProperties | null;
  stretch?: boolean;
}): React.ReactNode {
  const src = (settings["src"] as string) || "";
  const alt = (settings["alt"] as string) || "";
  const width = (settings["width"] as number) || 100;
  const borderRadius = (settings["borderRadius"] as number) || 0;
  const clipOverflow = toBoolean(settings["clipOverflow"], false);
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

  const wrapperStyles: React.CSSProperties = {
    width: `${width}%`,
    ...(stretch ? { height: "100%" } : {}),
    ...resolvedStyles,
    ...(clipOverflow ? { overflow: "hidden" } : {}),
  };
  const imageClassName = stretch
    ? "block h-full w-full object-cover"
    : "block h-auto w-full max-h-full object-cover";

  return (
    <div className="cms-media" style={wrapperStyles}>
      <Image src={src} alt={alt} fill className={imageClassName} />
    </div>
  );
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function resolveObjectPosition(value: string): string {
  const map: Record<string, string> = {
    center: "center",
    top: "top",
    bottom: "bottom",
    left: "left",
    right: "right",
    "top-left": "left top",
    "top-right": "right top",
    "bottom-left": "left bottom",
    "bottom-right": "right bottom",
  };
  return map[value] ?? "center";
}

function resolveGradientDirection(value: string): string {
  const map: Record<string, string> = {
    "to-top": "to top",
    "to-bottom": "to bottom",
    "to-left": "to left",
    "to-right": "to right",
    "to-top-left": "to top left",
    "to-top-right": "to top right",
    "to-bottom-left": "to bottom left",
    "to-bottom-right": "to bottom right",
  };
  return map[value] ?? "to bottom";
}

function buildTransparencyMaskStyles(
  mode: string,
  direction: string,
  strength: number
): React.CSSProperties {
  if (mode !== "gradient" || strength <= 0) return {};
  const dirMap: Record<string, string> = {
    top: "to bottom",
    bottom: "to top",
    left: "to right",
    right: "to left",
    "top-left": "to bottom right",
    "top-right": "to bottom left",
    "bottom-left": "to top right",
    "bottom-right": "to top left",
  };
  const dir = dirMap[direction] ?? "to bottom";
  const stop = Math.min(100, Math.max(0, strength));
  const gradient = `linear-gradient(${dir}, rgba(0,0,0,0) 0%, rgba(0,0,0,1) ${stop}%, rgba(0,0,0,1) 100%)`;
  return {
    maskImage: gradient,
    WebkitMaskImage: gradient,
  };
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
