<?php

declare(strict_types=1);

$hasXdebug = extension_loaded('xdebug');
$hasPcov = extension_loaded('pcov');
$hasCoverageDriver = $hasXdebug || $hasPcov;

if (!$hasCoverageDriver) {
    fwrite(STDOUT, "No code coverage driver is installed (Xdebug/PCOV)." . PHP_EOL);
    fwrite(STDOUT, "Running full test suite without coverage output." . PHP_EOL);
    passthru('php artisan test', $status);
    exit((int) $status);
}

if (!is_dir('coverage')) {
    mkdir('coverage', 0777, true);
}

if ($hasXdebug) {
    putenv('XDEBUG_MODE=coverage');
}

if ($hasPcov) {
    ini_set('pcov.enabled', '1');
}

$command = 'php vendor/bin/phpunit --coverage-text --colors=never --coverage-clover=coverage/clover.xml';
passthru($command, $status);
exit((int) $status);

