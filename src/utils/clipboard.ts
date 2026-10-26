/**
 * Safe Cross-Browser Clipboard Copy
 * Compatible with iPhone Safari, iPhone Chrome, Android Chrome, and Desktop.
 * Handles cases where navigator.clipboard throws or is restricted.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // 1. Try modern navigator.clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for Safari permissions or non-focused document
    }
  }

  // 2. Resilient fallback using textarea selection (compatible with iOS Safari)
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    textArea.style.opacity = '0';
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    textArea.setSelectionRange(0, 99999); // For iOS Safari selection range

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (err) {
    console.warn('[Clipboard] Fallback copy failed:', err);
    return false;
  }
}
