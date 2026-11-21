import { createHash } from 'node:crypto';

export class ContentHasher {
  hash(content: string): string {
    const normalized = content.replace(/\r\n/g, '\n');
    return createHash('sha256').update(normalized, 'utf8').digest('hex');
  }
}
