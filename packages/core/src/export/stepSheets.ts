import { collectProjectFeatures } from '../akeneo/features.js';
import { collectSourceEntities, isRecordValueAllowed, isRecordValueSkipped, type SourceEntityPlan } from '../akeneo/sourceEntities.js';
import { collectLogicalSources } from '../akeneo/sourceOptions.js';
import { classRecordAttribute, sourceEntityFor, sourceRecordAttribute } from '../akeneo/sourceRecords.js';
import { labelFor } from '../etim/labels.js';
import type { EtimRelease } from '../etim/types.js';
import { mappingStatus } from '../project/sources.js';
import type { Project } from '../project/types.js';
import type { Table } from './table.js';

/**
 * Excel sheets of single workspace steps, for review with the client while mapping: 4.2 Map features, and 5.1
 * Reference entity records with 5.2 Source values in one workbook. Labels in the first project locale, like the
 * mapping report.
 */

const STATUS_TEXT = { mapped: 'Mapped', skipped: 'Skipped', unmapped: 'Not mapped' } as const;

function texts(release: EtimRelease, project: Project) {
  const locale = project.locales[0];
  return {
    feature: (id: string) => labelFor(release.features[id]?.labels ?? {}, locale),
    value: (id: string | undefined) => (id ? labelFor(release.values[id]?.labels ?? {}, locale) : ''),
    unit: (id: string | undefined) => (id ? labelFor(release.units[id]?.labels ?? {}, locale) : ''),
  };
}

/** 4.2 Map features: one row per feature+unit of the selected classes, with its source and mapping status. */
export function featureMappingTables(release: EtimRelease, project: Project): Table[] {
  const text = texts(release, project);
  const { features } = collectProjectFeatures(release, project);
  return [
    {
      name: 'Feature mapping',
      rows: [
        [
          'Feature',
          'Label',
          'ETIM type',
          'Unit',
          'Unit label',
          'Classes',
          'Mapping status',
          'Source attribute',
          'Second source',
          'Yes values',
          'Reference entity',
        ],
        ...features.map((f) => {
          const sources = project.features[f.key]?.sources ?? [];
          const first = sources[0];
          return [
            f.featureId,
            text.feature(f.featureId),
            f.type,
            f.unitId,
            text.unit(f.unitId),
            f.classIds.join(', '),
            STATUS_TEXT[mappingStatus(project.features[f.key])],
            sources.map((s) => s.attribute).join(', '),
            sources.map((s) => s.second ?? '').filter(Boolean).join(', '),
            sources.flatMap((s) => s.yesValues ?? []).join(', '),
            f.type === 'A' && first ? sourceEntityFor(project, first.attribute) : undefined,
          ];
        }),
      ],
    },
  ];
}

/**
 * 5.1 Reference entity records: one row per record and feature, then a row per class value of that feature, as
 * filled by the 07 record files. Shared with the mapping report.
 */
export function sourceRecordsSheet(release: EtimRelease, project: Project, sourceEntities: readonly SourceEntityPlan[]): Table {
  const text = texts(release, project);
  return {
    name: 'Source records',
    rows: [
      [
        'Reference entity',
        'Record',
        ...project.locales.map((l) => `Label ${l}`),
        'Feature',
        'Feature label',
        'Class',
        'ETIM value',
        'Value label',
        'Record attribute',
        'Status',
      ],
      ...sourceEntities.flatMap((e) =>
        e.records.flatMap((r) =>
          e.features.flatMap((f) => {
            const row = (classId: string | undefined, valueId: string | undefined, status: string) => [
              e.code,
              r.code,
              ...project.locales.map((l) => r.labels[l]),
              f.featureId,
              text.feature(f.featureId),
              classId,
              valueId,
              text.value(valueId),
              classId ? classRecordAttribute(project, f.featureId, classId) : sourceRecordAttribute(project, f.featureId),
              status,
            ];
            const valueId = r.values[f.featureId];
            const classRows = Object.entries(r.classValues ?? {})
              .filter(([, values]) => values[f.featureId])
              .sort(([a], [b]) => (a < b ? -1 : 1))
              .map(([classId, values]) => {
                const id = values[f.featureId]!;
                const allowed = f.classValueIds[classId];
                const status = !allowed
                  ? 'Ignored, class not selected or not using the feature'
                  : !isRecordValueAllowed(allowed, id)
                    ? 'Not allowed by ETIM in the class'
                    : 'Class value';
                return row(classId, id, status);
              });
            const status = !valueId
              ? isRecordValueSkipped(r, f.featureId)
                ? 'Skipped'
                : 'Not mapped'
              : isRecordValueAllowed(f.valueIds, valueId)
                ? 'Mapped'
                : 'Not allowed by ETIM';
            return [row(undefined, valueId, status), ...classRows];
          }),
        ),
      ),
    ],
  };
}

/**
 * 5.2 Source values of L features: per source attribute and feature, one row per source value saying whether it
 * means yes. A Yes/No source is copied and gets one row per feature.
 */
export function sourceValuesSheet(release: EtimRelease, project: Project): Table {
  const text = texts(release, project);
  return {
    name: 'Source values',
    rows: [
      [
        'Source attribute',
        'Akeneo type',
        'Feature',
        'Feature label',
        'Source value',
        ...project.locales.map((l) => `Value label ${l}`),
        'Means yes',
        'Status',
      ],
      ...collectLogicalSources(release, project).flatMap((plan) =>
        plan.features.flatMap((f) => {
          const row = (value: string | undefined, labels: Record<string, string>, yes: string | undefined, status: string) => [
            plan.attribute,
            plan.type,
            f.featureId,
            text.feature(f.featureId),
            value,
            ...project.locales.map((l) => labels[l]),
            yes,
            status,
          ];
          if (plan.boolean) return [row(undefined, {}, undefined, 'Yes/No attribute, copied')];
          if (plan.options.length === 0) return [row(undefined, {}, undefined, 'Not mapped, no source values')];
          const status = f.yesValues.length === 0 ? 'Not mapped' : 'Mapped';
          return plan.options.map((o) =>
            row(o.code, o.labels, f.yesValues.includes(o.code) ? 'Yes' : 'No', o.listed ? status : `${status}, value not in the option list`),
          );
        }),
      ),
    ],
  };
}

/** 5.1 and 5.2 in one workbook. */
export function sourceValueTables(release: EtimRelease, project: Project): Table[] {
  return [sourceRecordsSheet(release, project, collectSourceEntities(release, project).entities), sourceValuesSheet(release, project)];
}
