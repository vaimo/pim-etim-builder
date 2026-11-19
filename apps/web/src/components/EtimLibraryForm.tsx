import { Badge, Button, Checkbox, Group, LoadingOverlay, Paper, Select, SimpleGrid, Stack, Text, UnstyledButton } from '@mantine/core';
import { useState } from 'react';
import { defaultBaseLocale, type EtimLibrary, type LibraryLocale } from '../etim/library.js';
import { KEEP_CASE } from '../theme.js';

interface Props {
  library: EtimLibrary;
  busy: boolean;
  /** Imports `base` and then adds `translations`, all from `release`. */
  onSubmit: (release: string, base: LibraryLocale, translations: LibraryLocale[]) => void;
}

/** Pick a pre-loaded ETIM export from `apps/web/etim-files`, one card per release. Renders nothing when there are none. */
export function EtimLibraryForm({ library, busy, onSubmit }: Props) {
  const [releaseName, setReleaseName] = useState<string | null>(library.releases.length === 1 ? library.releases[0]!.name : null);
  const initial = library.releases.length === 1 ? library.releases[0] : undefined;
  const [baseLocale, setBaseLocale] = useState<string | null>(initial ? (defaultBaseLocale(initial) ?? null) : null);
  const [extra, setExtra] = useState<string[]>(
    initial ? initial.locales.map((l) => l.locale).filter((l) => l !== defaultBaseLocale(initial)) : [],
  );

  const release = library.releases.find((r) => r.name === releaseName);
  const pickRelease = (name: string) => {
    const r = library.releases.find((x) => x.name === name);
    setReleaseName(name);
    const base = r ? (defaultBaseLocale(r) ?? null) : null;
    setBaseLocale(base);
    setExtra(r ? r.locales.map((l) => l.locale).filter((l) => l !== base) : []);
  };

  if (library.releases.length === 0) return null;

  const base = release?.locales.find((l) => l.locale === baseLocale);
  const others = release?.locales.filter((l) => l.locale !== baseLocale) ?? [];
  const n = library.releases.length;

  return (
    <Stack gap="sm" pos="relative" data-testid="etim-library">
      <LoadingOverlay visible={busy} overlayProps={{ blur: 1 }} loaderProps={{ children: <Text fw={600}>Reading ETIM files...</Text> }} />
      <div>
        <Text fw={600} data-testid="library-count">
          {n === 1 ? '1 ETIM release is ready to use' : `${n} ETIM releases are ready to use`}
        </Text>
        <Text size="sm" c="dimmed">
          Start by loading {n === 1 ? 'it' : 'one of them'}, the files are already in the app.
        </Text>
      </div>
      <SimpleGrid cols={{ base: 1, xs: 2, md: 3 }} spacing="sm" role="radiogroup" aria-label="ETIM release">
        {library.releases.map((r) => {
          const selected = r.name === releaseName;
          return (
            <UnstyledButton
              key={r.name}
              role="radio"
              aria-checked={selected}
              onClick={() => pickRelease(r.name)}
              data-testid="library-release"
              data-release={r.name}
            >
              <Paper
                withBorder
                p="md"
                h="100%"
                style={{
                  borderColor: selected ? 'var(--mantine-primary-color-filled)' : undefined,
                  borderWidth: selected ? 2 : undefined,
                  background: selected ? 'var(--mantine-primary-color-light)' : undefined,
                }}
              >
                <Text fw={700} size="lg" ff="heading">
                  {r.name}
                </Text>
                <Group gap={4} mt={6}>
                  {r.locales.map((l) => (
                    <Badge key={l.locale} variant="outline" size="sm" styles={KEEP_CASE}>
                      {l.locale}
                    </Badge>
                  ))}
                </Group>
              </Paper>
            </UnstyledButton>
          );
        })}
      </SimpleGrid>
      {release && release.locales.length > 1 && (
        <Group align="flex-end" gap="lg">
          <Select
            label="Main language"
            data={release.locales.map((l) => l.locale)}
            value={baseLocale}
            onChange={(v) => {
              setBaseLocale(v);
              setExtra((list) => [...new Set([...list.filter((l) => l !== v), ...(baseLocale && baseLocale !== v ? [baseLocale] : [])])]);
            }}
            allowDeselect={false}
            w={160}
            data-testid="library-base-locale"
          />
          {others.length > 0 && (
            <Checkbox.Group label="Also add languages" value={extra} onChange={setExtra}>
              <Group gap="md" mb={8}>
                {others.map((l) => (
                  <Checkbox key={l.locale} value={l.locale} label={l.locale} />
                ))}
              </Group>
            </Checkbox.Group>
          )}
        </Group>
      )}
      <Group>
        <Button
          disabled={!release || !base}
          onClick={() => release && base && onSubmit(release.name, base, others.filter((l) => extra.includes(l.locale)))}
          data-testid="library-submit"
        >
          {release ? `Load ${release.name}` : 'Load ETIM release'}
        </Button>
      </Group>
    </Stack>
  );
}
