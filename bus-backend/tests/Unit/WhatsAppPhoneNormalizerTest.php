<?php

namespace Tests\Unit;

use App\Services\WhatsApp\PhoneNormalizer;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class WhatsAppPhoneNormalizerTest extends TestCase
{
    #[DataProvider('validMoroccanMobileNumbers')]
    public function test_it_normalizes_supported_moroccan_mobile_numbers(string $input, string $expected): void
    {
        $this->assertSame($expected, (new PhoneNormalizer)->normalize($input));
    }

    public static function validMoroccanMobileNumbers(): array
    {
        return [
            'domestic 06' => ['0612345678', '+212612345678'],
            'domestic 07' => ['0712345678', '+212712345678'],
            'country code' => ['212612345678', '+212612345678'],
            'international prefix' => ['00212712345678', '+212712345678'],
            'redundant domestic zero' => ['+2120612345678', '+212612345678'],
            'formatted' => ['+212 (0) 7-12-34-56-78', '+212712345678'],
        ];
    }

    #[DataProvider('invalidNumbers')]
    public function test_it_rejects_invalid_or_unsupported_numbers(string $input): void
    {
        try {
            (new PhoneNormalizer)->normalize($input);
            $this->fail('Invalid phone input was accepted.');
        } catch (InvalidArgumentException $exception) {
            $this->assertSame('The phone number is invalid.', $exception->getMessage());
            if ($input !== '') {
                $this->assertStringNotContainsString($input, $exception->getMessage());
            }
        }
    }

    public static function invalidNumbers(): array
    {
        return [
            'empty' => [''],
            'letters' => ['+2126ABC45678'],
            'landline' => ['0522123456'],
            'foreign' => ['+33612345678'],
            'too short' => ['061234567'],
            'too long' => ['06123456789'],
            'bad prefix' => ['0812345678'],
            'ambiguous plus' => ['++212612345678'],
        ];
    }
}
