<?php

namespace App\Imports;

use Maatwebsite\Excel\Concerns\WithHeadingRow;
use Maatwebsite\Excel\Concerns\ToArray;
use Maatwebsite\Excel\Concerns\WithLimit;

/**
 * Reads only the heading row from an Excel file.
 * Used by parseImportHeaders to extract column names
 * without loading the entire file into memory.
 */
class HeadersOnlyImport implements ToArray, WithHeadingRow, WithLimit
{
    private array $headers = [];

    public function array(array $rows): void
    {
        // We only need one data row to discover the heading keys
        if (!empty($rows)) {
            $this->headers = array_keys($rows[0]);
        }
    }

    public function limit(): int
    {
        return 1; // Read 1 data row only (heading row is automatic)
    }

    public function getHeaders(): array
    {
        return $this->headers;
    }
}
