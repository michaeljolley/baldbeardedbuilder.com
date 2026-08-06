import { defineEcConfig, ExpressiveCodeTheme } from 'astro-expressive-code';
import ecThemes from './src/lib/ec-themes.generated.mjs';

/*
  Expressive Code lives here rather than in astro.config.mjs because the Code component
  needs the whole options object to survive a JSON round trip, and a separate config
  file is how Expressive Code supports options that cannot.

  One theme, not sixteen. Expressive Code inlines one CSS custom property per configured
  theme onto every syntax span, so sixteen themes multiplied every code heavy article by
  sixteen. One real article measured 926 KB of HTML that way, which breaks decision 32
  far harder than any JavaScript budget would have. The generated theme instead sets
  every token foreground to var(--tok-*), so the existing [data-theme] cascade in
  themes.css does all the switching for free and the code always matches the chrome
  exactly rather than approximately. The same article is 56 KB.

  Every surface color is overridden here rather than left to the theme, because theme
  workbench colors have to be hex for Expressive Code to parse them, while style
  overrides accept variables. Nothing hex reaches the page.
*/
const theme = new ExpressiveCodeTheme(ecThemes[0]);

/*
  Expressive Code's own script promotes a horizontally scrollable code block to a focusable
  role="region" so it can be reached by keyboard. This site also caps tall blocks, so they
  can scroll vertically without Expressive Code noticing. The companion module below checks
  both axes and restores keyboard access if Expressive Code removes it.

  Expressive Code gives the region no accessible name, so a page with two scrollable blocks
  otherwise ends up with two identical unnamed landmarks. The name is baked in at build time
  and is harmless on blocks that never become regions.
*/
function findPre(node) {
  if (!node || typeof node !== 'object') return null;
  if (node.type === 'element' && node.tagName === 'pre') return node;
  for (const child of node.children ?? []) {
    const hit = findPre(child);
    if (hit) return hit;
  }
  return null;
}

const accessibleCodeBlocks = {
  name: 'accessible-code-blocks',
  jsModules: [`
    const selector = '.expressive-code pre > code';
    const observed = new WeakSet();

    function updateCodeBlock(pre) {
      const scrollable =
        pre.scrollWidth > pre.clientWidth || pre.scrollHeight > pre.clientHeight;

      if (scrollable) {
        if (pre.getAttribute('tabindex') !== '0') pre.setAttribute('tabindex', '0');
        if (pre.getAttribute('role') !== 'region') pre.setAttribute('role', 'region');
      } else {
        if (pre.hasAttribute('tabindex')) pre.removeAttribute('tabindex');
        if (pre.getAttribute('role') === 'region') pre.removeAttribute('role');
      }
    }

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) updateCodeBlock(entry.target);
    });

    const tabindexObserver = new MutationObserver((entries) => {
      for (const entry of entries) updateCodeBlock(entry.target);
    });

    function observeCodeBlocks(root) {
      root.querySelectorAll?.(selector).forEach((code) => {
        const pre = code.parentElement;
        if (!pre || observed.has(pre)) return;
        observed.add(pre);
        resizeObserver.observe(pre);
        tabindexObserver.observe(pre, { attributes: true, attributeFilter: ['tabindex'] });
        updateCodeBlock(pre);
      });
    }

    observeCodeBlocks(document);
    new MutationObserver((entries) => {
      for (const entry of entries) {
        for (const node of entry.addedNodes) observeCodeBlocks(node);
      }
    }).observe(document.body, { childList: true, subtree: true });
    document.addEventListener('astro:page-load', () => observeCodeBlocks(document));
  `],
  hooks: {
    postprocessRenderedBlock: ({ codeBlock, renderData }) => {
      const pre = findPre(renderData.blockAst);
      if (!pre) return;
      const nth = (codeBlock.parentDocument?.positionInDocument?.groupIndex ?? 0) + 1;
      const title = codeBlock.props?.title?.trim();
      const lang = codeBlock.language;
      const subject = title || (lang && lang !== 'plaintext' ? lang : null);
      pre.properties['aria-label'] = subject
        ? `${subject}, code block ${nth}`
        : `Code block ${nth}`;
    }
  }
};

/*
  A code block with no language gets tokenized as plain text, and plain text takes the
  theme's resolved default foreground rather than any scope rule. That resolution runs
  through a workbench color parser that only accepts hex, so the one honest way to keep
  a hex value off the page is to overwrite the resolved value after the parser is done
  with it.
*/
theme.fg = 'var(--fg)';
theme.bg = 'var(--bg-inset)';

export default defineEcConfig({
  themes: [theme],
  plugins: [accessibleCodeBlocks],
  // One theme means nothing to scope and nothing to switch, so neither a per theme
  // selector nor the media query default has a job to do. Leaving the selector on would
  // emit a dead [data-theme="bbb"] block that no page ever matches.
  themeCssSelector: false,
  useDarkModeMediaQuery: false,
  /*
    Expressive Code runs its own contrast pass over syntax colors. It cannot evaluate a
    CSS variable, and gen-themes.mjs already clears 4.5 to 1 against all three surfaces
    rather than just the code background, so this hands the job to the guard that can
    actually see the colors.
  */
  minSyntaxHighlightingColorContrast: 0,
  styleOverrides: {
    uiFontFamily: 'var(--mono)',
    codeFontFamily: 'var(--mono)',
    codeFontSize: '0.8125rem',
    codeLineHeight: '1.7',
    codeBackground: 'var(--bg-inset)',
    codeForeground: 'var(--fg)',
    borderColor: 'var(--line)',
    borderRadius: 'var(--r)',
    borderWidth: '1px',
    focusBorder: 'var(--accent)',
    scrollbarThumbColor: 'var(--line)',
    scrollbarThumbHoverColor: 'var(--fg-dim)',
    frames: {
      editorActiveTabBackground: 'var(--bg-inset)',
      editorActiveTabForeground: 'var(--fg)',
      editorActiveTabBorderColor: 'var(--line)',
      editorTabBarBackground: 'var(--bg-raised)',
      editorTabBarBorderBottomColor: 'var(--line)',
      editorBackground: 'var(--bg-inset)',
      terminalBackground: 'var(--bg-inset)',
      terminalTitlebarBackground: 'var(--bg-raised)',
      terminalTitlebarForeground: 'var(--fg-dim)',
      terminalTitlebarBorderBottomColor: 'var(--line)',
      inlineButtonBackground: 'var(--bg-raised)',
      inlineButtonForeground: 'var(--fg-dim)',
      inlineButtonBorder: 'var(--line)',
      tooltipSuccessBackground: 'var(--bg-raised)',
      tooltipSuccessForeground: 'var(--fg)'
    }
  },
  frames: {
    showCopyToClipboardButton: true,
    copyButtonTooltipText: 'Copy this snippet'
  }
});
