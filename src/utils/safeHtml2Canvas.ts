// Reusable, bulletproof wrapper for html2canvas that intercepts modern unsupported color spaces (like oklab/oklch from Tailwind 4)
// and handles them gracefully by rewriting computed style calls to safe standard RGB fallback colors.

export async function safeHtml2Canvas(element: HTMLElement, options: any = {}): Promise<HTMLCanvasElement> {
  const originalGetComputedStyle = window.getComputedStyle;

  // Set up robust Proxy over window.getComputedStyle to translate oklab/oklch values on the fly
  window.getComputedStyle = function (el: Element, pseudoElt?: string | null) {
    const style = originalGetComputedStyle.call(this, el, pseudoElt);
    return new Proxy(style, {
      get(target, prop) {
        const val = target[prop as keyof CSSStyleDeclaration];
        
        // Handle method reads (like getPropertyValue, getPropertyPriority)
        if (typeof val === 'function') {
          return function (...args: any[]) {
            const res = (val as Function).apply(target, args);
            if (typeof res === 'string' && (res.includes('oklab') || res.includes('oklch'))) {
              const arg0Lower = args[0]?.toLowerCase() || '';
              if (arg0Lower === 'color') return 'rgb(30, 41, 59)'; // slate-800
              if (arg0Lower.includes('background')) return 'rgb(255, 255, 255)'; // white
              if (arg0Lower.includes('border')) return 'rgb(226, 232, 240)'; // slate-200
              return 'rgb(248, 250, 252)'; // general off-white
            }
            return res;
          };
        }

        // Handle direct computed style property reads (e.g., style.color, style.backgroundColor)
        if (typeof val === 'string' && (val.includes('oklab') || val.includes('oklch'))) {
          const propNameStr = (prop as string).toLowerCase();
          if (propNameStr === 'color') return 'rgb(30, 41, 59)';
          if (propNameStr.includes('background')) return 'rgb(255, 255, 255)';
          if (propNameStr.includes('border')) return 'rgb(226, 232, 240)';
          return 'rgb(248, 250, 252)';
        }

        return val;
      }
    });
  } as any;

  try {
    const html2canvas = (await import('html2canvas')).default;

    // We copy the options to avoid mutating the original object passed
    const modifiedOptions = { ...options };
    const originalOnClone = modifiedOptions.onclone;

    modifiedOptions.onclone = (clonedDoc: Document) => {
      // Remove any open Leaflet popups, controls, zoom buttons, or popup containers from the cloned document
      try {
        const popups = clonedDoc.querySelectorAll('.leaflet-popup, .leaflet-popup-pane, .leaflet-control');
        popups.forEach(popup => {
          popup.remove();
        });
      } catch (popupErr) {
        console.error('[safeHtml2Canvas] Error removing leaflet popups and controls for snapshot:', popupErr);
      }

      // Also remove any elements with class hide-on-print
      try {
        const printHiddenElements = clonedDoc.querySelectorAll('.hide-on-print');
        printHiddenElements.forEach(el => {
          el.remove();
        });
      } catch (printHiddenErr) {
        console.error('[safeHtml2Canvas] Error removing hide-on-print elements for snapshot:', printHiddenErr);
      }

      // Sanitize the inline style attributes of all cloned elements as a second layer of protection
      try {
        const elements = clonedDoc.getElementsByTagName('*');
        for (let i = 0; i < elements.length; i++) {
          const el = elements[i] as HTMLElement;
          if (el.style) {
            for (let j = el.style.length - 1; j >= 0; j--) {
              const prop = el.style[j];
              const val = el.style.getPropertyValue(prop);
              if (val && (val.includes('oklab') || val.includes('oklch'))) {
                const propLower = prop.toLowerCase();
                if (propLower === 'color') {
                  el.style.setProperty(prop, 'rgb(30, 41, 59)');
                } else if (propLower.includes('background')) {
                  el.style.setProperty(prop, 'rgb(255, 255, 255)');
                } else if (propLower.includes('border')) {
                  el.style.setProperty(prop, 'rgb(226, 232, 240)');
                } else {
                  el.style.setProperty(prop, 'rgb(248, 250, 252)');
                }
              }
            }
          }
        }
      } catch (cleanErr) {
        console.error('[safeHtml2Canvas] Error cleaning cloned document inline styles:', cleanErr);
      }

      if (originalOnClone) {
        originalOnClone(clonedDoc);
      }
    };

    const canvas = await html2canvas(element, modifiedOptions);
    return canvas;
  } finally {
    // ALWAYS restore window.getComputedStyle to its original function
    window.getComputedStyle = originalGetComputedStyle;
  }
}
