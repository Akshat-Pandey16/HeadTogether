import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

const INTERACTIVE = "a,button,[role=button],select,label,input,textarea,[data-cursor=pointer]";

export const CustomCursor = () => {
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);
  const [down, setDown] = useState(false);
  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, { stiffness: 450, damping: 32, mass: 0.5 });
  const ringY = useSpring(y, { stiffness: 450, damping: 32, mass: 0.5 });

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    setEnabled(true);
    const root = document.documentElement;
    root.classList.add("has-custom-cursor");
    const move = (e: PointerEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
      const el = e.target as HTMLElement | null;
      setHovering(Boolean(el?.closest(INTERACTIVE)));
    };
    const onDown = () => setDown(true);
    const onUp = () => setDown(false);
    const onLeave = () => {
      x.set(-100);
      y.set(-100);
    };
    window.addEventListener("pointermove", move, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    document.addEventListener("mouseleave", onLeave);
    return () => {
      root.classList.remove("has-custom-cursor");
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("mouseleave", onLeave);
    };
  }, [x, y]);

  if (!enabled) return null;
  const size = hovering ? 40 : 24;

  return (
    <>
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[9999] rounded-sm border-2 border-ink"
        style={{ x: ringX, y: ringY }}
        animate={{
          width: size,
          height: size,
          marginLeft: -size / 2,
          marginTop: -size / 2,
          scale: down ? 0.82 : 1,
          backgroundColor: hovering ? "hsl(var(--acid) / 0.18)" : "rgba(0,0,0,0)",
        }}
        transition={{ type: "spring", stiffness: 400, damping: 28 }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none fixed left-0 top-0 z-[9999] h-1.5 w-1.5 rounded-full bg-acid"
        style={{ x, y, marginLeft: -3, marginTop: -3 }}
      />
    </>
  );
};
