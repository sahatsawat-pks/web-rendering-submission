export interface SubjectColorStyle {
  className?: string; // For Tailwind classes (e.g. "from-blue-500 to-indigo-500")
  style?: {           // For custom CSS gradients
    background?: string;
    backgroundImage?: string;
  }; 
}

/**
 * Determines how to apply the subject color.
 * If the color string starts with 'from-', it's treated as a Tailwind gradient.
 * Otherwise, it's treated as a CSS gradient value or a hex code to be converted.
 */
export function getSubjectGradientStyle(color: string | undefined | null): SubjectColorStyle {
  if (!color) {
    // Default fallback
    return { className: "from-blue-500 to-indigo-500" };
  }

  if (color.startsWith("from-")) {
    // It's a Tailwind class string
    return { className: bgGradientToR(color) };
  }

  // It's likely a hex code or a linear-gradient string
  // If it's a simple hex, we might want to generate a gradient on the fly if not already generated
  if (color.startsWith("#")) {
     return {
       style: { backgroundImage: generateGradientFromHex(color) }
     }
  }

  if (color.includes("gradient")) {
      return {
          style: { backgroundImage: color }
      }
  }

  // Fallback for unknown format
  return { className: "from-blue-500 to-indigo-500" };
}

/**
 * Helper to ensure the tailwind class has bg-gradient-to-r if mostly just from/to
 * Note: The existing code often does `bg-gradient-to-r ${color}` manually.
 * This helper returns JUST the color part if the caller handles the prefix, 
 * OR we standardize on the caller using the style object.
 * 
 * To make migration easier, let's stick to the pattern:
 * - Tailwind: return just the `from-X to-Y` part? 
 *   Wait, existing code does: `className={\`h-2 animate-pulse bg-gradient-to-r \${mod.color}\`}`
 *   So mod.color IS "from-X to-Y".
 * 
 *   If we pass a custom gradient, we can't use `bg-gradient-to-r`.
 *   We need to conditionally apply the class or the style.
 */

// Better approach for the helper:
// Return an object that props can be spread onto the div
export function getGradientStyleProps(color: string | undefined | null, baseClasses = ""): { className: string; style?: React.CSSProperties } {
    if (!color) {
        return { className: `${baseClasses} bg-gradient-to-r from-blue-500 to-indigo-500` };
    }

    if (color.startsWith("from-")) {
        return { className: `${baseClasses} bg-gradient-to-r ${color}` };
    }

    // It is a custom color/gradient
    let gradient = color;
    if (color.startsWith("#")) {
        gradient = generateGradientFromHex(color);
    }

    return {
        className: baseClasses, // No bg-gradient-to-r class
        style: { backgroundImage: gradient }
    };
}

/**
 * Generates a complimentary linear gradient from a single hex color.
 * Strategy: Start with the hex, End with a slightly lighter/shifted version.
 */
export function generateGradientFromHex(hex: string): string {
    // Simple logic: Hex -> RGB -> Adjust -> Hex
    // For now, let's just do a simple string manipulation or return a CSS linear-gradient
    // We can use a css variable trick or just hardcode a lighter variant if we had a color lib.
    // Without a color lib, let's try to just use valid CSS color-mix if supported, or just linear-gradient to transparent?
    // Actually, `linear-gradient(135deg, ${hex}, ${hex}88)` works well for a fade.
    // Or we can try to do some bit manipulation.
    
    // Let's go with a safe generic approach:
    // Gradient from standard color to a lighter version of itself
    return `linear-gradient(135deg, ${hex} 0%, ${adjustBrightness(hex, 40)} 100%)`;
}

/**
 * Returns style props for applying the gradient to TEXT.
 * (e.g. background-clip: text)
 */
export function getTextGradientStyle(color: string | undefined | null): { className: string; style?: React.CSSProperties } {
    if (!color) {
        return { className: "bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent" };
    }

    if (color.startsWith("from-")) {
        // Tailwind: we need to ensure the text color variables align or just use standard
        // Heuristic: convert bg-gradient to text gradient classes
        // Input: "from-blue-500 to-sky-500"
        return { className: `bg-gradient-to-r ${color} bg-clip-text text-transparent` };
    }

    // Custom Hex or Gradient
    let gradient = color;
    if (color.startsWith("#")) {
        gradient = generateGradientFromHex(color);
    }
    
    return {
        className: "bg-clip-text text-transparent",
        style: { 
            backgroundImage: gradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            color: 'transparent'
        }
    };
}

// Simple hex brightness adjuster
function adjustBrightness(col: string, amt: number) {
    let usePound = false;
  
    if (col[0] == "#") {
        col = col.slice(1);
        usePound = true;
    }
 
    let num = parseInt(col,16);
 
    let r = (num >> 16) + amt;
 
    if (r > 255) r = 255;
    else if  (r < 0) r = 0;
 
    let b = ((num >> 8) & 0x00FF) + amt;
 
    if (b > 255) b = 255;
    else if  (b < 0) b = 0;
 
    let g = (num & 0x0000FF) + amt;
 
    if (g > 255) g = 255;
    else if (g < 0) g = 0;
 
    return (usePound?"#":"") + (g | (b << 8) | (r << 16)).toString(16);
}

// Internal helper for legacy support if needed
function bgGradientToR(str: string) {
    return str;
}

/**
 * Extracts a shadow color class from the gradient string.
 * Example: "from-purple-500 to-pink-500" -> "shadow-purple-500/30"
 */
export function getShadowColorClass(color: string | undefined | null): string {
    if (!color) return "shadow-blue-500/30";

    if (color.startsWith("from-")) {
        const fromPart = color.split(" ").find(c => c.startsWith("from-"));
        if (fromPart) {
            return fromPart.replace("from-", "shadow-") + "/30";
        }
    }
    
    // For hex, we'd need to style manually, but for now fallback to style-based handling in component or default
    return "shadow-blue-500/30"; 
}
