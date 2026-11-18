const REDACTED = '[censurado]';

// The double g keeps words like "Nigeria" intact.
const SLURS = [
  /\bn[\s._-]*[i1!]+[\s._-]*g[\s._-]*g+[\s._-]*[ae3]+(?:[\s._-]*r+)?s?(?:[\s._-]*man\b)?/gi,
  /\bf[a4]+g+[o0]+t+s?\b/gi,
];

export const redactSlurs = (text: string): string =>
  SLURS.reduce((result, pattern) => result.replace(pattern, REDACTED), text);
