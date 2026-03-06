<?php

declare(strict_types=1);

namespace Supaship\Sdk\Support;

use Throwable;

final class Retry
{
    /**
     * @template T
     * @param callable(int): T $operation
     * @param callable(int, Throwable, bool): void|null $onAttempt
     * @return T
     */
    public static function execute(
        callable $operation,
        int $maxAttempts,
        int $backoffMs,
        ?callable $onAttempt = null
    ): mixed {
        $attempt = 0;
        $lastError = null;

        while ($attempt < $maxAttempts) {
            $attempt++;

            try {
                return $operation($attempt);
            } catch (Throwable $error) {
                $lastError = $error;
                $willRetry = $attempt < $maxAttempts;

                if ($onAttempt !== null) {
                    $onAttempt($attempt, $error, $willRetry);
                }

                if (!$willRetry) {
                    break;
                }

                if ($backoffMs > 0) {
                    $delayMs = $backoffMs * (2 ** ($attempt - 1));
                    usleep($delayMs * 1000);
                }
            }
        }

        throw $lastError;
    }
}
