/**
 * Every word a visitor can read in the generated panels, in one file.
 *
 * Each entry carries its provenance. Nothing here was written for the panels:
 * it is either a string that already existed on this profile, or a label
 * GitHub itself uses in its own UI. Change a value here and every panel
 * that shows it changes with it.
 */

/**
 * Replaces em and en dashes (U+2014, U+2013) with an ASCII hyphen.
 * Applied to upstream text (repo descriptions, bio) that predates the
 * no-dash rule, so generated SVGs never carry those bytes. The codepoints are
 * written as escapes so this file does not contain them either.
 */
export const sanitize = (s = '') =>
  s.replace(/\s*[\u2014\u2013]\s*/g, ' - ').replace(/\s+/g, ' ').trim();

export const STRINGS = {
  // Provenance: GitHub profile "name" field.
  name: 'Arnav Goel',
  // Provenance: GitHub profile "bio" field, verbatim.
  bio: 'An efficient coder who is obsessed with gadgets.',
  // Provenance: GitHub profile "blog" field.
  site: 'arnavgoel.dev',

  // Provenance: GitHub's own profile UI vocabulary.
  contributions: 'CONTRIBUTIONS',
  repositories: 'REPOSITORIES',
  languages: 'LANGUAGES',
  joined: 'JOINED',
  // Provenance: GitHub's own contribution-graph caption.
  lastYear: 'in the last year',

  // Provenance: existing README line "UC GPA 3.911".
  ucGpa: 'UC GPA',
  // Provenance: existing README line "graduating June 2026".
  graduating: 'GRADUATING',
};

/**
 * Month initials for the contribution axis. Calendar data, not authored copy.
 */
export const MONTHS = ['J','F','M','A','M','J','J','A','S','O','N','D'];

/**
 * Which public repos appear in the showcase strip, in display order.
 * Coursework and exercise repos are deliberately excluded.
 * Descriptions are pulled live from GitHub, never retyped here.
 */
export const SHOWCASE = [
  'watch-together',
  'cue',
  'region-earth',
  'simplegames',
  'portfolio',
  'goels-of-banda',
  'redbull-youtube-analytics',
  'Power-grid-analysis',
];
