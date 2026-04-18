

import {
  ArrowRight,
  BrainCircuit,
  CheckSquare,
  Code2,
  Eye,
  FileImage,
  Globe,
  Hand,
  Keyboard,
  Link,
  MousePointer,
  MousePointerClick,
  MoveVertical,
  Square,
  TextCursorInput,
  Timer,
  Upload,
} from 'lucide-react';

import type { PlaywrightStepType } from '@/shared/contracts/playwright-steps';

type IconProps = { className?: string | undefined };
type IconComponent = (props: IconProps) => React.JSX.Element;

const STEP_TYPE_ICONS: Record<PlaywrightStepType, IconComponent> = {
  navigate: (p) => <Globe {...p} />,
  click: (p) => <MousePointerClick {...p} />,
  fill: (p) => <TextCursorInput {...p} />,
  select: (p) => <ArrowRight {...p} />,
  check: (p) => <CheckSquare {...p} />,
  uncheck: (p) => <Square {...p} />,
  hover: (p) => <Hand {...p} />,
  wait_for_selector: (p) => <Eye {...p} />,
  wait_for_timeout: (p) => <Timer {...p} />,
  wait_for_load_state: (p) => <Timer {...p} />,
  screenshot: (p) => <FileImage {...p} />,
  assert_text: (p) => <TextCursorInput {...p} />,
  assert_visible: (p) => <Eye {...p} />,
  assert_url: (p) => <Link {...p} />,
  scroll: (p) => <MoveVertical {...p} />,
  press_key: (p) => <Keyboard {...p} />,
  upload_file: (p) => <Upload {...p} />,
  custom_script: (p) => <Code2 {...p} />,
  ai_evaluate: (p) => <BrainCircuit {...p} />,
};

const STEP_TYPE_COLORS: Record<PlaywrightStepType, string> = {
  navigate: 'text-blue-400',
  click: 'text-orange-400',
  fill: 'text-green-400',
  select: 'text-purple-400',
  check: 'text-emerald-400',
  uncheck: 'text-gray-400',
  hover: 'text-yellow-400',
  wait_for_selector: 'text-sky-400',
  wait_for_timeout: 'text-amber-400',
  wait_for_load_state: 'text-amber-400',
  screenshot: 'text-pink-400',
  assert_text: 'text-teal-400',
  assert_visible: 'text-teal-400',
  assert_url: 'text-indigo-400',
  scroll: 'text-cyan-400',
  press_key: 'text-violet-400',
  upload_file: 'text-rose-400',
  custom_script: 'text-gray-300',
  ai_evaluate: 'text-fuchsia-400',
};

type Props = {
  type: PlaywrightStepType;
  className?: string | undefined;
  withColor?: boolean | undefined;
};

export function StepTypeIcon({ type, className = 'size-3.5', withColor = true }: Props): React.JSX.Element {
  const Icon = STEP_TYPE_ICONS[type] ?? ((p: IconProps) => <MousePointer {...p} />);
  const colorClass = withColor ? (STEP_TYPE_COLORS[type] ?? 'text-muted-foreground') : '';
  return <Icon className={`${className} ${colorClass}`.trim()} />;
}
