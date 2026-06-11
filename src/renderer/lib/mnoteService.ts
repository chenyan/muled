import {
  appendMnoteEntryToContent,
  createMnoteDocument,
  generateMnoteEntryId,
} from './mnoteFormat';
import { appendFingerprintToLoc } from './mnoteFingerprint';
import { companionMnotePath } from './mnotePath';

export interface AppendMnoteEntryInput {
  loc: string;
  quote?: string;
  body?: string;
  label?: string;
}

export interface AppendMnoteEntryResult {
  mnotePath: string;
  content: string;
  entryId: string;
}

export async function appendMnoteEntry(
  sourcePath: string,
  input: AppendMnoteEntryInput,
): Promise<AppendMnoteEntryResult> {
  const mnotePath = companionMnotePath(sourcePath);
  const { exists } = await window.muled.workspace.exists(mnotePath);

  let content = '';
  if (exists) {
    const file = await window.muled.file.read(mnotePath);
    content = file.content;
  } else {
    await window.muled.workspace.createFile(mnotePath);
    content = createMnoteDocument(sourcePath);
  }

  const entryId = generateMnoteEntryId(content);
  const loc = appendFingerprintToLoc(input.loc, input.quote);
  const next = appendMnoteEntryToContent(content, {
    id: entryId,
    loc,
    created: new Date().toISOString(),
    label: input.label,
    quote: input.quote,
    body: input.body,
  });

  await window.muled.file.write(mnotePath, next);
  return { mnotePath, content: next, entryId };
}
