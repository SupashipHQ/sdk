<?php

declare(strict_types=1);

namespace Supaship\Sdk\Contracts;

use Psr\Http\Client\ClientInterface;

interface HttpClientFactory
{
    /**
     * Implementers can configure transport defaults like timeout/retries
     * at the HTTP client level for their target framework/runtime.
     */
    public function make(): ClientInterface;
}
