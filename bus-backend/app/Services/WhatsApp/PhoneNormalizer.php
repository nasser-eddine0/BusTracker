<?php

namespace App\Services\WhatsApp;

use InvalidArgumentException;

final class PhoneNormalizer
{
    public function normalize(string $phone): string
    {
        $value = trim($phone);
        if ($value === '' || preg_match('/[A-Za-z]/', $value)) {
            throw new InvalidArgumentException('The phone number is invalid.');
        }

        if (! preg_match('/^[+0-9\s().-]+$/', $value)) {
            throw new InvalidArgumentException('The phone number is invalid.');
        }

        $compact = preg_replace('/[\s().-]+/', '', $value);
        $digits = match (true) {
            str_starts_with($compact, '+') => substr($compact, 1),
            str_starts_with($compact, '00') => substr($compact, 2),
            default => $compact,
        };

        if (preg_match('/^0([67]\d{8})$/', $digits, $matches)) {
            return '+212'.$matches[1];
        }

        if (preg_match('/^2120?([67]\d{8})$/', $digits, $matches)) {
            return '+212'.$matches[1];
        }

        throw new InvalidArgumentException('The phone number is invalid.');
    }
}
