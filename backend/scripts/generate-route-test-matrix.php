<?php

declare(strict_types=1);

$rootDir = dirname(__DIR__);
$testsDir = $rootDir . DIRECTORY_SEPARATOR . 'tests';
$docsDir = $rootDir . DIRECTORY_SEPARATOR . 'docs';

if (!is_dir($docsDir)) {
    mkdir($docsDir, 0777, true);
}

$routeJson = shell_exec('php artisan route:list --json');
if (!is_string($routeJson) || trim($routeJson) === '') {
    fwrite(STDERR, "Failed to fetch routes via php artisan route:list --json\n");
    exit(1);
}

$routes = json_decode($routeJson, true);
if (!is_array($routes)) {
    fwrite(STDERR, "Failed to parse route JSON.\n");
    exit(1);
}

$httpMethodMap = [
    'getJson' => 'GET',
    'postJson' => 'POST',
    'putJson' => 'PUT',
    'patchJson' => 'PATCH',
    'deleteJson' => 'DELETE',
];

$testCalls = [];

$iterator = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($testsDir, FilesystemIterator::SKIP_DOTS)
);

foreach ($iterator as $file) {
    if (!$file instanceof SplFileInfo || !$file->isFile()) {
        continue;
    }
    if (strtolower($file->getExtension()) !== 'php') {
        continue;
    }

    $absolutePath = $file->getPathname();
    $relativePath = str_replace($rootDir . DIRECTORY_SEPARATOR, '', $absolutePath);
    $content = file_get_contents($absolutePath);
    if (!is_string($content) || $content === '') {
        continue;
    }

    if (!preg_match_all('/->\s*(getJson|postJson|putJson|patchJson|deleteJson)\s*\(\s*(["\'])(.*?)\2/s', $content, $matches, PREG_SET_ORDER)) {
        continue;
    }

    foreach ($matches as $match) {
        $methodCall = $match[1];
        $rawPath = stripcslashes($match[3]);
        $httpMethod = $httpMethodMap[$methodCall] ?? null;
        if ($httpMethod === null || !str_starts_with($rawPath, '/')) {
            continue;
        }

        $testCalls[] = [
            'file' => $relativePath,
            'method' => $httpMethod,
            'raw_path' => $rawPath,
            'normalized_path' => normalizePath($rawPath),
        ];
    }
}

$matrixRows = [];
$controllerStats = [];
$apiRouteCount = 0;
$coveredApiRouteCount = 0;

foreach ($routes as $route) {
    $uri = (string) ($route['uri'] ?? '');
    $methodString = (string) ($route['method'] ?? '');
    $action = (string) ($route['action'] ?? '');
    $name = $route['name'] ?? null;

    $routeMethods = normalizeRouteMethods($methodString);
    $normalizedRoutePath = normalizePath('/' . ltrim($uri, '/'));

    $matchedFiles = [];
    foreach ($testCalls as $testCall) {
        if (!in_array($testCall['method'], $routeMethods, true)) {
            continue;
        }
        if (!pathsMatch($normalizedRoutePath, $testCall['normalized_path'])) {
            continue;
        }
        $matchedFiles[$testCall['file']] = true;
    }

    $matchedTests = array_keys($matchedFiles);
    sort($matchedTests);
    $covered = !empty($matchedTests);
    $isApiRoute = str_starts_with($uri, 'api/');

    if ($isApiRoute) {
        $apiRouteCount++;
        if ($covered) {
            $coveredApiRouteCount++;
        }
    }

    $controllerName = extractControllerName($action);
    if ($isApiRoute && $controllerName !== null) {
        if (!isset($controllerStats[$controllerName])) {
            $controllerStats[$controllerName] = ['covered' => 0, 'total' => 0];
        }
        $controllerStats[$controllerName]['total']++;
        if ($covered) {
            $controllerStats[$controllerName]['covered']++;
        }
    }

    $matrixRows[] = [
        'is_api' => $isApiRoute,
        'covered' => $covered,
        'methods' => implode('|', $routeMethods),
        'uri' => '/' . ltrim($uri, '/'),
        'name' => $name,
        'action' => $action,
        'matched_tests' => $matchedTests,
    ];
}

$apiCoveragePercent = $apiRouteCount > 0
    ? round(($coveredApiRouteCount / $apiRouteCount) * 100, 2)
    : 0.0;

uasort($controllerStats, function (array $a, array $b): int {
    $leftCoverage = $a['total'] > 0 ? $a['covered'] / $a['total'] : 0;
    $rightCoverage = $b['total'] > 0 ? $b['covered'] / $b['total'] : 0;
    return $leftCoverage <=> $rightCoverage ?: ($a['total'] <=> $b['total']);
});

$generatedAt = (new DateTimeImmutable('now'))->format(DateTimeInterface::RFC3339);
$markdownPath = $docsDir . DIRECTORY_SEPARATOR . 'route-test-matrix.md';
$jsonPath = $docsDir . DIRECTORY_SEPARATOR . 'route-test-matrix.json';

$lines = [];
$lines[] = '# Backend Route Test Matrix';
$lines[] = '';
$lines[] = '- Generated at: ' . $generatedAt;
$lines[] = '- Matching strategy: heuristic matching from `*Json()` calls in tests to route method + URI shape.';
$lines[] = '';
$lines[] = '## Summary';
$lines[] = '';
$lines[] = '- Total routes: ' . count($routes);
$lines[] = '- API routes analyzed: ' . $apiRouteCount;
$lines[] = '- Heuristically covered API routes: ' . $coveredApiRouteCount;
$lines[] = '- Heuristically uncovered API routes: ' . ($apiRouteCount - $coveredApiRouteCount);
$lines[] = '- Heuristic API coverage: ' . number_format($apiCoveragePercent, 2) . '%';
$lines[] = '';
$lines[] = '## Controller Coverage (API Only)';
$lines[] = '';
$lines[] = '| Controller | Covered | Total | Coverage |';
$lines[] = '| --- | ---: | ---: | ---: |';

foreach ($controllerStats as $controller => $stats) {
    $coverage = $stats['total'] > 0 ? ($stats['covered'] / $stats['total']) * 100 : 0;
    $lines[] = sprintf(
        '| %s | %d | %d | %.2f%% |',
        $controller,
        $stats['covered'],
        $stats['total'],
        $coverage
    );
}

$lines[] = '';
$lines[] = '## API Route Matrix';
$lines[] = '';
$lines[] = '| Status | Method | URI | Action | Matched Tests |';
$lines[] = '| --- | --- | --- | --- | --- |';

foreach ($matrixRows as $row) {
    if (!$row['is_api']) {
        continue;
    }

    $status = $row['covered'] ? 'Covered' : 'Uncovered';
    $matchedTests = formatMatchedTests($row['matched_tests']);
    $actionLabel = $row['action'] !== '' ? $row['action'] : 'Closure';

    $lines[] = sprintf(
        '| %s | `%s` | `%s` | `%s` | %s |',
        $status,
        $row['methods'],
        $row['uri'],
        $actionLabel,
        $matchedTests
    );
}

file_put_contents($markdownPath, implode(PHP_EOL, $lines) . PHP_EOL);

$jsonPayload = [
    'generated_at' => $generatedAt,
    'summary' => [
        'total_routes' => count($routes),
        'api_routes' => $apiRouteCount,
        'covered_api_routes' => $coveredApiRouteCount,
        'uncovered_api_routes' => $apiRouteCount - $coveredApiRouteCount,
        'api_coverage_percent' => $apiCoveragePercent,
    ],
    'controllers' => $controllerStats,
    'routes' => $matrixRows,
];

file_put_contents($jsonPath, json_encode($jsonPayload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL);

echo 'Route matrix generated:' . PHP_EOL;
echo ' - ' . $markdownPath . PHP_EOL;
echo ' - ' . $jsonPath . PHP_EOL;

function normalizeRouteMethods(string $methodString): array
{
    $methods = array_filter(array_map('trim', explode('|', strtoupper($methodString))));
    $methods = array_values(array_filter($methods, static fn (string $method): bool => $method !== 'HEAD'));

    if (empty($methods)) {
        return ['GET'];
    }

    return $methods;
}

function normalizePath(string $path): array
{
    $pathOnly = explode('?', $path, 2)[0];
    $trimmed = trim($pathOnly, '/');
    if ($trimmed === '') {
        return [];
    }

    $segments = array_values(array_filter(explode('/', strtolower($trimmed)), static fn (string $segment): bool => $segment !== ''));

    return array_map(static function (string $segment): string {
        if (preg_match('/^\{[^}]+\}$/', $segment)) {
            return '{}';
        }
        if (str_contains($segment, '{$') || (str_contains($segment, '{') && str_contains($segment, '}'))) {
            return '{}';
        }
        if (preg_match('/^\d+$/', $segment)) {
            return '{}';
        }
        if (preg_match('/^[0-9a-f-]{8,}$/', $segment)) {
            return '{}';
        }
        return $segment;
    }, $segments);
}

function pathsMatch(array $routePath, array $testPath): bool
{
    if (count($routePath) !== count($testPath)) {
        return false;
    }

    foreach ($routePath as $index => $routeSegment) {
        $testSegment = $testPath[$index];
        if ($routeSegment === '{}' || $testSegment === '{}') {
            continue;
        }
        if ($routeSegment !== $testSegment) {
            return false;
        }
    }

    return true;
}

function extractControllerName(string $action): ?string
{
    if ($action === '' || $action === 'Closure') {
        return null;
    }
    if (!str_contains($action, '@')) {
        return $action;
    }
    [$controller] = explode('@', $action, 2);
    return str_replace('App\\Http\\Controllers\\Api\\', '', $controller);
}

function formatMatchedTests(array $tests): string
{
    if (empty($tests)) {
        return '-';
    }

    $limit = 3;
    $trimmed = array_slice($tests, 0, $limit);
    $label = '`' . implode('`, `', $trimmed) . '`';
    $remaining = count($tests) - count($trimmed);

    if ($remaining > 0) {
        return $label . ' +' . $remaining . ' more';
    }

    return $label;
}

