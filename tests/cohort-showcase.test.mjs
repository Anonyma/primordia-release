import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const script = await readFile(new URL('../scripts/cohort-showcase.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../styles/cohort-showcase.css', import.meta.url), 'utf8');
const heroCss = await readFile(new URL('../styles/hero.css', import.meta.url), 'utf8');
const heroJs = await readFile(new URL('../scripts/hero.js', import.meta.url), 'utf8');
const showcaseSource = `${html}\n${script}\n${css}`;

test('uses the canonical Primordia homepage outside the Cohort showcase', () => {
  for (const landmark of [
    'Funding Early Biology Experiments in DIY Labs',
    'What is Primordia?',
    'How it Works',
    'Primordia is on a mission to seed the next wave of community biotech',
    'FAQs',
  ]) {
    assert.match(html, new RegExp(landmark.replace(/[?]/g, '\\?')));
  }
});

test('renders the Figma-spec hero section with the grainy illustration and twin CTAs', () => {
  // DOM structure: two overlapping rounded rectangles (top-right + bottom-left)
  assert.match(html, /<section class="section hero-section"[^>]*>/);
  assert.match(html, /<div class="hero-scale-clip">/);
  assert.match(html, /<div class="hero-stage">/);
  assert.match(html, /<div class="hero-blob"[^>]*>/);
  assert.match(html, /<img class="hero-blob__img"[^>]*src="\/images\/primordia_hero_shape\.(webp|png)"/);
  assert.match(html, /<h1 class="hero-wordmark">PRIMORDIA<\/h1>/);
  assert.match(html, /<h2 class="hero-title">[\s\S]*Funding Early Biology Experiments in DIY Labs[\s\S]*<\/h2>/);
  assert.match(html, /<a class="hero-cta hero-cta--apply" href="\/apply">[\s\S]*Up to \$3000 for your project/);
  assert.match(html, /<a class="hero-cta hero-cta--fund" href="\/fund-experiments">[\s\S]*Support with as little as 1\$\/month/);

  // Self-contained CSS follows the Figma positions
  assert.match(heroCss, /\.hero-blob__img\s*\{/);
  assert.match(html, /primordia_hero_shape\.(webp|png)/);
  assert.match(heroCss, /background:\s*#ffffff/);
  assert.match(heroCss, /\.hero-wordmark[\s\S]*font-family:\s*'Jost'/);
  assert.match(heroCss, /\.hero-wordmark[\s\S]*letter-spacing:\s*-0\.08em/);
  assert.match(heroCss, /\.hero-title[\s\S]*text-align:\s*right/);
  assert.match(heroCss, /\.hero-cta--fund \.hero-cta__btn[\s\S]*background:\s*#000/);

  // Responsive scale script keeps the 1440-stage composition intact
  assert.match(heroJs, /scale\(/);
  assert.match(heroJs, /VISIBLE_H|660|680|700/);
  assert.match(heroCss, /section\.section\.hero-section/);
  assert.match(heroJs, /1440/);
});

test('loads the Jost family so the Futura-spec wordmark renders even without Futura', () => {
  assert.match(html, /Jost:500,600,700/);
});

test('does not keep the unfunded-experiments placeholder CTA', () => {
  assert.doesNotMatch(html, /View Funded Experiments|Coming soon/);
});

test('tightens the space between showcase CTAs and the FAQ section', () => {
  assert.match(css, /cohort-showcase-followup/);
  assert.match(css, /cohort-showcase-followup\s*>\s*\.container/);
  assert.match(css, /cohort-showcase-followup \+ \.section > \.container/);
  assert.match(css, /padding-bottom:\s*1rem/);
  assert.match(css, /padding-top:\s*1\.25rem/);
});

test('has a static image-rich Cohort showcase with no rotation controls', () => {
  for (const marker of [
    'data-cohort-showcase',
    'data-cohort-grid',
    'cohort-project-image',
  ]) {
    assert.match(showcaseSource, new RegExp(marker));
  }
  for (const removed of [
    'data-cohort-mode="all"',
    'data-cohort-mode="featured"',
    'data-cohort-action="previous"',
    'data-cohort-action="next"',
    'data-cohort-action="toggle-playback"',
    'data-cohort-project-jumpers',
    'Feature project',
    'Featured rotation',
    'Pause rotation',
  ]) {
    assert.doesNotMatch(showcaseSource, new RegExp(removed));
  }
});

test('shows the seven canonical Cohort 1 projects and removes the example projects', () => {
  for (const project of [
    'Mitochondrial Transfer into Granulocytes',
    'Open-Access Albumin-Binding Domains for Nanobody Half-Life Extension',
    'Valonia ventricosa Genome Sequencing',
    'mRNA-Based Reprogramming of Macrophage Inflammation in Diabetic Wounds',
    'Banana Pith Cellulose Nanofibers for Sustainable Cosmetics',
    'Carroucell: Automated Carousel Staining Battery',
    'Open-Synth — Decentralized Enzymatic DNA Synthesis Platform',
  ]) {
    assert.match(script, new RegExp(project.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.doesNotMatch(html, /Real Vegan Cheese|Bento Bio|Open Insulin Project/);
});
