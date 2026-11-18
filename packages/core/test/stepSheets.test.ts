import { unzipSync, strFromU8 } from 'fflate';
import { describe, expect, it } from 'vitest';
import { featureMappingTables, sourceValueTables, writeXlsx, type Cell, type Project, type Table } from '../src/index.js';
import { project, release } from './helpers.js';

function mapped(patch: Partial<Project> = {}): Project {
  return project({
    features: {
      EF005644: { sources: [{ attribute: 'att_fastening' }] },
      EF000139: { skipped: true },
      EF015003: { sources: [{ attribute: 'att_finish', yesValues: ['zinc'] }] },
    },
    sourceAttributes: [{ code: 'att_fastening', type: 'akeneo_reference_entity', labels: {}, referenceDataName: 'fastening' }],
    sourceEntities: [
      {
        code: 'fastening',
        records: [
          { code: 'eye', labels: { en_US: 'Eye' }, values: { EF005644: 'EV023258' }, classValues: { EC000009: { EF005644: 'EV008374' } } },
          { code: 'hook', labels: {}, values: {} },
        ],
      },
    ],
    sourceOptions: { att_finish: [{ code: 'zinc', labels: { en_US: 'Zinc' } }, { code: 'none', labels: {} }] },
    ...patch,
  });
}

/** Rows as objects keyed by the header, for readable expectations. */
function records(table: Table): Record<string, Cell>[] {
  const [header, ...rows] = table.rows;
  return rows.map((r) => Object.fromEntries(header!.map((h, i) => [String(h), r[i]])));
}

describe('featureMappingTables', () => {
  it('lists every feature with its mapping status, source and reference entity', () => {
    const [sheet, ...rest] = featureMappingTables(release(), mapped());
    expect(rest).toEqual([]);
    expect(sheet!.name).toBe('Feature mapping');
    const byFeature = Object.fromEntries(records(sheet!).map((r) => [r.Feature, r]));
    expect(byFeature.EF005644).toMatchObject({
      'ETIM type': 'A',
      'Mapping status': 'Mapped',
      'Source attribute': 'att_fastening',
      'Reference entity': 'fastening',
    });
    expect(byFeature.EF000139).toMatchObject({ 'Mapping status': 'Skipped', 'Source attribute': '' });
    expect(byFeature.EF015003).toMatchObject({ 'ETIM type': 'L', 'Yes values': 'zinc', 'Reference entity': undefined });
    expect(byFeature.EF000100).toMatchObject({ 'ETIM type': 'R', Unit: 'EU570073', 'Unit label': '°C', 'Mapping status': 'Not mapped' });
  });
});

describe('sourceValueTables', () => {
  it('has the records of 5.1 and the L source values of 5.2', () => {
    const [recordSheet, valueSheet, ...rest] = sourceValueTables(release(), mapped());
    expect(rest).toEqual([]);
    expect(recordSheet!.name).toBe('Source records');
    expect(records(recordSheet!).map((r) => [r.Record, r['Label en_US'], r.Class, r['ETIM value'], r.Status])).toEqual([
      ['eye', 'Eye', undefined, 'EV023258', 'Mapped'],
      ['eye', 'Eye', 'EC000009', 'EV008374', 'Class value'],
      ['hook', undefined, undefined, undefined, 'Not mapped'],
    ]);
    expect(valueSheet!.name).toBe('Source values');
    expect(records(valueSheet!).map((r) => [r['Source attribute'], r.Feature, r['Source value'], r['Value label en_US'], r['Means yes'], r.Status])).toEqual([
      ['att_finish', 'EF015003', 'zinc', 'Zinc', 'Yes', 'Mapped'],
      ['att_finish', 'EF015003', 'none', undefined, 'No', 'Mapped'],
    ]);
  });

  it('marks Yes/No sources as copied and sources without values or yes values as not mapped', () => {
    const copied = mapped({ features: { EF015003: { sources: [{ attribute: 'att_bool' }] } } });
    expect(records(sourceValueTables(release(), copied)[1]!).map((r) => r.Status)).toEqual(['Yes/No attribute, copied']);
    const open = mapped({ features: { EF015003: { sources: [{ attribute: 'att_finish' }] } } });
    expect(records(sourceValueTables(release(), open)[1]!).map((r) => r.Status)).toEqual(['Not mapped', 'Not mapped']);
  });

  it('writes a workbook with both sheets', () => {
    const files = unzipSync(writeXlsx(sourceValueTables(release(), mapped())));
    const workbook = strFromU8(files['xl/workbook.xml']!);
    expect(workbook).toContain('name="Source records"');
    expect(workbook).toContain('name="Source values"');
  });
});
