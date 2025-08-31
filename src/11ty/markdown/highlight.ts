import { markedHighlight } from 'marked-highlight';
import prism from 'prismjs';
import PrismLoader from 'prismjs/components/index';

const highlightedLanguages = new Set([
    'css',
    'html',
    'rust',
    'typescript',
]);

const aliases = new Map(Object.entries({
    'xml': 'html',
}));

/** Returns the Prism grammar for a given language. */
function loadGrammar(lang: string): prism.Grammar {
    // Prism doesn't load all languages immediately. Need to call `PrismLoader`
    // with the desired language, which will have the side effect of adding the
    // grammar to `prism.languages` if it is supported.

    // Check the grammar is already loaded and use it.
    const alreadyLoadedGrammar = prism.languages[lang];
    if (alreadyLoadedGrammar) return alreadyLoadedGrammar;

    // Load grammar for language and add it to `prism.languages` if supported.
    PrismLoader(lang);

    // Check if the grammer is now loaded.
    const newlyLoadedGrammar = prism.languages[lang];
    if (newlyLoadedGrammar) return newlyLoadedGrammar;

    // Failed to find the grammar.
    throw new Error(`Unknown language \`${lang}\` in Prism.`);
}

/** Marked extension which enables syntax highlighting for code blocks. */
export const highlightExtension = markedHighlight({
    highlight(code: string, unaliasedLang: string): string {
        const lang = aliases.get(unaliasedLang) ?? unaliasedLang;
        if (!highlightedLanguages.has(lang)) return code;

        return prism.highlight(code, loadGrammar(lang), lang);
    },
});
