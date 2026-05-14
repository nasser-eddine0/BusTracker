<?php

namespace App\Imports;

use App\Models\Student;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Maatwebsite\Excel\Concerns\ToCollection;
use Maatwebsite\Excel\Concerns\WithHeadingRow;

class StudentsImport implements ToCollection, WithHeadingRow
{
    /**
     * Dynamic column mapping: DB field => Excel header key.
     *
     * Example: ['student_name' => 'nom_eleve', 'parent_cin' => 'cin_du_pere', ...]
     */
    private array $mapping;

    public function __construct(array $mapping = [])
    {
        $this->mapping = $mapping;
    }

    /**
     * Read a value from a row using the dynamic mapping.
     * Falls back to null if the mapping key or row value doesn't exist.
     */
    private function mapped(Collection $row, string $field): ?string
    {
        $excelKey = $this->mapping[$field] ?? null;

        if ($excelKey === null) {
            return null;
        }

        // Normalize: lowercase, strip everything except letters and digits
        $normalize = fn(string $s): string => preg_replace('/[^a-z0-9]/', '', strtolower($s));
        $target = $normalize($excelKey);

        // Try direct access first (fastest path)
        $value = $row->get($excelKey);

        // If not found, search through ALL row keys with normalized comparison
        // This handles any difference between Str::slug() and Maatwebsite's heading formatter
        if ($value === null) {
            foreach ($row as $key => $val) {
                if ($normalize((string) $key) === $target) {
                    $value = $val;
                    break;
                }
            }
        }

        if ($value === null) {
            return null;
        }

        $trimmed = trim((string) $value);
        return $trimmed !== '' ? $trimmed : null;
    }

    private function normalizedAddress(?string $address): ?string
    {
        if ($address === null) {
            return null;
        }

        return strcasecmp($address, 'unknown') === 0 ? null : $address;
    }

    public function collection(Collection $rows)
    {
        DB::transaction(function () use ($rows) {
            foreach ($rows as $row) {
                $parentCin  = $this->mapped($row, 'parent_cin');
                $studentName = $this->mapped($row, 'student_name');

                // Skip rows missing critical data
                if (empty($parentCin) || empty($studentName)) {
                    continue;
                }

                // 1. Find or Create the Parent using CIN as unique key
                $plainPassword = 'Bus' . rand(1000, 9999);
                $parent = User::firstOrCreate(
                    ['cin' => $parentCin],
                    [
                        'name'             => $this->mapped($row, 'parent_name') ?? 'Parent',
                        'email'            => $this->mapped($row, 'parent_email') ?? strtolower($parentCin) . '@parent.generated',
                        'phone'            => $this->mapped($row, 'parent_phone'),
                        'password'         => Hash::make($plainPassword),
                        'default_password' => $plainPassword,
                        'role'             => 'parent',
                        'status'           => 'active',
                    ]
                );

                // If the parent already existed, update with any new Excel data
                if (!$parent->wasRecentlyCreated) {
                    $updates = [];
                    $excelName  = $this->mapped($row, 'parent_name');
                    $excelEmail = $this->mapped($row, 'parent_email');
                    $excelPhone = $this->mapped($row, 'parent_phone');

                    if ($excelName)  $updates['name']  = $excelName;
                    if ($excelEmail) $updates['email'] = $excelEmail;
                    if ($excelPhone) $updates['phone'] = $excelPhone;

                    if (!empty($updates)) {
                        $parent->update($updates);
                    }
                }

                // 2. Find or Create the Student (unique combo: name + parent)
                $student = Student::firstOrCreate(
                    [
                        'full_name' => $studentName,
                        'parent_id' => $parent->id,
                    ],
                    [
                        'reg_code'           => strtoupper(Str::random(8)),
                        'address'            => $this->normalizedAddress($this->mapped($row, 'student_address')) ?? 'N/A',
                        'grade'              => $this->mapped($row, 'grade'),
                        'bus_id'             => null,
                        'home_lat'           => null,
                        'home_lng'           => null,
                        'latitude'           => null,
                        'longitude'          => null,
                        'location_conformee' => false,
                        'status'             => 'waiting',
                    ]
                );

                // If the student already existed, update mutable fields
                if (!$student->wasRecentlyCreated) {
                    $student->update([
                        'address' => $this->normalizedAddress($this->mapped($row, 'student_address')) ?? $this->normalizedAddress($student->address) ?? 'N/A',
                        'grade'   => $this->mapped($row, 'grade') ?? $student->grade,
                    ]);
                }
            }
        });
    }
}
