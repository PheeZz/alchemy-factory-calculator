import { motion } from 'motion/react';

/** Re-keys on value change so a recalculated figure visibly settles in place. */
export function NumberFlip({ value, className }: { value: string; className?: string }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0.2, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: 'easeOut' }}
      className={`num inline-block ${className ?? ''}`}
    >
      {value}
    </motion.span>
  );
}
