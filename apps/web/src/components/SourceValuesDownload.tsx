import { sourceValueTables, type EtimRelease, type Project } from '@vaimo-pim-etim-builder/core';
import { stepFileName } from '../export/exportFiles.js';
import { ExcelDownload } from './ExcelDownload.js';

/** Steps 5.1 and 5.2 in one Excel file, from the step 5 heading. */
export function SourceValuesDownload({ release, project }: { release: EtimRelease; project: Project }) {
  return (
    <ExcelDownload
      fileName={stepFileName(project, 'source-values')}
      tables={() => sourceValueTables(release, project)}
      tooltip="5.1 and 5.2 in one file: the ETIM value of every record per feature, and the yes values of the L feature sources"
      testId="export-source-values"
    />
  );
}
