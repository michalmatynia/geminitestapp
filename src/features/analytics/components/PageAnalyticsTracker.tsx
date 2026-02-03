"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { AnalyticsEventCreateInput, AnalyticsScope } from "@/shared/types";

const VISITOR_COOKIE = "pa_vid";
const SESSION_STORAGE_KEY = "pa_sid";

const readCookie = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split(";").map((part: string) => part.trim());
  const match = parts.find((part: string) => part.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.slice(name.length + 1));
};

const setCookie = (name: string, value: string, days: number): void => {
  if (typeof document === "undefined") return;
  const maxAgeSeconds = Math.floor(days * 24 * 60 * 60);
  document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax`;
};

const generateId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
};

const getOrCreateVisitorId = (): string => {
  const existing = readCookie(VISITOR_COOKIE);
  if (existing) return existing;
  const created = generateId();
  setCookie(VISITOR_COOKIE, created, 180);
  return created;
};

const getOrCreateSessionId = (): string => {
  if (typeof sessionStorage === "undefined") return generateId();
  const existing = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) return existing;
  const created = generateId();
  sessionStorage.setItem(SESSION_STORAGE_KEY, created);
  return created;
};

const getScopeFromPathname = (pathname: string): AnalyticsScope =>
  pathname.startsWith("/admin") ? "admin" : "public";

const getTimeZone = (): string | null => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
};

const getConnectionInfo = (): AnalyticsEventCreateInput["connection"] => {
  const nav = navigator as Navigator & {
    connection?: {
      effectiveType?: string;
      downlink?: number;
      rtt?: number;
      saveData?: boolean;
    };
  };
  if (!nav.connection) return null;
  return {
    effectiveType: nav.connection.effectiveType ?? null,
    downlink: typeof nav.connection.downlink === "number" ? nav.connection.downlink : null,
    rtt: typeof nav.connection.rtt === "number" ? nav.connection.rtt : null,
    saveData: typeof nav.connection.saveData === "boolean" ? nav.connection.saveData : null,
  };
};

const getUtm = (searchParams: URLSearchParams): AnalyticsEventCreateInput["utm"] => {
  const utm: Record<string, string> = {};
  const source = searchParams.get("utm_source");
  const medium = searchParams.get("utm_medium");
  const campaign = searchParams.get("utm_campaign");
  const term = searchParams.get("utm_term");
  const content = searchParams.get("utm_content");
  if (source) utm.source = source;
  if (medium) utm.medium = medium;
  if (campaign) utm.campaign = campaign;
  if (term) utm.term = term;
  if (content) utm.content = content;
  return Object.keys(utm).length > 0 ? (utm as AnalyticsEventCreateInput["utm"]) : null;
};

const sendAnalyticsEvent = async (payload: AnalyticsEventCreateInput): Promise<void> => {
  const body = JSON.stringify(payload);

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" });
    const ok = navigator.sendBeacon("/api/analytics/events", blob);
    if (ok) return;
  }

  await fetch("/api/analytics/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    credentials: "include",
    keepalive: true,
  }).catch(() => {
    // Intentionally swallow errors; analytics must never break UX.
  });
};

export default function PageAnalyticsTracker(): null {
  const pathname = usePathname() ?? "";
  const searchParams = useSearchParams();
  const search = useMemo(() => searchParams.toString(), [searchParams]);

  useEffect(() => {
    if (!pathname) return;

    const visitorId = getOrCreateVisitorId();
    const sessionId = getOrCreateSessionId();
    const scope = getScopeFromPathname(pathname);

    const url = typeof window !== "undefined" ? window.location.href : null;
    const title = typeof document !== "undefined" ? document.title : null;
    const referrer = typeof document !== "undefined" ? document.referrer || null : null;
    const language = typeof navigator !== "undefined" ? navigator.language || null : null;
    const languages =
      typeof navigator !== "undefined" && navigator.languages
        ? [...navigator.languages]
        : null;
    const timeZone = getTimeZone();

    const viewport =
      typeof window !== "undefined"
        ? { width: window.innerWidth, height: window.innerHeight }
        : null;

    const screen =
      typeof window !== "undefined"
        ? {
            width: window.screen?.width ?? 0,
            height: window.screen?.height ?? 0,
            dpr: window.devicePixelRatio ?? 1,
          }
        : null;

    const clientTs = new Date().toISOString();

    const queryString = search ? `?${search}` : null;
    const utm = getUtm(new URLSearchParams(search));
    const connection = getConnectionInfo();

    const event: AnalyticsEventCreateInput = {
      type: "pageview",
      scope,
      path: pathname,
      visitorId,
      sessionId,
      ...(queryString ? { search: queryString } : {}),
      ...(url ? { url } : {}),
      ...(title ? { title } : {}),
      ...(referrer ? { referrer } : {}),
      ...(utm ? { utm } : {}),
      ...(language ? { language } : {}),
      ...(languages ? { languages } : {}),
      ...(timeZone ? { timeZone } : {}),
      ...(viewport ? { viewport } : {}),
      ...(screen ? { screen } : {}),
      ...(connection ? { connection } : {}),
      clientTs,
    };

    void sendAnalyticsEvent(event);
  }, [pathname, search]);

  return null;
}
