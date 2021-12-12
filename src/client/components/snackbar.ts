import { fadeInTimeoutMs, Snackbar } from './snackbar_element';
import { timeout } from '../time';

/**
 * Shows a "snackbar" alert message to the user for the given duration. This is
 * for *short*, timed messages about interactions on the page.
 * 
 * Currently does *not* support showing multiple snackbars at the same time.
 */
export async function show(text: string, durationMs: number): Promise<void> {
    // Show the snackbar. Automatically fades in.
    const snackbar = Snackbar.of(text);
    document.body.append(snackbar);

    // Wait for fade in animation to play and then wait for the requested
    // duration while the snackbar is fully visible.
    await timeout(fadeInTimeoutMs + durationMs);

    // Fade out the snackbar and remove it from the DOM.
    await snackbar.fadeOut();
    document.body.removeChild(snackbar);
}
