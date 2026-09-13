// ============================================================
// The fingerprint of the code a feature points at
//
// This answers the question a file list cannot: is this description still true of the code it
// names? A feature's `stamp` is a fingerprint over the CONTENTS of its `code:` files, computed by
// the CLI from the real files on disk — so the value stops being a claim anyone has to trust.
//
// ⚠️ **It fingerprints FILES, not symbols.** Extracting a symbol body by counting braces and
// measuring indentation, and that was the only place dspec guessed: a signature spread over
// several lines could not be located, and the feature then reported as broken forever. A file has
// no such ambiguity. The cost is honest and stated in the README: an edit to a shared file
// marks every feature claiming it as stale, and re-stamping is one command.
//
// ⚠️ **Errs towards admitting ignorance.** A file that cannot be read produces no stamp and is
// REPORTED, never skipped and never silently hashed as empty.
// ============================================================

import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * The current fingerprint format. `f` marks a FILE-SET fingerprint over normalised input.
 *
 * ⚠️ **The generation is in the prefix so an older stamp is recognisable rather than wrong.**
 * Changing what gets hashed changes every value, and a feature carrying an older fingerprint is
 * not evidence that its code moved — it is evidence it was measured with a different ruler.
 * Without this marker every described feature in every repo would report as stale on the first run
 * after an upgrade: a storm that is entirely an artefact of the upgrade, and the fastest possible
 * way to teach somebody that this warning means nothing.
 */
const PREFIX = 'sha256g:';

/**
 * Every format written before this one. Reported as unmeasured, never as drift.
 *
 * `sha256f:` treated `#` as a comment in every language and `//` as one in Python, so edits to a
 * JS private field, a Rust attribute or a Python floor division were invisible — and a `/*` inside
 * a JS regex hid the rest of the file. Its values cannot be compared against this definition.
 */
const LEGACY_PREFIXES = ['sha256:', 'sha256n:', 'sha256f:'];

/** How wide a tab counts when measuring indentation. Any constant works; it only has to be one. */
const TAB_WIDTH = 4;

/** Was this stamp written under a different definition of the input? */
export function isLegacyStamp(stamp: string | undefined | null): boolean {
  return !!stamp && !stamp.startsWith(PREFIX) && LEGACY_PREFIXES.some((p) => stamp.startsWith(p));
}

/** Is this a stamp this dspec can compare against? */
export function isCurrentStamp(stamp: string | undefined | null): boolean {
  return !!stamp && stamp.startsWith(PREFIX);
}

/**
 * Strip the parts of a symbol body that carry no behaviour, so reformatting is not drift.
 *
 * ⚠️ **Conservative on purpose, and the asymmetry is deliberate.** A false positive — reporting
 * drift after somebody ran a formatter — is noise that teaches people to ignore the report. A
 * false negative — calling changed code unchanged — is the silent failure this whole product
 * exists to prevent. So this removes only what provably cannot carry meaning, and nothing that
 * might:
 *
 *   - line endings, so a CRLF checkout is not permanent drift
 *   - comments, which by definition do not execute
 *   - trailing whitespace and blank lines
 *   - the WIDTH of indentation, so a 2-space block and a 4-space block agree
 *
 * ⚠️ **Indentation STRUCTURE is preserved, only its width is not.** Each line's indent is
 * replaced by its rank among the distinct indents in the block, so `0, 2, 2` and `0, 4, 4` both
 * become `0, 1, 1` — while `0, 2, 0` stays `0, 1, 0` and still differs. Flattening indentation
 * outright would make `if x:` with two indented lines hash the same as one indented and one not:
 * a real behavioural change in Python reported as clean, which is the failure worth avoiding.
 *
 * What it deliberately does NOT do is normalise spacing inside a line. `a  +  b` still differs
 * from `a + b`, because without parsing there is no way to tell code spacing from the inside of
 * a string literal, and quietly rewriting a string is a false negative.
 */
export function normalise(body: string, file = 'x.ts'): string {
  const lines = stripComments(body.replace(/\r\n?/g, '\n'), commentSyntax(file))
    .split('\n')
    .map((l) => l.replace(/[ \t]+$/, ''))
    .filter((l) => l.trim() !== '');
  if (!lines.length) return '';

  // Measure each line's indent with tabs expanded, so a tab/space conversion is not a change.
  const width = (l: string): number => {
    let n = 0;
    for (const c of /^[ \t]*/.exec(l)![0]) n += c === '\t' ? TAB_WIDTH : 1;
    return n;
  };
  const widths = lines.map(width);

  // Rank the distinct indents. `0, 2, 2` and `0, 4, 4` both become `0, 1, 1`; `0, 2, 0` stays
  // `0, 1, 0`. Width stops mattering; nesting still does.
  const rank = new Map<number, number>();
  [...new Set(widths)].sort((a, b) => a - b).forEach((w, i) => rank.set(w, i));

  return lines
    .map((l, i) => ' '.repeat(rank.get(widths[i])!) + l.trimStart())
    .join('\n');
}

/** Which comment forms a file's language has. Anything not listed has none that are stripped. */
interface CommentSyntax {
  line: boolean;
  block: boolean;
  /** `#` to end of line. */
  hash: boolean;
  /** `#` is a comment only when not followed by `[` — PHP, where `#[Route]` is an attribute. */
  hashNotAttr: boolean;
  /** JavaScript's `/…/` regex literals exist, and a `/*` inside one is not a comment. */
  regex: boolean;
}

const NONE: CommentSyntax = { line: false, block: false, hash: false, hashNotAttr: false, regex: false };
const SLASH: CommentSyntax = { ...NONE, line: true, block: true };
const JS: CommentSyntax = { ...SLASH, regex: true };
const HASH: CommentSyntax = { ...NONE, hash: true };

const SYNTAX: Record<string, CommentSyntax> = {
  ...Object.fromEntries(['js', 'jsx', 'mjs', 'cjs', 'ts', 'tsx', 'mts', 'cts'].map((e) => [e, JS])),
  ...Object.fromEntries(
    ['go', 'rs', 'java', 'kt', 'kts', 'cs', 'swift', 'scala', 'c', 'h', 'cc', 'cpp', 'hpp', 'dart'].map((e) => [e, SLASH]),
  ),
  ...Object.fromEntries(['css', 'scss', 'less'].map((e) => [e, { ...NONE, block: true }])),
  ...Object.fromEntries(['py', 'rb', 'sh', 'bash', 'zsh', 'pl', 'r', 'ex', 'exs', 'yml', 'yaml', 'toml'].map((e) => [e, HASH])),
  php: { ...SLASH, hashNotAttr: true },
};

/**
 * ⚠️ **Unknown means NONE.** Markdown headings start with `#`, a URL contains `//`, and a format
 * this list does not know may use either as content. Keeping a comment in the hash costs a
 * false positive; stripping content costs a false negative — see `normalise` for which is worse.
 */
export function commentSyntax(file: string): CommentSyntax {
  const ext = path.extname(file).slice(1).toLowerCase();
  return SYNTAX[ext] ?? NONE;
}

/** Characters after which a `/` starts a regex literal rather than a division. */
const BEFORE_REGEX = new Set(['', '(', ',', '=', ':', '[', '!', '&', '|', '?', '{', '}', ';', '+', '-', '*', '%', '<', '>', '~', '^']);

/**
 * Remove comments, respecting string literals — using only the forms `syntax` names.
 *
 * The same scanning discipline `sliceBraceBlock` uses: a `//` inside `"http://example.com"` is
 * part of a URL, and treating it as a comment would silently truncate the line.
 */
function stripComments(src: string, syntax: CommentSyntax): string {
  if (!syntax.line && !syntax.block && !syntax.hash && !syntax.hashNotAttr) return src;
  let out = '';
  let inStr: string | null = null;
  let inBlock = false;
  let prev = ''; // last significant character emitted, for telling a regex from a division
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    const next = src[i + 1];
    if (inBlock) {
      if (c === '*' && next === '/') { inBlock = false; i++; }
      continue;
    }
    if (inStr) {
      out += c;
      if (c === '\\') { out += next ?? ''; i++; }
      else if (c === inStr) { inStr = null; prev = c; }
      continue;
    }
    if (c === '"' || c === "'" || c === '`') { inStr = c; out += c; continue; }
    if (syntax.block && c === '/' && next === '*') { inBlock = true; i++; continue; }
    if (
      (syntax.line && c === '/' && next === '/') ||
      (syntax.hash && c === '#') ||
      (syntax.hashNotAttr && c === '#' && next !== '[')
    ) {
      while (i < src.length && src[i] !== '\n') i++;
      out += '\n';
      prev = '';
      continue;
    }
    // ⚠️ A regex literal is copied through whole. `/\/*$/` — strip trailing slashes — would
    // otherwise open a block comment that runs to the next `*/`, often the end of the file, and
    // every later edit in that file would stop being drift.
    if (syntax.regex && c === '/' && BEFORE_REGEX.has(prev)) {
      let j = i + 1;
      let inClass = false;
      for (; j < src.length && src[j] !== '\n'; j++) {
        if (src[j] === '\\') { j++; continue; }
        if (src[j] === '[') inClass = true;
        else if (src[j] === ']') inClass = false;
        else if (src[j] === '/' && !inClass) break;
      }
      if (j < src.length && src[j] === '/') {
        out += src.slice(i, j + 1);
        i = j;
        prev = '/';
        continue;
      }
    }
    out += c;
    if (c === '\n') prev = '';
    else if (c !== ' ' && c !== '\t') prev = c;
  }
  return out;
}

const esc = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * The declaration forms recognised, in the order they are tried.
 *
 * Deliberately ANCHORED to the start of a line: a `placeOrder(…)` inside another function body is
 * a CALL, not a declaration, and matching it would hash an unrelated stretch of code — the worst
 * kind of wrong, because it still produces a plausible-looking value.
 */
function strictPatterns(symbol: string): RegExp[] {
  const n = esc(symbol);
  return [
    new RegExp(`^[ \\t]*(?:export\\s+)?(?:default\\s+)?(?:async\\s+)?function\\s*\\*?\\s+${n}\\b`),
    // The modifier list is repeated (`*`) rather than a fixed slot because Java and C# stack them:
    // `public static final class`, `public sealed partial class`. Without them `public class Order`
    // was not a declaration to the hasher, so scaffolding — which round-trips every name it finds
    // through `extractSymbol` — silently dropped every class in a Java or C# repo, and no entity
    // could be bound to one.
    //
    // ⚠️ **`pub` is in the same list, and it is Rust's, not Java's.** `survey.ts` recognises
    // `pub struct` / `pub trait` / `pub enum`; this pattern did not, so every candidate survey
    // proposed was dropped again by the round-trip — silently, because `verify()` discards what
    // it cannot locate without saying so. The visible symptom was `dspec sync --write` scaffolding
    // ZERO entities on a Rust repo, since virtually every public Rust type is written `pub`.
    // The two lists must recognise the same shapes; see the invariant test in `test/code/`.
    new RegExp(`^[ \\t]*(?:export\\s+)?(?:declare\\s+)?(?:(?:public|private|protected|internal|static|final|abstract|sealed|partial|pub(?:\\([^)]*\\))?)\\s+)*(?:class|interface|enum|type|struct|trait|record)\\s+${n}\\b`),
    new RegExp(`^[ \\t]*(?:export\\s+)?(?:const|let|var)\\s+${n}\\s*[:=]`),
    new RegExp(`^[ \\t]*def\\s+${n}\\s*\\(`),                                   // Python
    new RegExp(`^[ \\t]*func\\s+(?:\\([^)]*\\)\\s*)?${n}\\s*[(<]`),             // Go
    new RegExp(`^[ \\t]*(?:pub(?:\\([^)]*\\))?\\s+)?(?:async\\s+)?fn\\s+${n}\\b`), // Rust
  ];
}

/**
 * A method inside a class: `async capture(id: string) {`.
 *
 * ⚠️ This pattern has NO keyword anchoring it — every modifier is optional — so on its own it
 * cannot tell a declaration from a CALL at the start of a line (`placeOrder({…});`). It therefore
 * demands one more piece of evidence: the line must OPEN A BLOCK. A call ends in `);`, a
 * declaration ends in `{`.
 *
 * A signature spread across several lines consequently does not match — and that is the right
 * direction: `hashCodeRef` then returns `no-symbol`, i.e. it SAYS it could not read the code,
 * rather than quietly hashing the wrong place.
 */
function looseMethodPattern(symbol: string): RegExp {
  return new RegExp(
    `^[ \\t]*(?:(?:public|private|protected|static|async|override|readonly)\\s+)*${esc(symbol)}\\s*[(<].*\\{[ \\t]*$`,
  );
}

/**
 * A method whose NAME is preceded by a return type: `public List<Order> place(Cart c) {`.
 *
 * Java and C# put the type between the modifiers and the name, which `looseMethodPattern` has no
 * room for — so every method in a Spring, Android or .NET codebase reported `no-symbol` and could
 * not be fingerprinted at all. A constructor (`public Order(Cart c) {`) has no return type and is
 * already covered by the loose pattern above.
 *
 * ⚠️ **A return type is one identifier, and the control keywords are excluded by name.** Without
 * that guard this pattern reads `catch (IOException e) {`, `while (ready) {` and `new Runnable() {`
 * as declarations — every one of them opens a block, so "the line ends in `{`" is not the evidence
 * here that it is for the loose pattern. Hashing a `catch` block as though it were the method
 * would produce a stable, plausible, WRONG fingerprint: `outdated` could never fire again, and
 * nothing would report that it had stopped working.
 *
 * The type is deliberately a single token (plus generics and `[]`), never an expression — so
 * `Runnable r = new Runnable() {` cannot match, because `r = new` is not one token.
 */
function typedMethodPattern(symbol: string): RegExp {
  const MOD =
    '(?:public|private|protected|internal|static|final|abstract|synchronized|native|strictfp|default|sealed|virtual|override|partial|unsafe|extern|async)';
  // Control keywords that can be followed by an identifier and an opening brace. Any of these
  // standing where a return type belongs means the line is a statement, not a declaration.
  const RESERVED =
    '(?:new|return|if|else|while|for|switch|case|catch|finally|do|throw|throws|yield|await|assert|instanceof|super|this|try|lock|using|fixed)';
  // One identifier, optionally generic (`List<Order>`, `Map<String, List<Order>>`) and optionally
  // an array (`String[]`). Never an expression: no `=`, no spaces outside the generic argument.
  const TYPE = `(?!${RESERVED}\\b)[A-Za-z_$][\\w$.]*(?:\\s*<[^;{}()]*>)?(?:\\s*\\[\\s*\\])*`;
  return new RegExp(
    `^[ \\t]*(?:${MOD}\\s+)*(?:<[^;{}()]*>\\s+)?${TYPE}\\s+${esc(symbol)}\\s*\\(.*\\{[ \\t]*$`,
  );
}

/** Is this line a declaration of `symbol`? Exactly one place answers that. */
function isDeclaration(line: string, strict: RegExp[], loose: RegExp, typed: RegExp): boolean {
  return strict.some((re) => re.test(line)) || loose.test(line) || typed.test(line);
}

const sha = (s: string | Buffer): string => createHash('sha256').update(s).digest('hex');

/** A NUL in the first 8 KB is what git itself takes to mean "binary". */
const isBinary = (s: string): boolean => s.slice(0, 8000).includes('\u0000');

export interface StampResult {
  /** `null` when any declared file could not be read — a partial stamp would be a lie. */
  stamp: string | null;
  /** Declared paths that are not on disk, in declared order. */
  missing: string[];
  /** Declared paths that exist but could not be read, with the reason. */
  unreadable?: string[];
}

/**
 * Fingerprint a feature's file set.
 *
 * ⚠️ **Order-independent.** The input is `path:hash` lines SORTED BY PATH, so reordering the
 * `code:` list is not a change. Hashing the files in declared order would report drift for an
 * edit nobody made to the code — and a warning that fires on a cosmetic edit is a warning people
 * learn to skip.
 *
 * ⚠️ **A missing file yields no stamp at all.** Stamping the files that happen to exist would
 * produce a value that looks measured, matches on the next run, and quietly asserts freshness for
 * a feature pointing at a file that is gone.
 */
export function stampFiles(repo: string, files: string[], cache?: Map<string, string>): StampResult {
  const missing: string[] = [];
  const unreadable: string[] = [];
  const lines: string[] = [];
  for (const rel of [...files].sort()) {
    const abs = path.join(repo, rel);
    let source = cache?.get(abs);
    if (source === undefined) {
      if (!fs.existsSync(abs) || !fs.statSync(abs).isFile()) { missing.push(rel); continue; }
      try {
        source = fs.readFileSync(abs, 'utf-8');
      } catch (err) {
        // ⚠️ Reported, not thrown: one unreadable file must not take down every other feature's
        // answer, and it must not be hashed as empty either.
        unreadable.push(`${rel} (${(err as NodeJS.ErrnoException).code ?? 'unreadable'})`);
        continue;
      }
      cache?.set(abs, source);
    }
    // A binary file has no comments and no indentation; decoding it as text maps every invalid byte
    // to the same replacement character, so two different images could hash alike.
    const digest = isBinary(source) ? sha(fs.readFileSync(abs)) : sha(normalise(source, rel));
    lines.push(`${rel}:${digest}`);
  }
  if (missing.length) return { stamp: null, missing };
  if (unreadable.length) return { stamp: null, missing, unreadable };
  if (!lines.length) return { stamp: null, missing };
  return { stamp: PREFIX + sha(lines.join('\n')).slice(0, 16), missing: [] };
}

/** Does this source declare `symbol`? The check behind `entry:`. */
export function declaresSymbol(source: string, symbol: string): boolean {
  const strict = strictPatterns(symbol);
  const loose = looseMethodPattern(symbol);
  const typed = typedMethodPattern(symbol);
  return source.split('\n').some((line) => isDeclaration(line, strict, loose, typed));
}

/**
 * Which of these files declares `symbol` — how "the entry moved" is told apart from "it is gone".
 *
 * Reporting only "not found" would leave the reader to grep for it themselves, which is the work
 * the tool is standing in the repo to do.
 */
export function findSymbolIn(repo: string, symbol: string, candidates: string[]): string | null {
  for (const rel of candidates) {
    let src: string;
    try { src = fs.readFileSync(path.join(repo, rel), 'utf-8'); } catch { continue; }
    if (!src.includes(symbol)) continue; // a cheap filter before running the regexes
    if (declaresSymbol(src, symbol)) return rel;
  }
  return null;
}
