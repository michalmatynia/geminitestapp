"use client";

import { AppModal, Button, Label } from "@/shared/ui";
import { Viewer3D, type LightingPreset, type EnvironmentPreset } from "./Viewer3D";
import {
  Download,
  X,
  Sun,
  Moon,
  Sparkles,
  RotateCcw,
  Settings2,
  ChevronDown,
  ChevronUp,
  Eye,
  Layers,
} from "lucide-react";
import { useState } from "react";
import type { Asset3DRecord } from "../types";
import { cn } from "@/shared/utils";

interface Asset3DPreviewModalProps {
  open: boolean;
  onClose: () => void;
  asset: Asset3DRecord;
}

const environmentPresets: { value: EnvironmentPreset; label: string }[] = [
  { value: "studio", label: "Studio" },
  { value: "sunset", label: "Sunset" },
  { value: "dawn", label: "Dawn" },
  { value: "night", label: "Night" },
  { value: "warehouse", label: "Warehouse" },
  { value: "forest", label: "Forest" },
  { value: "apartment", label: "Apartment" },
  { value: "city", label: "City" },
  { value: "park", label: "Park" },
  { value: "lobby", label: "Lobby" },
];

const lightingPresets: { value: LightingPreset; label: string; icon: React.ReactNode }[] = [
  { value: "studio", label: "Studio", icon: <Sun className="h-4 w-4" /> },
  { value: "outdoor", label: "Outdoor", icon: <Sun className="h-4 w-4" /> },
  { value: "dramatic", label: "Dramatic", icon: <Moon className="h-4 w-4" /> },
  { value: "soft", label: "Soft", icon: <Sparkles className="h-4 w-4" /> },
];

const orderedDitheringPresets = {
  balanced: {
    label: "Balanced",
    gridSize: 4,
    pixelSizeRatio: 1,
    grayscaleOnly: false,
    invertColor: false,
    luminanceMethod: 1,
  },
  fineMono: {
    label: "Fine Mono",
    gridSize: 3,
    pixelSizeRatio: 0.9,
    grayscaleOnly: true,
    invertColor: false,
    luminanceMethod: 1,
  },
  chunkyMono: {
    label: "Chunky Mono",
    gridSize: 6,
    pixelSizeRatio: 1.6,
    grayscaleOnly: true,
    invertColor: false,
    luminanceMethod: 1,
  },
  inverted: {
    label: "Inverted",
    gridSize: 4,
    pixelSizeRatio: 1,
    grayscaleOnly: false,
    invertColor: true,
    luminanceMethod: 1,
  },
} as const;

type OrderedDitheringPresetKey = keyof typeof orderedDitheringPresets;

const orderedDitheringLuminanceOptions = [
  { value: 0, label: "Average" },
  { value: 1, label: "Rec. 601" },
  { value: 2, label: "Rec. 709" },
  { value: 3, label: "Max Channel" },
];

export function Asset3DPreviewModal({
  open,
  onClose,
  asset,
}: Asset3DPreviewModalProps) {
  // View settings
  const [autoRotate, setAutoRotate] = useState(true);
  const [autoRotateSpeed, setAutoRotateSpeed] = useState(2);

  // Environment & Lighting
  const [environment, setEnvironment] = useState<EnvironmentPreset>("studio");
  const [lighting, setLighting] = useState<LightingPreset>("studio");
  const [lightIntensity, setLightIntensity] = useState(1);

  // Rendering
  const [enableShadows, setEnableShadows] = useState(true);
  const [enableContactShadows, setEnableContactShadows] = useState(true);
  const [showGround, setShowGround] = useState(false);

  // Post-processing
  const [enableBloom, setEnableBloom] = useState(false);
  const [bloomIntensity, setBloomIntensity] = useState(0.5);
  const [enableVignette, setEnableVignette] = useState(false);
  const [enableToneMapping, setEnableToneMapping] = useState(true);
  const [exposure, setExposure] = useState(1);

  // Dithering (special effect)
  const [enableDithering, setEnableDithering] = useState(false);
  const [ditheringIntensity, setDitheringIntensity] = useState(1.0);

  // Pixelation (pixel art effect)
  const [enablePixelation, setEnablePixelation] = useState(false);
  const [pixelSize, setPixelSize] = useState(6);

  // Ordered dithering shader
  const [enableOrderedDithering, setEnableOrderedDithering] = useState(false);
  const [orderedDitheringGridSize, setOrderedDitheringGridSize] = useState(4);
  const [orderedDitheringPixelSizeRatio, setOrderedDitheringPixelSizeRatio] = useState(1);
  const [orderedDitheringGrayscaleOnly, setOrderedDitheringGrayscaleOnly] = useState(false);
  const [orderedDitheringInvertColor, setOrderedDitheringInvertColor] = useState(false);
  const [orderedDitheringLuminanceMethod, setOrderedDitheringLuminanceMethod] = useState(1);
  const [orderedDitheringPreset, setOrderedDitheringPreset] = useState<
    OrderedDitheringPresetKey | "custom"
  >("balanced");

  // Background
  const [backgroundColor, setBackgroundColor] = useState("#1a1a2e");

  // UI State
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<"environment" | "effects" | "view">("environment");

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  };

  const applyOrderedDitheringPreset = (preset: OrderedDitheringPresetKey) => {
    const config = orderedDitheringPresets[preset];
    setOrderedDitheringGridSize(config.gridSize);
    setOrderedDitheringPixelSizeRatio(config.pixelSizeRatio);
    setOrderedDitheringGrayscaleOnly(config.grayscaleOnly);
    setOrderedDitheringInvertColor(config.invertColor);
    setOrderedDitheringLuminanceMethod(config.luminanceMethod);
  };

  const resetSettings = () => {
    setAutoRotate(true);
    setAutoRotateSpeed(2);
    setEnvironment("studio");
    setLighting("studio");
    setLightIntensity(1);
    setEnableShadows(true);
    setEnableContactShadows(true);
    setShowGround(false);
    setEnableBloom(false);
    setBloomIntensity(0.5);
    setEnableVignette(false);
    setEnableToneMapping(true);
    setExposure(1);
    setEnableDithering(false);
    setDitheringIntensity(1);
    setEnablePixelation(false);
    setPixelSize(6);
    setEnableOrderedDithering(false);
    setOrderedDitheringGridSize(4);
    setOrderedDitheringPixelSizeRatio(1);
    setOrderedDitheringGrayscaleOnly(false);
    setOrderedDitheringInvertColor(false);
    setOrderedDitheringLuminanceMethod(1);
    setOrderedDitheringPreset("balanced");
    setBackgroundColor("#1a1a2e");
  };

  return (
    <AppModal open={open} onOpenChange={(o) => !o && onClose()} title={asset.filename}>
      <div className="bg-gray-900 rounded-lg shadow-2xl w-[95vw] max-w-6xl border border-gray-700 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold text-white truncate">
              {asset.name || asset.filename}
            </h2>
            <p className="text-xs text-gray-400">{formatFileSize(asset.size)}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={resetSettings}
              title="Reset settings"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant={showSettings ? "default" : "ghost"}
              size="sm"
              onClick={() => setShowSettings(!showSettings)}
            >
              <Settings2 className="h-4 w-4 mr-1" />
              Settings
              {showSettings ? (
                <ChevronUp className="h-4 w-4 ml-1" />
              ) : (
                <ChevronDown className="h-4 w-4 ml-1" />
              )}
            </Button>
            <a href={asset.filepath} download={asset.filename}>
              <Button variant="secondary" size="sm">
                <Download className="h-4 w-4 mr-1" />
                Download
              </Button>
            </a>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex flex-1 min-h-0">
          {/* Viewer */}
          <div className={cn("flex-1 bg-gray-950", showSettings ? "lg:w-2/3" : "w-full")}>
            <Viewer3D
              modelUrl={asset.filepath}
              backgroundColor={backgroundColor}
              autoRotate={autoRotate}
              autoRotateSpeed={autoRotateSpeed}
              environment={environment}
              lighting={lighting}
              lightIntensity={lightIntensity}
              enableShadows={enableShadows}
              enableContactShadows={enableContactShadows}
              showGround={showGround}
              enableBloom={enableBloom}
              bloomIntensity={bloomIntensity}
              enableVignette={enableVignette}
              enableToneMapping={enableToneMapping}
              exposure={exposure}
              enableDithering={enableDithering}
              ditheringIntensity={ditheringIntensity}
              enableOrderedDithering={enableOrderedDithering}
              orderedDitheringGridSize={orderedDitheringGridSize}
              orderedDitheringPixelSizeRatio={orderedDitheringPixelSizeRatio}
              orderedDitheringGrayscaleOnly={orderedDitheringGrayscaleOnly}
              orderedDitheringInvertColor={orderedDitheringInvertColor}
              orderedDitheringLuminanceMethod={orderedDitheringLuminanceMethod}
              enablePixelation={enablePixelation}
              pixelSize={pixelSize}
              className="w-full h-[60vh]"
            />
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <div className="w-full lg:w-1/3 border-l border-gray-700 bg-gray-900/50 overflow-y-auto">
              {/* Tabs */}
              <div className="flex border-b border-gray-700">
                <button
                  onClick={() => setActiveTab("environment")}
                  className={cn(
                    "flex-1 py-2 px-3 text-sm font-medium transition-colors",
                    activeTab === "environment"
                      ? "text-white border-b-2 border-blue-500"
                      : "text-gray-400 hover:text-white"
                  )}
                >
                  <Sun className="h-4 w-4 inline mr-1" />
                  Environment
                </button>
                <button
                  onClick={() => setActiveTab("effects")}
                  className={cn(
                    "flex-1 py-2 px-3 text-sm font-medium transition-colors",
                    activeTab === "effects"
                      ? "text-white border-b-2 border-blue-500"
                      : "text-gray-400 hover:text-white"
                  )}
                >
                  <Sparkles className="h-4 w-4 inline mr-1" />
                  Effects
                </button>
                <button
                  onClick={() => setActiveTab("view")}
                  className={cn(
                    "flex-1 py-2 px-3 text-sm font-medium transition-colors",
                    activeTab === "view"
                      ? "text-white border-b-2 border-blue-500"
                      : "text-gray-400 hover:text-white"
                  )}
                >
                  <Eye className="h-4 w-4 inline mr-1" />
                  View
                </button>
              </div>

              <div className="p-4 space-y-4">
                {/* Environment Tab */}
                {activeTab === "environment" && (
                  <>
                    {/* Environment Preset */}
                    <div>
                      <Label className="text-sm text-gray-300 mb-2 block">HDR Environment</Label>
                      <select
                        value={environment}
                        onChange={(e) => setEnvironment(e.target.value as EnvironmentPreset)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {environmentPresets.map((preset) => (
                          <option key={preset.value} value={preset.value}>
                            {preset.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Lighting Preset */}
                    <div>
                      <Label className="text-sm text-gray-300 mb-2 block">Lighting</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {lightingPresets.map((preset) => (
                          <button
                            key={preset.value}
                            onClick={() => setLighting(preset.value)}
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors",
                              lighting === preset.value
                                ? "bg-blue-600 text-white"
                                : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                            )}
                          >
                            {preset.icon}
                            {preset.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Light Intensity */}
                    <div>
                      <Label className="text-sm text-gray-300 mb-2 block">
                        Light Intensity: {lightIntensity.toFixed(1)}
                      </Label>
                      <input
                        type="range"
                        min="0.1"
                        max="3"
                        step="0.1"
                        value={lightIntensity}
                        onChange={(e) => setLightIntensity(parseFloat(e.target.value))}
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    {/* Background Color */}
                    <div>
                      <Label className="text-sm text-gray-300 mb-2 block">Background</Label>
                      <div className="flex gap-2">
                        {["#1a1a2e", "#0a0a0f", "#1f1f1f", "#2d2d3a", "#111827"].map((color) => (
                          <button
                            key={color}
                            onClick={() => setBackgroundColor(color)}
                            className={cn(
                              "w-8 h-8 rounded-md border-2 transition-all",
                              backgroundColor === color
                                ? "border-blue-500 scale-110"
                                : "border-gray-600 hover:border-gray-500"
                            )}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                        <input
                          type="color"
                          value={backgroundColor}
                          onChange={(e) => setBackgroundColor(e.target.value)}
                          className="w-8 h-8 rounded-md cursor-pointer"
                        />
                      </div>
                    </div>

                    {/* Shadows */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enableShadows}
                          onChange={(e) => setEnableShadows(e.target.checked)}
                          className="rounded border-gray-600 bg-gray-800 text-blue-500"
                        />
                        <span className="text-sm text-gray-300">Enable Shadows</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enableContactShadows}
                          onChange={(e) => setEnableContactShadows(e.target.checked)}
                          className="rounded border-gray-600 bg-gray-800 text-blue-500"
                        />
                        <span className="text-sm text-gray-300">Contact Shadows</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={showGround}
                          onChange={(e) => setShowGround(e.target.checked)}
                          className="rounded border-gray-600 bg-gray-800 text-blue-500"
                        />
                        <span className="text-sm text-gray-300">Show Ground</span>
                      </label>
                    </div>
                  </>
                )}

                {/* Effects Tab */}
                {activeTab === "effects" && (
                  <>
                    {/* Tone Mapping */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enableToneMapping}
                          onChange={(e) => setEnableToneMapping(e.target.checked)}
                          className="rounded border-gray-600 bg-gray-800 text-blue-500"
                        />
                        <span className="text-sm text-gray-300">ACES Tone Mapping</span>
                      </label>
                      {enableToneMapping && (
                        <div className="pl-6">
                          <Label className="text-xs text-gray-400 mb-1 block">
                            Exposure: {exposure.toFixed(1)}
                          </Label>
                          <input
                            type="range"
                            min="0.1"
                            max="3"
                            step="0.1"
                            value={exposure}
                            onChange={(e) => setExposure(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      )}
                    </div>

                    {/* Bloom */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enableBloom}
                          onChange={(e) => setEnableBloom(e.target.checked)}
                          className="rounded border-gray-600 bg-gray-800 text-blue-500"
                        />
                        <span className="text-sm text-gray-300">Bloom Effect</span>
                      </label>
                      {enableBloom && (
                        <div className="pl-6">
                          <Label className="text-xs text-gray-400 mb-1 block">
                            Intensity: {bloomIntensity.toFixed(1)}
                          </Label>
                          <input
                            type="range"
                            min="0"
                            max="2"
                            step="0.1"
                            value={bloomIntensity}
                            onChange={(e) => setBloomIntensity(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      )}
                    </div>

                    {/* Vignette */}
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableVignette}
                        onChange={(e) => setEnableVignette(e.target.checked)}
                        className="rounded border-gray-600 bg-gray-800 text-blue-500"
                      />
                      <span className="text-sm text-gray-300">Vignette</span>
                    </label>

                    {/* Pixelation */}
                    <div className="space-y-2 pt-4 border-t border-gray-700">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enablePixelation}
                          onChange={(e) => setEnablePixelation(e.target.checked)}
                          className="rounded border-gray-600 bg-gray-800 text-blue-500"
                        />
                        <div>
                          <span className="text-sm text-gray-300">Pixel Art</span>
                          <p className="text-xs text-gray-500">Chunky pixelated rendering</p>
                        </div>
                      </label>
                      {enablePixelation && (
                        <div className="pl-6">
                          <Label className="text-xs text-gray-400 mb-1 block">
                            Pixel Size: {pixelSize}px
                          </Label>
                          <input
                            type="range"
                            min="2"
                            max="24"
                            step="1"
                            value={pixelSize}
                            onChange={(e) => setPixelSize(parseInt(e.target.value, 10))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      )}
                    </div>

                    {/* Ordered Dithering */}
                    <div className="space-y-2 pt-4 border-t border-gray-700">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enableOrderedDithering}
                          onChange={(e) => setEnableOrderedDithering(e.target.checked)}
                          className="rounded border-gray-600 bg-gray-800 text-blue-500"
                        />
                        <div>
                          <span className="text-sm text-gray-300">Ordered Dithering</span>
                          <p className="text-xs text-gray-500">Shader-based dither with pixel grid</p>
                        </div>
                      </label>
                      {enableOrderedDithering && (
                        <div className="pl-6 space-y-3">
                          <div>
                            <Label className="text-xs text-gray-400 mb-1 block">Preset</Label>
                            <select
                              value={orderedDitheringPreset}
                              onChange={(e) => {
                                const value = e.target.value as OrderedDitheringPresetKey | "custom";
                                setOrderedDitheringPreset(value);
                                if (value !== "custom") {
                                  applyOrderedDitheringPreset(value);
                                }
                              }}
                              className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded-md text-xs text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {Object.entries(orderedDitheringPresets).map(([key, preset]) => (
                                <option key={key} value={key}>
                                  {preset.label}
                                </option>
                              ))}
                              <option value="custom">Custom</option>
                            </select>
                          </div>
                          <div>
                            <Label className="text-xs text-gray-400 mb-1 block">
                              Grid Size: {orderedDitheringGridSize.toFixed(1)}
                            </Label>
                            <input
                              type="range"
                              min="2"
                              max="12"
                              step="0.5"
                              value={orderedDitheringGridSize}
                              onChange={(e) => {
                                setOrderedDitheringGridSize(parseFloat(e.target.value));
                                setOrderedDitheringPreset("custom");
                              }}
                              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-400 mb-1 block">
                              Pixel Ratio: {orderedDitheringPixelSizeRatio.toFixed(1)}
                            </Label>
                            <input
                              type="range"
                              min="0.5"
                              max="3"
                              step="0.1"
                              value={orderedDitheringPixelSizeRatio}
                              onChange={(e) => {
                                setOrderedDitheringPixelSizeRatio(parseFloat(e.target.value));
                                setOrderedDitheringPreset("custom");
                              }}
                              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-400 mb-1 block">Luminance</Label>
                            <select
                              value={orderedDitheringLuminanceMethod}
                              onChange={(e) => {
                                setOrderedDitheringLuminanceMethod(parseInt(e.target.value, 10));
                                setOrderedDitheringPreset("custom");
                              }}
                              className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded-md text-xs text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {orderedDitheringLuminanceOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={orderedDitheringGrayscaleOnly}
                              onChange={(e) => {
                                setOrderedDitheringGrayscaleOnly(e.target.checked);
                                setOrderedDitheringPreset("custom");
                              }}
                              className="rounded border-gray-600 bg-gray-800 text-blue-500"
                            />
                            <span className="text-xs text-gray-300">Grayscale only</span>
                          </label>
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={orderedDitheringInvertColor}
                              onChange={(e) => {
                                setOrderedDitheringInvertColor(e.target.checked);
                                setOrderedDitheringPreset("custom");
                              }}
                              className="rounded border-gray-600 bg-gray-800 text-blue-500"
                            />
                            <span className="text-xs text-gray-300">Invert colors</span>
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Dithering */}
                    <div className="space-y-2 pt-4 border-t border-gray-700">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={enableDithering}
                          onChange={(e) => setEnableDithering(e.target.checked)}
                          className="rounded border-gray-600 bg-gray-800 text-blue-500"
                        />
                        <div>
                          <span className="text-sm text-gray-300">B&W Dithering</span>
                          <p className="text-xs text-gray-500">Artistic retro effect</p>
                        </div>
                      </label>
                      {enableDithering && (
                        <div className="pl-6">
                          <Label className="text-xs text-gray-400 mb-1 block">
                            Intensity: {ditheringIntensity.toFixed(1)}
                          </Label>
                          <input
                            type="range"
                            min="0.1"
                            max="2"
                            step="0.1"
                            value={ditheringIntensity}
                            onChange={(e) => setDitheringIntensity(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* View Tab */}
                {activeTab === "view" && (
                  <>
                    {/* Auto Rotate */}
                    <div className="space-y-2">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={autoRotate}
                          onChange={(e) => setAutoRotate(e.target.checked)}
                          className="rounded border-gray-600 bg-gray-800 text-blue-500"
                        />
                        <span className="text-sm text-gray-300">Auto-rotate</span>
                      </label>
                      {autoRotate && (
                        <div className="pl-6">
                          <Label className="text-xs text-gray-400 mb-1 block">
                            Speed: {autoRotateSpeed.toFixed(1)}
                          </Label>
                          <input
                            type="range"
                            min="0.5"
                            max="10"
                            step="0.5"
                            value={autoRotateSpeed}
                            onChange={(e) => setAutoRotateSpeed(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                          />
                        </div>
                      )}
                    </div>

                    {/* Controls Help */}
                    <div className="p-3 bg-gray-800/50 rounded-lg text-xs text-gray-400 space-y-1">
                      <p className="font-medium text-gray-300 mb-2">Controls:</p>
                      <p>• Left click + drag to rotate</p>
                      <p>• Right click + drag to pan</p>
                      <p>• Scroll to zoom</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Quick Actions Bar */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-700 bg-gray-900/80 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Layers className="h-4 w-4" />
            <span>{environment} environment</span>
            <span className="mx-1">•</span>
            <span>{lighting} lighting</span>
          </div>
          <div className="flex items-center gap-2">
            {enableBloom && (
              <span className="px-2 py-0.5 text-xs bg-purple-500/20 text-purple-400 rounded">
                Bloom
              </span>
            )}
            {enablePixelation && (
              <span className="px-2 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded">
                Pixel Art
              </span>
            )}
            {enableOrderedDithering && (
              <span className="px-2 py-0.5 text-xs bg-teal-500/20 text-teal-400 rounded">
                Ordered Dither
              </span>
            )}
            {enableDithering && (
              <span className="px-2 py-0.5 text-xs bg-gray-700 text-gray-400 rounded">
                Dithering
              </span>
            )}
            {enableShadows && (
              <span className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">
                Shadows
              </span>
            )}
          </div>
        </div>
      </div>
    </AppModal>
  );
}
