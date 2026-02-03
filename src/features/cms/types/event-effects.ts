export type CmsHoverEffect = "none" | "lift" | "lift-3d" | "scale" | "glow";

export type CmsClickAction = "none" | "navigate" | "scroll";

export type CmsClickTarget = "_self" | "_blank";

export type CmsScrollBehavior = "smooth" | "auto";

export type CmsEventEffectsConfig = {
  hoverEffect: CmsHoverEffect;
  hoverScale: number;
  clickAction: CmsClickAction;
  clickUrl: string;
  clickTarget: CmsClickTarget;
  clickScrollTarget: string;
  clickScrollBehavior: CmsScrollBehavior;
};
