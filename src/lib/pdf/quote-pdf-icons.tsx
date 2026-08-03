import { Svg, Path, Circle, Rect, Line } from "@react-pdf/renderer";

// Small hand-built line-icon set for the quote PDF's optional sections
// (matériel / inclus-exclus / roteiro). lucide-react renders DOM <svg>
// elements which @react-pdf/renderer's reconciler can't consume, so these
// are built directly with react-pdf's own Svg primitives instead.

type IconProps = { size?: number; color: string };
const stroke = (color: string) => ({ stroke: color, strokeWidth: 1.6, fill: "none" });

export function IconCheck({ size = 9, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 13l5 5L20 6" stroke={color} strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconX({ size = 9, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Line x1={5} y1={5} x2={19} y2={19} stroke={color} strokeWidth={2.6} strokeLinecap="round" />
      <Line x1={19} y1={5} x2={5} y2={19} stroke={color} strokeWidth={2.6} strokeLinecap="round" />
    </Svg>
  );
}

export function IconPackage({ size = 11, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M4 8.5l8-4.8 8 4.8" {...stroke(color)} strokeLinecap="round" strokeLinejoin="round" />
      <Rect x={4} y={8.5} width={16} height={11.5} rx={1} {...stroke(color)} />
      <Line x1={12} y1={8.5} x2={12} y2={20} {...stroke(color)} />
    </Svg>
  );
}

export function IconDot({ size = 6, color }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Circle cx={12} cy={12} r={9} fill={color} />
    </Svg>
  );
}
