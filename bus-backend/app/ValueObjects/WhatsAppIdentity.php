<?php

namespace App\ValueObjects;

use App\Services\WhatsApp\PhoneNormalizer;
use InvalidArgumentException;

final readonly class WhatsAppIdentity
{
    private function __construct(
        public ?string $bsuid,
        public ?string $destinationE164,
    ) {}

    public static function fromValues(
        ?string $bsuid,
        ?string $destination,
        PhoneNormalizer $phoneNormalizer,
    ): self {
        $normalizedBsuid = self::normalizeBsuid($bsuid);
        $normalizedDestination = $destination === null
            ? null
            : $phoneNormalizer->normalize($destination);

        if ($normalizedBsuid === null && $normalizedDestination === null) {
            throw new InvalidArgumentException('A verified WhatsApp identity is required.');
        }

        return new self($normalizedBsuid, $normalizedDestination);
    }

    private static function normalizeBsuid(?string $bsuid): ?string
    {
        if ($bsuid === null) {
            return null;
        }

        $value = trim($bsuid);
        if ($value === '' || strlen($value) > 255 || preg_match('/[\x00-\x1F\x7F]/', $value)) {
            throw new InvalidArgumentException('The WhatsApp identity is invalid.');
        }

        return $value;
    }
}
