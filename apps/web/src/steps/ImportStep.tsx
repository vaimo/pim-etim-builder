import { Alert, Badge, Button, Group, Paper, Stack, Text } from '@mantine/core';
import { SubStep } from '../components/SubStep.js';
import { SUB_STEPS } from '../workspace/sections.js';
import type { EtimTableName } from '@vaimo-pim-etim-builder/core';
import { useState } from 'react';
import { CollapsibleBox } from '../components/CollapsibleBox.js';
import { EtimLibraryForm } from '../components/EtimLibraryForm.js';
import { EtimUploadForm, type TableFiles } from '../components/EtimUploadForm.js';
import { IssueCounts, IssueList } from '../components/IssueList.js';
import { MissingClassesAlert } from '../components/MissingClassesAlert.js';
import { ReleaseSummary } from '../components/ReleaseSummary.js';
import type { EtimJobFile } from '../etim/etimJob.js';
import { importLibraryRelease } from '../etim/importLibrary.js';
import type { LibraryLocale } from '../etim/library.js';
import { runEtimJob } from '../etim/runEtimJob.js';
import { useEtimLibrary } from '../etim/useEtimLibrary.js';
import { useAppDispatch, useAppState } from '../state/AppStateContext.js';
import { isReleaseReady } from '../state/appState.js';
import { KEEP_CASE } from '../theme.js';

async function readFiles(files: TableFiles): Promise<{ jobFiles: EtimJobFile[]; fileNames: string[] }> {
  const entries = Object.entries(files) as [EtimTableName, File][];
  const jobFiles = await Promise.all(entries.map(async ([table, file]) => ({ table, bytes: await file.arrayBuffer() })));
  return { jobFiles, fileNames: entries.map(([, file]) => file.name) };
}

export function ImportStep() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const { release, imports } = state;
  const [busy, setBusy] = useState<'base' | 'translation' | undefined>();
  const [failure, setFailure] = useState<string | undefined>();
  const [showReplace, setShowReplace] = useState(false);
  const library = useEtimLibrary();
  const hasLibrary = (library?.releases.length ?? 0) > 0;
  // Remounts the forms after a successful upload so they start empty.
  const [formKey, setFormKey] = useState(0);

  async function importBase(locale: string, files: TableFiles) {
    setBusy('base');
    setFailure(undefined);
    try {
      const { jobFiles, fileNames } = await readFiles(files);
      const result = await runEtimJob({ kind: 'import', locale, files: jobFiles });
      dispatch({ type: 'baseImported', locale, fileNames, result });
      setShowReplace(false);
      setFormKey((k) => k + 1);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(undefined);
    }
  }

  async function importTranslation(locale: string, files: TableFiles) {
    if (!release) return;
    setBusy('translation');
    setFailure(undefined);
    try {
      const { jobFiles, fileNames } = await readFiles(files);
      const result = await runEtimJob({ kind: 'translate', locale, release, files: jobFiles });
      dispatch({ type: 'translationImported', locale, fileNames, result });
      setFormKey((k) => k + 1);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(undefined);
    }
  }

  async function importLibrary(releaseName: string, base: LibraryLocale, translations: LibraryLocale[]) {
    setBusy('base');
    setFailure(undefined);
    try {
      await importLibraryRelease(dispatch, releaseName, base, translations);
      setShowReplace(false);
      setFormKey((k) => k + 1);
    } catch (error) {
      setFailure(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(undefined);
    }
  }

  const baseErrors = release !== undefined && !isReleaseReady(state);
  const upload = (
    <EtimUploadForm
      key={`base-${formKey}`}
      mode="base"
      busy={busy === 'base'}
      existingLocales={release?.locales ?? []}
      submitLabel="Load ETIM release"
      onSubmit={(locale, files) => void importBase(locale, files)}
    />
  );

  return (
    <Stack gap="lg" mt="md">
      {failure && (
        <Alert color="red" title="The files could not be read" withCloseButton onClose={() => setFailure(undefined)}>
          {failure}
        </Alert>
      )}

      <SubStep
        step={SUB_STEPS.etimVersion}
        description={
          release
            ? 'The ETIM release the project is built on, with the languages added to it.'
            : hasLibrary
              ? 'Load the ETIM release the project is built on.'
              : 'Load the ETIM release the project is built on.'
        }
        aside={
          release &&
          !showReplace && (
            <Button size="xs" variant="default" onClick={() => setShowReplace(true)}>
              Replace ETIM version
            </Button>
          )
        }
        testId="sub-step-etim-version"
      >
        {release && <ReleaseSummary release={release} />}
        {baseErrors && (
          <Alert color="red" title="The ETIM release has errors">
            Fix the files and load them again to continue. Missing tables or columns are errors.
          </Alert>
        )}
        {release && <MissingClassesAlert />}
        {imports.map((entry, i) => (
          <Paper key={i} withBorder p="sm" data-testid="import-entry">
            <Group justify="space-between" mb={entry.issues.length > 0 ? 'xs' : 0}>
              <Group gap="xs">
                <Badge variant="outline" styles={KEEP_CASE}>{entry.locale}</Badge>
                <Text fw={600}>{entry.kind === 'base' ? 'ETIM release' : 'Translation'}</Text>
                <Text size="sm" c="dimmed">
                  {entry.fileNames.length} files
                </Text>
                {!entry.applied && (
                  <Badge color="red" variant="filled">
                    Not added
                  </Badge>
                )}
              </Group>
              <IssueCounts issues={entry.issues} />
            </Group>
            <IssueList issues={entry.issues} />
          </Paper>
        ))}
        {(!release || showReplace) && (
          <Paper
            withBorder
            p="md"
            style={!release && hasLibrary ? { borderColor: 'var(--mantine-primary-color-filled)', borderWidth: 2 } : undefined}
          >
            {release && (
              <>
                <Text fw={600} mb={4}>
                  Replace ETIM version
                </Text>
                <Text size="sm" c="dimmed" mb="sm">
                  A new export replaces the current release and all added languages. Selected classes are kept.
                </Text>
              </>
            )}
            {library && hasLibrary && (
              <EtimLibraryForm
                key={`library-${formKey}`}
                library={library}
                busy={busy === 'base'}
                onSubmit={(name, base, translations) => void importLibrary(name, base, translations)}
              />
            )}
            {library && !hasLibrary && upload}
          </Paper>
        )}
        {(!release || showReplace) && hasLibrary && (
          <CollapsibleBox title="Or load an ETIM release from files" defaultOpen={false} testId="etim-upload">
            {upload}
          </CollapsibleBox>
        )}
      </SubStep>

      {release && !baseErrors && (
        <SubStep
          step={SUB_STEPS.addLanguage}
          collapsible
          defaultOpen={false}
          description="Upload the ETIM export in another language to add its labels to the release."
          testId="add-language"
        >
          <EtimUploadForm
            key={`translation-${formKey}`}
            mode="translation"
            busy={busy === 'translation'}
            existingLocales={release.locales}
            submitLabel="Add language"
            onSubmit={(locale, files) => void importTranslation(locale, files)}
          />
        </SubStep>
      )}
    </Stack>
  );
}
