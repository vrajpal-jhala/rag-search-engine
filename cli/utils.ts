import { PorterStemmer } from 'natural';
import STOP_WORDS from '../dataset/stop_words.json';

export const sanitizeText = (text: string): string => {
  text = text.toLowerCase().trim();
  // Keep letters (\p{L}), numbers (\p{N}), and spaces (\s)
  text = text.replace(/[^\p{L}\p{N}\s]/gu, '');

  return text;
};

export const tokenizeText = (text: string): string[] => {
  return text
    .split(/\s+/)
    .filter((token) => !STOP_WORDS.includes(token))
    .map((token) => PorterStemmer.stem(token))
    .filter(Boolean);
};

export const partialMatch = (
  tokens: string[],
  queryTokens: string[],
): boolean => {
  return tokens.some((token) =>
    queryTokens.some((queryToken) => queryToken.includes(token)),
  );
};
