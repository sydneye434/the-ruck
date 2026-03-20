// Developed by Sydney Edwards
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

function BaseIcon(props: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    />
  );
}

export function RuckMarkIcon(props: IconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" aria-hidden="true" {...props}>
      <path d="M4 10H28V22H4V10Z" stroke="currentColor" strokeWidth="2" />
      <path d="M10 10L13 22M16 10L16 22M22 10L19 22" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function DashboardIcon(props: IconProps) {
  return <BaseIcon {...props}><path d="M3 13h8V3H3zM13 21h8v-6h-8zM13 3h8v8h-8zM3 21h8v-4H3z" /></BaseIcon>;
}

export function BacklogIcon(props: IconProps) {
  return <BaseIcon {...props}><path d="M4 6h16M4 12h16M4 18h10" /></BaseIcon>;
}

export function SprintIcon(props: IconProps) {
  return <BaseIcon {...props}><path d="M3 12h9M12 12l4-4M12 12l4 4M17 6h4v12h-4" /></BaseIcon>;
}

export function HistoryIcon(props: IconProps) {
  return <BaseIcon {...props}><path d="M4 4v6h6M20 12a8 8 0 1 1-2.3-5.6" /></BaseIcon>;
}

export function RetrosIcon(props: IconProps) {
  return <BaseIcon {...props}><path d="M4 4h16v16H4zM8 9h8M8 13h8" /></BaseIcon>;
}

export function TeamIcon(props: IconProps) {
  return <BaseIcon {...props}><path d="M8 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM16 11a2.5 2.5 0 1 0 0-5M3 20c0-3 2.5-5 5-5s5 2 5 5M13 20c.2-2 1.8-3.5 4-3.5 2.1 0 3.8 1.5 4 3.5" /></BaseIcon>;
}

export function SettingsIcon(props: IconProps) {
  return <BaseIcon {...props}><path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM19.4 15a1 1 0 0 0 .2 1.1l.1.1a1 1 0 0 1 0 1.4l-1 1a1 1 0 0 1-1.4 0l-.1-.1a1 1 0 0 0-1.1-.2 1 1 0 0 0-.6.9V20a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-.2a1 1 0 0 0-.7-.9 1 1 0 0 0-1.1.2l-.1.1a1 1 0 0 1-1.4 0l-1-1a1 1 0 0 1 0-1.4l.1-.1a1 1 0 0 0 .2-1.1 1 1 0 0 0-.9-.6H4a1 1 0 0 1-1-1v-1.4a1 1 0 0 1 1-1h.2a1 1 0 0 0 .9-.7 1 1 0 0 0-.2-1.1l-.1-.1a1 1 0 0 1 0-1.4l1-1a1 1 0 0 1 1.4 0l.1.1a1 1 0 0 0 1.1.2 1 1 0 0 0 .6-.9V4a1 1 0 0 1 1-1h1.5a1 1 0 0 1 1 1v.2a1 1 0 0 0 .7.9 1 1 0 0 0 1.1-.2l.1-.1a1 1 0 0 1 1.4 0l1 1a1 1 0 0 1 0 1.4l-.1.1a1 1 0 0 0-.2 1.1 1 1 0 0 0 .9.6h.2a1 1 0 0 1 1 1V13a1 1 0 0 1-1 1h-.2a1 1 0 0 0-.9.6z" /></BaseIcon>;
}

export function MoonIcon(props: IconProps) {
  return <BaseIcon {...props}><path d="M20 14.5A7.5 7.5 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z" /></BaseIcon>;
}

export function SunIcon(props: IconProps) {
  return <BaseIcon {...props}><circle cx="12" cy="12" r="3.5" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9L17 7M7 17l-2.1 2.1" /></BaseIcon>;
}

export function CollapseIcon(props: IconProps) {
  return <BaseIcon {...props}><path d="M9 6l-5 6 5 6M20 4v16" /></BaseIcon>;
}

