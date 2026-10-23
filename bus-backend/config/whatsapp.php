<?php

return [
    'identity_hash_key' => env('WHATSAPP_IDENTITY_HASH_KEY'),
    'identity_hash_key_version' => env('WHATSAPP_IDENTITY_HASH_KEY_VERSION', '1'),
    'link_token_ttl_minutes' => (int) env('WHATSAPP_LINK_TOKEN_TTL_MINUTES', 10),
    'reverify_days' => (int) env('WHATSAPP_REVERIFY_DAYS', 90),
    'link_consent_version' => env('WHATSAPP_LINK_CONSENT_VERSION', '1'),
];
