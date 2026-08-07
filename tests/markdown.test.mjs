/*
  The safe markdown renderer.

  This is the only place on the site that turns something a stranger typed into HTML, so
  the tests are mostly about what does not come out the other end.
*/
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderComment, commentExcerpt } from '../src/lib/markdown.ts';

test('ordinary prose renders as a paragraph', async () => {
  assert.equal(await renderComment('Hello there.'), '<p>Hello there.</p>');
});

test('emphasis, strong and inline code survive', async () => {
  const html = await renderComment('a *b* **c** `d`');
  assert.match(html, /<em>b<\/em>/);
  assert.match(html, /<strong>c<\/strong>/);
  assert.match(html, /<code>d<\/code>/);
});

test('a script tag is text, not a script', async () => {
  const html = await renderComment('<script>alert(1)</script>');
  assert.equal(html.includes('<script'), false);
  assert.match(html, /&lt;script&gt;/);
});

test('an event handler on a tag never reaches the page', async () => {
  const html = await renderComment('<img src=x onerror="alert(1)">');
  assert.equal(html.includes('<img'), false);
  /* The words survive as text, which is the point. Nothing is left that a browser parses
     as a tag, so there is no element for the handler to hang off. */
  assert.match(html, /&lt;img src=x onerror=/);
});

test('a markdown image is not rendered as an image', async () => {
  const html = await renderComment('![alt](https://example.com/tracker.gif)');
  assert.equal(html.includes('<img'), false);
});

test('a javascript link loses its anchor but keeps its words', async () => {
  const html = await renderComment('[click me](javascript:alert(1))');
  assert.equal(html.includes('<a '), false);
  assert.match(html, /click me/);
});

test('a data url link loses its anchor', async () => {
  const html = await renderComment('[x](data:text/html;base64,PHNjcmlwdD4=)');
  assert.equal(html.includes('<a '), false);
});

test('an ordinary link is nofollow, ugc and noopener', async () => {
  const html = await renderComment('[docs](https://learn.microsoft.com/)');
  assert.match(html, /<a href="https:\/\/learn\.microsoft\.com\/" rel="nofollow ugc noopener">docs<\/a>/);
});

test('a heading becomes bold text, so a comment cannot join the page outline', async () => {
  const html = await renderComment('# Shouting');
  assert.equal(/<h[1-6]/.test(html), false);
  assert.match(html, /<strong>Shouting<\/strong>/);
});

test('a fenced block in a known language is highlighted with theme variables', async () => {
  const html = await renderComment('```csharp\nvar x = 1;\n```');
  assert.match(html, /<pre class="c-code" data-lang="csharp">/);
  assert.match(html, /var\(--tok-/);
});

test('a fence in an unknown language is still a code block, just plain', async () => {
  const html = await renderComment('```brainfuck\n+++.\n```');
  assert.match(html, /<pre class="c-code"><code>\+\+\+\.<\/code><\/pre>/);
});

test('no theme leaks a literal colour into a comment', async () => {
  const html = await renderComment('```js\nconst x = 1;\n```');
  assert.equal(/#[0-9a-f]{3,8}\b/i.test(html), false);
});

test('a fence cannot smuggle markup through its contents', async () => {
  const html = await renderComment('```\n</code></pre><script>alert(1)</script>\n```');
  assert.equal(html.includes('<script'), false);
});

test('lists and quotes survive, one level of nesting included', async () => {
  const html = await renderComment('> quoted\n\n- one\n- two');
  assert.match(html, /<blockquote><p>quoted<\/p><\/blockquote>/);
  assert.match(html, /<ul><li>one<\/li><li>two<\/li><\/ul>/);
});

test('a table is not rendered as a table', async () => {
  const html = await renderComment('| a | b |\n| - | - |\n| 1 | 2 |');
  assert.equal(html.includes('<table'), false);
});

test('an excerpt strips markup and code and stays short', () => {
  assert.equal(commentExcerpt('**bold** and `code`'), 'bold and code');
  assert.equal(commentExcerpt('```js\nlots of code\n```'), 'code');
  assert.equal(commentExcerpt('x'.repeat(300)).length, 160);
});
