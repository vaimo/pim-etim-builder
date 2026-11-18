import { writeXlsx, type Table } from '@vaimo-pim-etim-builder/core';
import { Button, Tooltip } from '@mantine/core';
import { downloadFile } from '../export/download.js';
import { mimeType } from '../export/exportFiles.js';

interface Props {
  fileName: string;
  /** Builds the sheets when clicked, so nothing is computed until the file is wanted. */
  tables: () => Table[];
  tooltip: string;
  testId: string;
}

/** Small button next to a sub step title that downloads the sub step as an Excel file. */
export function ExcelDownload({ fileName, tables, tooltip, testId }: Props) {
  return (
    <Tooltip label={tooltip}>
      <Button
        size="xs"
        variant="default"
        style={{ flexShrink: 0 }}
        onClick={() => downloadFile(fileName, writeXlsx(tables()), mimeType(fileName))}
        data-testid={testId}
      >
        Export to Excel
      </Button>
    </Tooltip>
  );
}
