<?php
require_once __DIR__ . '/config.php';

ini_set('log_errors', '1');
ini_set('display_errors', '0');

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, ALLOWED_ORIGINS, true)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
}
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Content-Type: application/json; charset=utf-8");

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

const PLAN_DEFAULTS = [
    'individual' => ['name' => 'Individual', 'seat_limit' => 1, 'module_limit' => 2, 'subtitle' => 'Solo builder'],
    'standard'   => ['name' => 'Standard',   'seat_limit' => 10, 'module_limit' => 4, 'subtitle' => 'Team rollout'],
    'premium'    => ['name' => 'Premium',    'seat_limit' => 30, 'module_limit' => 6, 'subtitle' => 'Cross-functional scale'],
];

const MODULE_DEFAULTS = [
    ['module_key' => 'ai_innovation_pipeline', 'name' => '90-Day AI Innovation Pipeline', 'subtitle' => 'OPEN framework execution module', 'description' => 'Diagnose, organize, prepare, ignite, and navigate an AI innovation pipeline across 90 days.', 'status' => 'active', 'sort_order' => 1],
    ['module_key' => 'responsible_ai_governance', 'name' => '90-Day Responsible AI Governance', 'subtitle' => 'CARE framework governance module', 'description' => 'Map exposure, build ethical foundations, assess risks, and embed responsible AI governance across 90 days.', 'status' => 'active', 'sort_order' => 2],
    ['module_key' => 'ai_strategy_map', 'name' => 'AI Strategy Map', 'subtitle' => 'Purpose-to-portfolio alignment', 'description' => 'Translate strategic priorities into AI opportunity themes and investment lanes.', 'status' => 'coming_soon', 'sort_order' => 3],
    ['module_key' => 'ai_readiness_assessment', 'name' => 'AI Readiness Assessment', 'subtitle' => 'Capability and culture baseline', 'description' => 'Evaluate people, process, data, technology, and governance readiness.', 'status' => 'coming_soon', 'sort_order' => 4],
    ['module_key' => 'ai_experiment_lab', 'name' => 'AI Experiment Lab', 'subtitle' => 'Prototype and learning sprints', 'description' => 'Manage experiment briefs, learning metrics, and MVP readiness.', 'status' => 'coming_soon', 'sort_order' => 5],
    ['module_key' => 'ai_operating_system', 'name' => 'AI Operating System', 'subtitle' => 'Scale governance and operations', 'description' => 'Run ongoing portfolio reviews, stage gates, and operating cadence.', 'status' => 'coming_soon', 'sort_order' => 6],
];

function jsonBody(): array {
    return json_decode(file_get_contents('php://input'), true) ?? [];
}

function rawBody(): string {
    return file_get_contents('php://input') ?: '';
}

function ok($data = null): void {
    echo json_encode(['ok' => true, 'data' => $data]);
    exit;
}

function err(string $msg, int $code = 400, array $extra = []): void {
    http_response_code($code);
    echo json_encode(array_merge(['ok' => false, 'error' => $msg], $extra));
    exit;
}

function apiErrorLogPath(): string {
    return getenv('API_ERROR_LOG') ?: __DIR__ . DIRECTORY_SEPARATOR . 'logs' . DIRECTORY_SEPARATOR . 'error.log';
}

function logApiThrowable(Throwable $e, string $errorId, ?string $method = null, ?string $path = null): void {
    $token = $_COOKIE['pipeline_session'] ?? '';
    $context = [
        'error_id' => $errorId,
        'method' => $method,
        'path' => $path,
        'request_uri' => $_SERVER['REQUEST_URI'] ?? null,
        'query_string' => $_SERVER['QUERY_STRING'] ?? null,
        'remote_addr' => $_SERVER['REMOTE_ADDR'] ?? null,
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? null,
        'session_hash' => $token ? substr(hash('sha256', $token), 0, 16) : null,
    ];

    $message = '[' . date('c') . '] API error ' . $errorId . PHP_EOL
        . json_encode($context, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) . PHP_EOL
        . (string)$e . PHP_EOL . PHP_EOL;

    $logPath = apiErrorLogPath();
    $logDir = dirname($logPath);
    if (!is_dir($logDir)) {
        @mkdir($logDir, 0775, true);
    }

    if (@file_put_contents($logPath, $message, FILE_APPEND | LOCK_EX) === false) {
        error_log($message);
    }
}

function handleApiThrowable(Throwable $e, ?string $method = null, ?string $path = null): void {
    $errorId = date('YmdHis') . '-' . bin2hex(random_bytes(4));
    logApiThrowable($e, $errorId, $method, $path);

    if (!headers_sent()) {
        http_response_code(500);
    }

    $payload = [
        'ok' => false,
        'error' => 'Internal server error',
        'error_id' => $errorId,
    ];

    if (filter_var(getenv('API_DEBUG') ?: false, FILTER_VALIDATE_BOOLEAN)) {
        $payload['detail'] = $e->getMessage();
    }

    echo json_encode($payload);
    exit;
}

set_error_handler(function (int $severity, string $message, string $file, int $line): bool {
    if (!(error_reporting() & $severity)) {
        return false;
    }
    throw new ErrorException($message, 0, $severity, $file, $line);
});

register_shutdown_function(function (): void {
    $error = error_get_last();
    if (!$error || !in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR], true)) {
        return;
    }
    $errorId = date('YmdHis') . '-' . bin2hex(random_bytes(4));
    logApiThrowable(
        new ErrorException($error['message'], 0, $error['type'], $error['file'], $error['line']),
        $errorId,
        $_SERVER['REQUEST_METHOD'] ?? null,
        isset($_SERVER['REQUEST_URI']) ? routePath() : null
    );
});

function routePath(): string {
    $path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
    foreach (['/nextchapter/api', '/api'] as $prefix) {
        if (str_starts_with($path, $prefix)) {
            $path = substr($path, strlen($prefix));
            break;
        }
    }
    $path = '/' . ltrim($path, '/');
    return rtrim($path, '/') ?: '/';
}

function makeId(string $prefix): string {
    return $prefix . bin2hex(random_bytes(8));
}

function initialsFor(string $name): string {
    $parts = preg_split('/\s+/', trim($name)) ?: [];
    $letters = '';
    foreach ($parts as $part) {
        if ($part !== '') {
            $letters .= strtoupper(substr($part, 0, 1));
        }
        if (strlen($letters) >= 2) {
            break;
        }
    }
    return $letters ?: 'NA';
}

function colorForUser(bool $isOwner, int $index = 0): string {
    $palette = ['#1B6B5A', '#2D5A8E', '#8B5E3C', '#6B4C8A', '#9B2D3F', '#4F7C45'];
    return $isOwner ? '#1B6B5A' : $palette[$index % count($palette)];
}

function planFallback(string $planKey): array {
    $planKey = canonicalPlanKey($planKey);
    if (!isset(PLAN_DEFAULTS[$planKey])) {
        return ['key' => $planKey ?: 'custom', 'name' => ucfirst($planKey ?: 'Custom'), 'seat_limit' => 1, 'module_limit' => 1, 'subtitle' => 'Stripe plan'];
    }
    return ['key' => $planKey] + PLAN_DEFAULTS[$planKey];
}

function canonicalPlanKey(string $planKey, string $planName = ''): string {
    $planKey = strtolower(trim($planKey));
    $planName = strtolower(trim($planName));
    $text = trim($planKey . ' ' . $planName);
    foreach (array_keys(PLAN_DEFAULTS) as $key) {
        if ($planKey === $key || $planName === $key || str_contains($text, $key)) {
            return $key;
        }
    }
    $legacyTypos = [
        'ndividual' => 'individual',
        'tandard' => 'standard',
        'remium' => 'premium',
    ];
    return $legacyTypos[$planKey] ?? $planKey;
}

function seatLimitForPlan(string $planKey, ?int $stripeSeatLimit = null, string $planName = ''): int {
    $planKey = canonicalPlanKey($planKey, $planName);
    if (isset(PLAN_DEFAULTS[$planKey])) {
        return (int) PLAN_DEFAULTS[$planKey]['seat_limit'];
    }
    return ($stripeSeatLimit ?? 0) > 0 ? (int)$stripeSeatLimit : 1;
}

function moduleLimitForPlan(string $planKey, ?int $stripeModuleLimit = null, string $planName = ''): int {
    $planKey = canonicalPlanKey($planKey, $planName);
    if (isset(PLAN_DEFAULTS[$planKey])) {
        return (int) PLAN_DEFAULTS[$planKey]['module_limit'];
    }
    return ($stripeModuleLimit ?? 0) > 0 ? (int)$stripeModuleLimit : 1;
}

function ensureModuleSchema(): void {
    $db = getDB();
    $db->exec("
        CREATE TABLE IF NOT EXISTS modules (
            module_key VARCHAR(60) PRIMARY KEY,
            name VARCHAR(120) NOT NULL,
            subtitle VARCHAR(160) DEFAULT NULL,
            description TEXT,
            status VARCHAR(30) NOT NULL DEFAULT 'coming_soon',
            sort_order INT NOT NULL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ");
    $db->exec("
        CREATE TABLE IF NOT EXISTS account_modules (
            account_id VARCHAR(36) NOT NULL,
            module_key VARCHAR(60) NOT NULL,
            enabled TINYINT(1) NOT NULL DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (account_id, module_key)
        )
    ");

    $db->prepare("DELETE FROM account_modules WHERE module_key = ?")->execute(['ai_risk_care']);
    $db->prepare("DELETE FROM modules WHERE module_key = ?")->execute(['ai_risk_care']);

    $ins = $db->prepare("
        INSERT INTO modules (module_key, name, subtitle, description, status, sort_order)
        VALUES (?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE name = VALUES(name), subtitle = VALUES(subtitle), description = VALUES(description),
            status = VALUES(status), sort_order = VALUES(sort_order)
    ");
    foreach (MODULE_DEFAULTS as $module) {
        $ins->execute([$module['module_key'], $module['name'], $module['subtitle'], $module['description'], $module['status'], $module['sort_order']]);
    }
}

function ensureModuleDataSchema(): void {
    ensureModuleSchema();
    getDB()->exec("
        CREATE TABLE IF NOT EXISTS module_data (
            account_id VARCHAR(36) NOT NULL,
            module_key VARCHAR(60) NOT NULL,
            data_json LONGTEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (account_id, module_key)
        )
    ");
    getDB()->exec("
        CREATE TABLE IF NOT EXISTS account_shared_data (
            account_id VARCHAR(36) PRIMARY KEY,
            data_json LONGTEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ");
}

function ensurePipelineDataSchema(): void {
    getDB()->exec("
        CREATE TABLE IF NOT EXISTS pipeline_data (
            user_id VARCHAR(36) PRIMARY KEY,
            data_json LONGTEXT NOT NULL,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ");
}

function coreModuleKeys(): array {
    return ['ai_innovation_pipeline', 'responsible_ai_governance'];
}

function ensureDefaultAccountModule(string $accountId): void {
    ensureModuleSchema();
    $stmt = getDB()->prepare("
        INSERT IGNORE INTO account_modules (account_id, module_key, enabled)
        VALUES (?, ?, 1)
    ");
    foreach (coreModuleKeys() as $moduleKey) {
        $stmt->execute([$accountId, $moduleKey]);
    }
}

function accountModules(string $accountId): array {
    ensureDefaultAccountModule($accountId);
    $stmt = getDB()->prepare("
        SELECT m.module_key, m.name, m.subtitle, m.description, m.status, m.sort_order,
               COALESCE(am.enabled, 0) AS enabled
        FROM modules m
        LEFT JOIN account_modules am ON am.module_key = m.module_key AND am.account_id = ?
        ORDER BY m.sort_order ASC, m.name ASC
    ");
    $stmt->execute([$accountId]);
    return array_map(function ($row) {
        $row['enabled'] = (bool)$row['enabled'];
        return $row;
    }, $stmt->fetchAll());
}

function hasModuleAccess(string $accountId, string $moduleKey): bool {
    ensureDefaultAccountModule($accountId);
    $stmt = getDB()->prepare("
        SELECT enabled FROM account_modules
        WHERE account_id = ? AND module_key = ?
        LIMIT 1
    ");
    $stmt->execute([$accountId, $moduleKey]);
    return (bool)$stmt->fetchColumn();
}

function normalizeSubscriptionStatus(?string $status): string {
    $status = strtolower((string) $status);
    return $status !== '' ? $status : 'pending';
}

function hasDashboardAccess(array $account): bool {
    return normalizeSubscriptionStatus($account['subscription_status'] ?? '') === 'active';
}

function accountSummary(string $accountId): array {
    $db = getDB();
    $stmt = $db->prepare("
        SELECT a.*,
               COUNT(u.id) AS member_count
        FROM accounts a
        LEFT JOIN users u ON u.account_id = a.id
        WHERE a.id = ?
        GROUP BY a.id
    ");
    $stmt->execute([$accountId]);
    $row = $stmt->fetch();
    if (!$row) {
        err('Account not found', 404);
    }
    $planKey = canonicalPlanKey((string)$row['plan_key'], (string)$row['plan_name']);
    $seatLimit = seatLimitForPlan((string)$planKey, (int)$row['seat_limit'], (string)$row['plan_name']);
    $moduleLimit = moduleLimitForPlan((string)$planKey, null, (string)$row['plan_name']);
    $modules = accountModules($row['id']);
    $enabledModuleCount = count(array_filter($modules, fn($m) => !empty($m['enabled'])));
    return [
        'id' => $row['id'],
        'company_name' => $row['company_name'],
        'contact_name' => $row['contact_name'],
        'contact_email' => $row['contact_email'],
        'contact_phone' => $row['contact_phone'],
        'contact_role' => $row['contact_role'],
        'billing_notes' => $row['billing_notes'],
        'plan_key' => $planKey,
        'plan_name' => $row['plan_name'],
        'seat_limit' => $seatLimit,
        'member_count' => (int) $row['member_count'],
        'module_limit' => $moduleLimit,
        'enabled_module_count' => $enabledModuleCount,
        'modules' => $modules,
        'subscription_status' => $row['subscription_status'],
        'subscription_current_period_end' => $row['subscription_current_period_end'] ?? null,
        'stripe_customer_id' => $row['stripe_customer_id'],
        'stripe_price_id' => $row['stripe_price_id'],
        'stripe_session_id' => $row['stripe_session_id'],
        'stripe_subscription_id' => $row['stripe_subscription_id'],
    ];
}

function userPayload(array $row): array {
    return [
        'id' => $row['id'],
        'account_id' => $row['account_id'],
        'parent_user_id' => $row['parent_user_id'],
        'name' => $row['name'],
        'email' => $row['email'],
        'role' => $row['role'],
        'initials' => $row['initials'],
        'color' => $row['color'],
        'scope' => $row['scope'],
        'is_account_owner' => (bool) $row['is_account_owner'],
    ];
}

function userWithAccountById(string $userId): ?array {
    $stmt = getDB()->prepare("
        SELECT u.*, a.subscription_status, a.plan_key, a.plan_name, a.seat_limit, a.company_name
        FROM users u
        JOIN accounts a ON a.id = u.account_id
        WHERE u.id = ?
        LIMIT 1
    ");
    $stmt->execute([$userId]);
    $row = $stmt->fetch();
    if (!$row) {
        return null;
    }

    $user = userPayload($row);
    $user['account'] = accountSummary($row['account_id']);
    return $user;
}

function getSessionUser(): ?array {
    $token = $_COOKIE['pipeline_session'] ?? null;
    if (!$token) {
        return null;
    }

    $db = getDB();
    $stmt = $db->prepare("
        SELECT u.*, a.subscription_status, a.plan_key, a.plan_name, a.seat_limit, a.company_name
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        JOIN accounts a ON a.id = u.account_id
        WHERE s.session_token = ?
    ");
    $stmt->execute([$token]);
    $row = $stmt->fetch();
    if (!$row) {
        return null;
    }

    $user = userPayload($row);
    $user['account'] = accountSummary($row['account_id']);
    return $user;
}

function requireAuth(): array {
    $user = getSessionUser();
    if (!$user) {
        err('Not authenticated', 401);
    }
    return $user;
}

function requireOwner(): array {
    $user = requireAuth();
    if (empty($user['is_account_owner'])) {
        err("Secondary assigned user can't add further users", 403);
    }
    return $user;
}

function requireDashboardUser(): array {
    $user = requireAuth();
    if (!hasDashboardAccess($user['account'])) {
        err('Subscription required before dashboard access', 402, ['account' => $user['account']]);
    }
    return $user;
}

function issueSession(string $userId): void {
    $token = bin2hex(random_bytes(32));
    getDB()->prepare("INSERT INTO sessions (session_token, user_id) VALUES (?, ?)")->execute([$token, $userId]);
    setcookie('pipeline_session', $token, [
        'expires' => time() + SESSION_LIFETIME,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax',
        'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
    ]);
}

function clearSession(): void {
    $token = $_COOKIE['pipeline_session'] ?? null;
    if ($token) {
        getDB()->prepare("DELETE FROM sessions WHERE session_token = ?")->execute([$token]);
    }
    setcookie('pipeline_session', '', ['expires' => time() - 3600, 'path' => '/']);
}

function allAccountUsers(string $accountId): array {
    $stmt = getDB()->prepare("
        SELECT id, account_id, parent_user_id, name, email, role, initials, color, scope, is_account_owner
        FROM users
        WHERE account_id = ?
        ORDER BY is_account_owner DESC, created_at ASC
    ");
    $stmt->execute([$accountId]);
    return array_map('userPayload', $stmt->fetchAll());
}

function pipelineDataOwnerId(array $user): string {
    $stmt = getDB()->prepare("
        SELECT id
        FROM users
        WHERE account_id = ? AND is_account_owner = 1
        ORDER BY created_at ASC
        LIMIT 1
    ");
    $stmt->execute([$user['account_id']]);
    return (string)($stmt->fetchColumn() ?: $user['id']);
}

function normalizeResponsibleAiData(array $data): array {
    $objectKeys = [
        'exposure', 'tolerance', 'controls', 'triage', 'decisionRights', 'ethicalFramework',
        'ownership', 'reviewCadence', 'incentives', 'litScores', 'riskClasses', 'exitPlans',
        'govRhythm', 'embedOps', 'govReview', 'completedSteps',
    ];
    foreach ($objectKeys as $key) {
        if (!isset($data[$key]) || !is_array($data[$key]) || array_is_list($data[$key])) {
            $data[$key] = new stdClass();
        }
    }
    foreach (['systems', 'risks', 'raciMatrix', 'notes'] as $key) {
        if (!isset($data[$key]) || !is_array($data[$key])) {
            $data[$key] = [];
        }
    }
    if ($data['triage'] instanceof stdClass) {
        $data['triage'] = ['immediateActions' => new stdClass(), 'culture' => new stdClass()];
    }
    if (!isset($data['triage']['immediateActions']) || !is_array($data['triage']['immediateActions']) || array_is_list($data['triage']['immediateActions'])) {
        $data['triage']['immediateActions'] = new stdClass();
    }
    if (!isset($data['triage']['culture']) || !is_array($data['triage']['culture']) || array_is_list($data['triage']['culture'])) {
        $data['triage']['culture'] = new stdClass();
    }
    return $data;
}

function stripeSecret(): ?string {
    $value = getenv('STRIPE_SECRET_KEY') ?: '';
    return $value !== '' ? $value : null;
}

function stripeWebhookSecret(): ?string {
    $value = getenv('STRIPE_WEBHOOK_SECRET') ?: '';
    return $value !== '' ? $value : null;
}

function stripeRequest(string $method, string $path, array $payload = [], bool $formEncoded = true): array {
    $secret = stripeSecret();
    if (!$secret) {
        err('Stripe is not configured on this server', 503);
    }

    $url = 'https://api.stripe.com/v1/' . ltrim($path, '/');
    if ($method === 'GET' && $payload) {
        $url .= '?' . http_build_query($payload);
    }

    $headers = ['Authorization: Bearer ' . $secret];
    $body = null;
    if ($method !== 'GET') {
        if ($formEncoded) {
            $body = http_build_query($payload);
        } else {
            $body = json_encode($payload);
            $headers[] = 'Content-Type: application/json';
        }
    }

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    if ($body !== null) {
        curl_setopt($ch, CURLOPT_POSTFIELDS, $body);
    }
    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    $data = json_decode($response ?: '[]', true);
    if ($response === false || $curlError) {
        err('Unable to connect to Stripe', 502);
    }
    if ($code >= 400) {
        err($data['error']['message'] ?? 'Stripe request failed', 502);
    }
    return is_array($data) ? $data : [];
}

function inferPlanKey(string $name, array $metadata = []): string {
    $metaKey = strtolower(trim((string)($metadata['plan_key'] ?? '')));
    if ($metaKey !== '' && isset(PLAN_DEFAULTS[canonicalPlanKey($metaKey, $name)])) {
        return canonicalPlanKey($metaKey, $name);
    }

    $slug = strtolower(trim(preg_replace('/[^a-z0-9]+/', '-', $name), '-'));
    return canonicalPlanKey($slug, $name) ?: ($slug !== '' ? $slug : 'custom');
}

function stripeCatalogItemFromPrice(array $price): array {
    $product = is_array($price['product'] ?? null) ? $price['product'] : [];
    $productMeta = is_array($product['metadata'] ?? null) ? $product['metadata'] : [];
    $priceMeta = is_array($price['metadata'] ?? null) ? $price['metadata'] : [];
    $metadata = array_merge($productMeta, $priceMeta);

    $name = (string)($product['name'] ?? $price['nickname'] ?? 'Plan');
    $planKey = inferPlanKey($name, $metadata);
    $fallback = planFallback($planKey);
    $seatLimit = seatLimitForPlan($planKey, isset($metadata['seat_limit']) ? (int)$metadata['seat_limit'] : null, $name);
    $moduleLimit = moduleLimitForPlan($planKey, isset($metadata['module_limit']) ? (int)$metadata['module_limit'] : null, $name);

    return [
        'plan_key' => $planKey,
        'name' => $name,
        'subtitle' => (string)($metadata['subtitle'] ?? $fallback['subtitle']),
        'description' => (string)($product['description'] ?? $metadata['description'] ?? ''),
        'seat_limit' => $seatLimit,
        'module_limit' => $moduleLimit,
        'price_id' => (string)($price['id'] ?? ''),
        'product_id' => (string)($product['id'] ?? ''),
        'currency' => strtoupper((string)($price['currency'] ?? 'USD')),
        'unit_amount' => (int)($price['unit_amount'] ?? 0),
        'interval' => (string)($price['recurring']['interval'] ?? ''),
        'interval_count' => (int)($price['recurring']['interval_count'] ?? 1),
        'active' => !empty($price['active']),
        'metadata' => $metadata,
    ];
}

function stripeListCatalog(): array {
    $prices = stripeRequest('GET', 'prices', [
        'active' => 'true',
        'type' => 'recurring',
        'limit' => 100,
        'expand[]' => 'data.product',
    ]);

    $items = [];
    foreach (($prices['data'] ?? []) as $price) {
        $product = is_array($price['product'] ?? null) ? $price['product'] : [];
        if (empty($price['active']) || empty($price['recurring']) || !$product || empty($product['active'])) {
            continue;
        }
        $items[] = stripeCatalogItemFromPrice($price);
    }

    usort($items, function ($a, $b) {
        return ($a['unit_amount'] <=> $b['unit_amount']) ?: strcmp($a['name'], $b['name']);
    });

    return $items;
}

function stripeGetCatalogItemByPriceId(string $priceId): array {
    $priceId = trim($priceId);
    if ($priceId === '') {
        err('price_id is required');
    }

    $price = stripeRequest('GET', 'prices/' . rawurlencode($priceId), [
        'expand[]' => 'product',
    ]);

    if (empty($price['id']) || empty($price['active']) || empty($price['recurring']) || !is_array($price['product'] ?? null)) {
        err('Selected Stripe price is not available', 400);
    }

    return stripeCatalogItemFromPrice($price);
}

function stripeCheckoutReturnUrl(string $envKey, string $status): string {
    $configured = trim((string)(getenv($envKey) ?: ''));
    if ($configured === '') {
        $origin = isset($_SERVER['HTTP_ORIGIN']) ? rtrim($_SERVER['HTTP_ORIGIN'], '/') : '';
        return $origin . '/nextchapter/pipeline.html?checkout=' . rawurlencode($status);
    }

    if (str_contains($configured, '{CHECKOUT_STATUS}')) {
        return str_replace('{CHECKOUT_STATUS}', $status, $configured);
    }

    if (str_contains($configured, 'pipeline.html')) {
        return $configured;
    }

    return rtrim($configured, '/') . '/pipeline.html?checkout=' . rawurlencode($status);
}

function stripeCreateCheckoutSession(array $payload): array {
    $data = stripeRequest('POST', 'checkout/sessions', $payload);
    return [
        'checkout_url' => $data['url'] ?? null,
        'session_id' => $data['id'] ?? null,
        'customer_id' => $data['customer'] ?? null,
        'subscription_id' => $data['subscription'] ?? null,
    ];
}

function validAbsoluteUrl(?string $requested): ?string {
    $requested = trim((string)$requested);
    if ($requested !== '') {
        $parts = parse_url($requested);
        if (in_array($parts['scheme'] ?? '', ['http', 'https'], true) && !empty($parts['host'])) {
            return $requested;
        }
    }
    return null;
}

function stripeFindAccountIdFromEvent(array $object): ?string {
    $metadata = is_array($object['metadata'] ?? null) ? $object['metadata'] : [];
    if (!empty($metadata['account_id'])) {
        return (string)$metadata['account_id'];
    }
    if (!empty($object['client_reference_id'])) {
        return (string)$object['client_reference_id'];
    }
    return null;
}

function stripeVerifyWebhook(string $payload, string $signatureHeader): array {
    $secret = stripeWebhookSecret();
    if (!$secret) {
        err('Stripe webhook secret is not configured', 503);
    }

    if ($signatureHeader === '') {
        err('Missing Stripe signature', 400);
    }

    $parts = [];
    foreach (explode(',', $signatureHeader) as $part) {
        [$k, $v] = array_pad(explode('=', trim($part), 2), 2, '');
        if ($k !== '' && $v !== '') {
            $parts[$k][] = $v;
        }
    }

    $timestamp = isset($parts['t'][0]) ? (int)$parts['t'][0] : 0;
    $signatures = $parts['v1'] ?? [];
    if ($timestamp <= 0 || !$signatures) {
        err('Invalid Stripe signature header', 400);
    }

    if (abs(time() - $timestamp) > 300) {
        err('Stripe webhook timestamp is outside tolerance', 400);
    }

    $signedPayload = $timestamp . '.' . $payload;
    $expected = hash_hmac('sha256', $signedPayload, $secret);
    $verified = false;
    foreach ($signatures as $signature) {
        if (hash_equals($expected, $signature)) {
            $verified = true;
            break;
        }
    }
    if (!$verified) {
        err('Stripe webhook signature verification failed', 400);
    }

    $event = json_decode($payload, true);
    if (!is_array($event)) {
        err('Invalid Stripe webhook payload', 400);
    }
    return $event;
}

function updateAccountSubscription(string $accountId, array $fields): void {
    $allowed = [
        'company_name', 'contact_name', 'contact_email', 'contact_phone', 'contact_role', 'billing_notes',
        'plan_key', 'plan_name', 'seat_limit', 'subscription_status', 'subscription_current_period_end', 'stripe_customer_id',
        'stripe_price_id', 'stripe_session_id', 'stripe_subscription_id'
    ];
    $columns = [];
    foreach (getDB()->query("SHOW COLUMNS FROM accounts")->fetchAll() as $column) {
        $columns[$column['Field']] = true;
    }

    $sets = [];
    $values = [];
    foreach ($allowed as $field) {
        if (array_key_exists($field, $fields) && isset($columns[$field])) {
            $sets[] = $field . ' = ?';
            $values[] = $fields[$field];
        }
    }
    if (!$sets) {
        return;
    }

    $values[] = $accountId;
    $sql = "UPDATE accounts SET " . implode(', ', $sets) . " WHERE id = ?";
    getDB()->prepare($sql)->execute($values);
}

function huggingFaceChat(array $messages): string {
    if (HUGGINGFACE_API_KEY === '') {
        err('Hugging Face is not configured on this server', 503);
    }

    $payload = [
        'model' => HUGGINGFACE_CHAT_MODEL,
        'stream' => false,
        'messages' => $messages,
    ];

    $ch = curl_init('https://router.huggingface.co/v1/chat/completions');
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer ' . HUGGINGFACE_API_KEY,
        'Content-Type: application/json',
    ]);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));

    $response = curl_exec($ch);
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    if ($response === false || $curlError) {
        err('Unable to connect to Hugging Face', 502);
    }

    $data = json_decode($response ?: '{}', true);
    if ($code >= 400) {
        err($data['error']['message'] ?? $data['error'] ?? 'Hugging Face request failed', 502);
    }

    $text = '';
    foreach (($data['choices'] ?? []) as $choice) {
        $content = $choice['message']['content'] ?? '';
        if (is_string($content) && trim($content) !== '') {
            $text .= $content;
        }
    }

    if (trim($text) === '') {
        err('Hugging Face returned an empty response', 502);
    }

    return trim($text);
}

function ensureAiCoachSchema(): void {
    getDB()->exec("
        CREATE TABLE IF NOT EXISTS ai_coach_messages (
            id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            user_id VARCHAR(36) NOT NULL,
            account_id VARCHAR(36) NOT NULL,
            role VARCHAR(20) NOT NULL,
            message TEXT NOT NULL,
            context TEXT DEFAULT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user_created (user_id, created_at),
            INDEX idx_account_created (account_id, created_at)
        )
    ");
}

function addAiCoachMessage(string $userId, string $accountId, string $role, string $message, ?string $context = null): void {
    ensureAiCoachSchema();
    getDB()->prepare("
        INSERT INTO ai_coach_messages (user_id, account_id, role, message, context)
        VALUES (?, ?, ?, ?, ?)
    ")->execute([$userId, $accountId, $role, $message, $context]);
}

function aiCoachHistory(string $userId, int $limit = 100): array {
    ensureAiCoachSchema();
    $limit = max(1, min(200, $limit));
    $stmt = getDB()->prepare("
        SELECT role, message AS text, context, created_at
        FROM ai_coach_messages
        WHERE user_id = ?
        ORDER BY created_at DESC, id DESC
        LIMIT {$limit}
    ");
    $stmt->execute([$userId]);
    return array_reverse($stmt->fetchAll());
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$path = routePath();

try {

if ($method === 'GET' && $path === '/ai/coach-history') {
    $user = requireDashboardUser();
    ok([
        'messages' => aiCoachHistory($user['id']),
    ]);
}

if ($method === 'DELETE' && $path === '/ai/coach-history') {
    $user = requireDashboardUser();
    ensureAiCoachSchema();
    getDB()->prepare("DELETE FROM ai_coach_messages WHERE user_id = ?")->execute([$user['id']]);
    ok(['messages' => []]);
}

if ($method === 'POST' && $path === '/ai/coach') {
    $user = requireDashboardUser();
    $body = jsonBody();
    $message = trim((string)($body['message'] ?? ''));
    $context = trim((string)($body['context'] ?? ''));

    if ($message === '') {
        err('message is required');
    }

    $systemPrompt = "You are the AI Coach for Faisal Hoque's NextChapter AI modules. Support the user across all modules, including AI Innovation Pipeline and Responsible AI Governance. Be direct, practical, strategic, and context-aware. Maximum 150 words per response. No bullets unless absolutely essential.";
    $userPrompt = ($context !== '' ? $context . "\n\n" : '') . $message;
    $history = aiCoachHistory($user['id'], 12);
    $chatMessages = [['role' => 'system', 'content' => $systemPrompt]];
    foreach ($history as $item) {
        if (in_array($item['role'], ['user', 'assistant'], true)) {
            $chatMessages[] = ['role' => $item['role'], 'content' => (string)$item['text']];
        }
    }
    $chatMessages[] = ['role' => 'user', 'content' => $userPrompt];

    addAiCoachMessage($user['id'], $user['account_id'], 'user', $message, $context !== '' ? $context : null);
    $text = huggingFaceChat($chatMessages);
    addAiCoachMessage($user['id'], $user['account_id'], 'assistant', $text, null);

    ok([
        'text' => $text,
        'messages' => aiCoachHistory($user['id']),
    ]);
}

function ensureTeamSchema(): void {
    getDB()->exec("
        CREATE TABLE IF NOT EXISTS teams (
            id VARCHAR(36) PRIMARY KEY,
            account_id VARCHAR(36) NOT NULL,
            name VARCHAR(120) NOT NULL,
            description TEXT,
            created_by VARCHAR(36) NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
            INDEX idx_account (account_id)
        )
    ");
    getDB()->exec("
        CREATE TABLE IF NOT EXISTS team_members (
            id VARCHAR(36) PRIMARY KEY,
            team_id VARCHAR(36) NOT NULL,
            user_id VARCHAR(36) NOT NULL,
            role VARCHAR(50) NOT NULL DEFAULT 'member',
            joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE KEY unique_team_user (team_id, user_id),
            INDEX idx_team (team_id),
            INDEX idx_user (user_id)
        )
    ");
}

function createDefaultTeamForAccount(string $accountId, string $ownerId, string $companyName = ''): string {
    ensureTeamSchema();
    $teamId = makeId('team_');
    $teamName = trim($companyName) !== '' ? trim($companyName) . ' Team' : 'Team';
    getDB()->prepare("INSERT INTO teams (id, account_id, name, description, created_by) VALUES (?, ?, ?, ?, ?)")
        ->execute([$teamId, $accountId, $teamName, 'Default team for your workspace.', $ownerId]);
    getDB()->prepare("INSERT INTO team_members (id, team_id, user_id, role) VALUES (?, ?, ?, 'lead')")
        ->execute([makeId('tm_'), $teamId, $ownerId]);
    return $teamId;
}

if ($method === 'POST' && $path === '/stripe/webhook') {
    $payload = rawBody();
    $signature = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';
    $event = json_decode($payload, true);
    $type = (string)($event['type'] ?? '');
    $object = is_array($event['data']['object'] ?? null) ? $event['data']['object'] : [];

    if ($type === 'checkout.session.completed') {
        $accountId = stripeFindAccountIdFromEvent($object);
        if ($accountId) {
            $newSubscriptionId = (string)($object['subscription'] ?? '');
            $paymentStatus = strtolower((string)($object['payment_status'] ?? ''));
            $checkoutStatus = strtolower((string)($object['status'] ?? ''));
            $status = ($paymentStatus === 'paid' || $checkoutStatus === 'complete') ? 'active' : 'pending_payment';
            $current = accountSummary($accountId);
            if (normalizeSubscriptionStatus($current['subscription_status'] ?? '') === 'active') {
                $status = 'active';
            }
            updateAccountSubscription($accountId, [
                'stripe_customer_id' => $object['customer'] ?? null,
                'stripe_session_id' => $object['id'] ?? null,
                'stripe_subscription_id' => $newSubscriptionId ?: null,
                'subscription_status' => $status,
            ]);
        }
    } elseif (in_array($type, ['customer.subscription.created', 'customer.subscription.updated', 'customer.subscription.deleted'], true)) {
        $accountId = stripeFindAccountIdFromEvent($object);
        if (!$accountId) {
            $lookup = getDB()->prepare("SELECT id FROM accounts WHERE stripe_subscription_id = ? OR stripe_customer_id = ? LIMIT 1");
            $lookup->execute([$object['id'] ?? '', $object['customer'] ?? '']);
            $row = $lookup->fetch();
            $accountId = $row['id'] ?? null;
        }

        if ($accountId) {
            $price = $object['items']['data'][0]['price'] ?? [];
            $catalog = null;
            if (!empty($price['id'])) {
                $catalog = stripeGetCatalogItemByPriceId((string)$price['id']);
            }
            $updates = [
                'stripe_customer_id' => $object['customer'] ?? null,
                'stripe_subscription_id' => $object['id'] ?? null,
                'subscription_status' => normalizeSubscriptionStatus($object['status'] ?? 'pending'),
                'subscription_current_period_end' => !empty($object['current_period_end']) ? date('Y-m-d H:i:s', (int)$object['current_period_end']) : null,
            ];
            if ($catalog) {
                $updates['stripe_price_id'] = $catalog['price_id'];
                $updates['plan_key'] = $catalog['plan_key'];
                $updates['plan_name'] = $catalog['name'];
                $updates['seat_limit'] = $catalog['seat_limit'];
            }
            updateAccountSubscription($accountId, $updates);
        }
    }

    ok(['received' => true]);
}

if ($method === 'POST' && $path === '/auth/signup') {
    $body = jsonBody();
    $name = trim($body['name'] ?? '');
    $email = strtolower(trim($body['email'] ?? ''));
    $password = (string) ($body['password'] ?? '');
    $company = trim($body['company_name'] ?? '');
    $roleTitle = trim($body['contact_role'] ?? '');
    $phone = trim($body['contact_phone'] ?? '');

    if ($name === '' || $email === '' || $password === '' || $company === '') {
        err('name, email, password, and company_name are required');
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        err('Valid email required');
    }
    if (strlen($password) < 8) {
        err('Password must be at least 8 characters');
    }

    $db = getDB();
    $check = $db->prepare("SELECT id FROM users WHERE email = ?");
    $check->execute([$email]);
    if ($check->fetch()) {
        err('An account with that email already exists', 409);
    }

    $accountId = makeId('acct_');
    $userId = makeId('usr_');
    $hash = password_hash($password, PASSWORD_BCRYPT);

    $db->beginTransaction();
    try {
        $db->prepare("
            INSERT INTO accounts (
                id, company_name, contact_name, contact_email, contact_phone, contact_role,
                plan_key, plan_name, seat_limit, subscription_status
            ) VALUES (?, ?, ?, ?, ?, ?, 'individual', 'Individual', 1, 'pending')
        ")->execute([$accountId, $company, $name, $email, $phone ?: null, $roleTitle ?: null]);

        $db->prepare("
            INSERT INTO users (
                id, account_id, parent_user_id, name, email, password_hash,
                role, initials, color, scope, is_account_owner
            ) VALUES (?, ?, NULL, ?, ?, ?, 'Owner', ?, '#1B6B5A', 'All', 1)
        ")->execute([$userId, $accountId, $name, $email, $hash, initialsFor($name)]);

        createDefaultTeamForAccount($accountId, $userId, $company);

        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        err('Unable to create account', 500);
    }

    issueSession($userId);
    ok(['user' => userWithAccountById($userId)]);
}

if ($method === 'POST' && $path === '/auth/login') {
    $body = jsonBody();
    $email = strtolower(trim($body['email'] ?? ''));
    $password = (string) ($body['password'] ?? '');
    if ($email === '' || $password === '') {
        err('email and password are required');
    }

    $stmt = getDB()->prepare("SELECT * FROM users WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();
    if (!$user || !password_verify($password, $user['password_hash'])) {
        err('Invalid email or password', 401);
    }

    issueSession($user['id']);
    ok(['user' => userWithAccountById($user['id'])]);
}

if ($method === 'DELETE' && $path === '/session') {
    clearSession();
    ok();
}

if ($method === 'GET' && $path === '/session') {
    ok(getSessionUser());
}

if ($method === 'GET' && $path === '/account') {
    $user = requireAuth();
    ok($user['account']);
}

if ($method === 'GET' && $path === '/billing/products') {
    requireOwner();
    ok(stripeListCatalog());
}

if ($method === 'POST' && $path === '/billing/checkout-session') {
    $user = requireOwner();
    if (hasDashboardAccess($user['account'])) {
        err('This account already has an active subscription. Billing is preview-only for active accounts.', 409);
    }
    $body = jsonBody();
    $catalog = stripeGetCatalogItemByPriceId((string)($body['price_id'] ?? ''));
    $contactName = trim($body['contact_name'] ?? $user['name']);
    $contactEmail = strtolower(trim($body['contact_email'] ?? $user['email']));
    $contactPhone = trim($body['contact_phone'] ?? '');
    $contactRole = trim($body['contact_role'] ?? '');
    $billingNotes = trim($body['billing_notes'] ?? '');
    $company = trim($body['company_name'] ?? $user['account']['company_name']);

    if ($contactName === '' || $contactEmail === '' || $company === '') {
        err('contact_name, contact_email, and company_name are required');
    }

    $successUrl = validAbsoluteUrl($body['success_url'] ?? null) ?: stripeCheckoutReturnUrl('STRIPE_SUCCESS_URL', 'success');
    $cancelUrl = validAbsoluteUrl($body['cancel_url'] ?? null) ?: stripeCheckoutReturnUrl('STRIPE_CANCEL_URL', 'cancel');
    $customerId = trim((string)($user['account']['stripe_customer_id'] ?? ''));

    $payload = [
        'mode' => 'subscription',
        'success_url' => $successUrl,
        'cancel_url' => $cancelUrl,
        'client_reference_id' => $user['account_id'],
        'line_items[0][price]' => $catalog['price_id'],
        'line_items[0][quantity]' => 1,
        'metadata[account_id]' => $user['account_id'],
        'metadata[plan_key]' => $catalog['plan_key'],
        'metadata[seat_limit]' => $catalog['seat_limit'],
        'metadata[module_limit]' => $catalog['module_limit'],
        'subscription_data[metadata][account_id]' => $user['account_id'],
        'subscription_data[metadata][plan_key]' => $catalog['plan_key'],
        'subscription_data[metadata][seat_limit]' => $catalog['seat_limit'],
        'subscription_data[metadata][module_limit]' => $catalog['module_limit'],
    ];
    if ($customerId !== '') {
        $payload['customer'] = $customerId;
    } else {
        $payload['customer_email'] = $contactEmail;
    }
    $checkout = stripeCreateCheckoutSession($payload);

    getDB()->prepare("
        UPDATE accounts
        SET company_name = ?, contact_name = ?, contact_email = ?, contact_phone = ?, contact_role = ?,
            billing_notes = ?, plan_key = ?, plan_name = ?, seat_limit = ?, subscription_status = ?,
            stripe_price_id = ?, stripe_session_id = ?
        WHERE id = ?
    ")->execute([
        $company,
        $contactName,
        $contactEmail,
        $contactPhone ?: null,
        $contactRole ?: null,
        $billingNotes ?: null,
        $catalog['plan_key'],
        $catalog['name'],
        $catalog['seat_limit'],
        'pending_payment',
        $catalog['price_id'],
        $checkout['session_id'],
        $user['account_id'],
    ]);

    ok([
        'plan' => $catalog,
        'checkout_url' => $checkout['checkout_url'],
        'account' => accountSummary($user['account_id']),
    ]);
}

if ($method === 'GET' && $path === '/users') {
    $user = requireAuth();
    ok(allAccountUsers($user['account_id']));
}

if ($method === 'POST' && $path === '/users') {
    $owner = requireOwner();
    $body = jsonBody();
    $name = trim($body['name'] ?? '');
    $email = strtolower(trim($body['email'] ?? ''));
    $password = (string) ($body['password'] ?? '');
    $role = trim($body['role'] ?? 'Standard User');
    $scope = trim($body['scope'] ?? 'Assigned work');

    if ($name === '' || $email === '' || $password === '') {
        err('name, email, and password are required');
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        err('Valid email required');
    }
    if (strlen($password) < 8) {
        err('Password must be at least 8 characters');
    }

    $db = getDB();
    $check = $db->prepare("SELECT id FROM users WHERE email = ?");
    $check->execute([$email]);
    if ($check->fetch()) {
        err('That user email already exists', 409);
    }

    $countStmt = $db->prepare("SELECT COUNT(*) FROM users WHERE account_id = ?");
    $countStmt->execute([$owner['account_id']]);
    $nextIndex = (int) $countStmt->fetchColumn();
    $seatLimit = max(1, (int)($owner['account']['seat_limit'] ?? 1));
    if ($nextIndex >= $seatLimit) {
        err("User limit reached for the {$owner['account']['plan_name']} plan. This plan allows {$seatLimit} user" . ($seatLimit === 1 ? '' : 's') . '.', 409, [
            'account' => accountSummary($owner['account_id']),
        ]);
    }

    $userId = makeId('usr_');
    $db->prepare("
        INSERT INTO users (
            id, account_id, parent_user_id, name, email, password_hash,
            role, initials, color, scope, is_account_owner
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    ")->execute([
        $userId,
        $owner['account_id'],
        $owner['id'],
        $name,
        $email,
        password_hash($password, PASSWORD_BCRYPT),
        $role,
        initialsFor($name),
        colorForUser(false, $nextIndex),
        $scope,
    ]);

    $teamStmt = $db->prepare("SELECT id FROM teams WHERE account_id = ? ORDER BY created_at ASC LIMIT 1");
    $teamStmt->execute([$owner['account_id']]);
    $teamId = $teamStmt->fetchColumn();
    if (!$teamId) {
        $teamId = createDefaultTeamForAccount($owner['account_id'], $owner['id'], $owner['account']['company_name'] ?? '');
    }
    $memberCheck = $db->prepare("SELECT id FROM team_members WHERE team_id = ? AND user_id = ?");
    $memberCheck->execute([$teamId, $userId]);
    if (!$memberCheck->fetch()) {
        $db->prepare("INSERT INTO team_members (id, team_id, user_id, role) VALUES (?, ?, ?, 'member')")->execute([
            makeId('tm_'),
            $teamId,
            $userId,
        ]);
    }

    ok([
        'users' => allAccountUsers($owner['account_id']),
        'account' => accountSummary($owner['account_id']),
    ]);
}

if ($method === 'DELETE' && $path === '/users') {
    $owner = requireOwner();
    $body = jsonBody();
    $targetId = trim((string)($body['user_id'] ?? ''));
    if ($targetId === '') {
        err('user_id is required');
    }
    if ($targetId === $owner['id']) {
        err('Account owner cannot remove themselves', 409);
    }

    $check = getDB()->prepare("SELECT id, is_account_owner FROM users WHERE id = ? AND account_id = ? LIMIT 1");
    $check->execute([$targetId, $owner['account_id']]);
    $target = $check->fetch();
    if (!$target) {
        err('User not found', 404);
    }
    if (!empty($target['is_account_owner'])) {
        err('Account owner cannot be removed', 409);
    }

    getDB()->prepare("DELETE FROM users WHERE id = ? AND account_id = ?")->execute([$targetId, $owner['account_id']]);

    ok([
        'users' => allAccountUsers($owner['account_id']),
        'account' => accountSummary($owner['account_id']),
    ]);
}

if ($method === 'GET' && $path === '/modules') {
    $user = requireDashboardUser();
    ok([
        'modules' => accountModules($user['account_id']),
        'account' => accountSummary($user['account_id']),
    ]);
}

if ($method === 'PUT' && $path === '/modules') {
    $owner = requireOwner();
    if (!hasDashboardAccess($owner['account'])) {
        err('Subscription required before module management', 402, ['account' => $owner['account']]);
    }

    $body = jsonBody();
    $requested = $body['module_keys'] ?? null;
    if (!is_array($requested)) {
        $moduleKey = trim((string)($body['module_key'] ?? ''));
        $enabled = !empty($body['enabled']);
        $current = accountModules($owner['account_id']);
        $requested = array_values(array_map(fn($m) => $m['module_key'], array_filter($current, fn($m) => !empty($m['enabled']))));
        if ($moduleKey !== '') {
            if ($enabled && !in_array($moduleKey, $requested, true)) {
                $requested[] = $moduleKey;
            }
            if (!$enabled) {
                $requested = array_values(array_filter($requested, fn($key) => $key !== $moduleKey));
            }
        }
    }

    $requested = array_values(array_unique(array_filter(array_map(fn($v) => trim((string)$v), $requested))));
    foreach (coreModuleKeys() as $coreModuleKey) {
        if (!in_array($coreModuleKey, $requested, true)) {
            $requested[] = $coreModuleKey;
        }
    }

    $catalog = accountModules($owner['account_id']);
    $validKeys = array_map(fn($m) => $m['module_key'], $catalog);
    foreach ($requested as $key) {
        if (!in_array($key, $validKeys, true)) {
            err('Unknown module: ' . $key, 400);
        }
    }

    $moduleLimit = max(1, (int)($owner['account']['module_limit'] ?? 1));
    if (count($requested) > $moduleLimit) {
        err("Module limit reached for the {$owner['account']['plan_name']} plan. This plan allows {$moduleLimit} module" . ($moduleLimit === 1 ? '' : 's') . '.', 409, [
            'account' => accountSummary($owner['account_id']),
        ]);
    }

    $db = getDB();
    $db->beginTransaction();
    try {
        $db->prepare("UPDATE account_modules SET enabled = 0 WHERE account_id = ?")->execute([$owner['account_id']]);
        $upsert = $db->prepare("
            INSERT INTO account_modules (account_id, module_key, enabled)
            VALUES (?, ?, 1)
            ON DUPLICATE KEY UPDATE enabled = 1, updated_at = NOW()
        ");
        foreach ($requested as $key) {
            $upsert->execute([$owner['account_id'], $key]);
        }
        $db->commit();
    } catch (Throwable $e) {
        $db->rollBack();
        err('Unable to update module access', 500);
    }

    ok([
        'modules' => accountModules($owner['account_id']),
        'account' => accountSummary($owner['account_id']),
    ]);
}

if ($method === 'GET' && $path === '/pipeline') {
    $user = requireDashboardUser();
    if (!hasModuleAccess($user['account_id'], 'ai_innovation_pipeline')) {
        err('90-Day AI Innovation Pipeline module is not enabled for this account', 403);
    }
    ensurePipelineDataSchema();
    $pipelineOwnerId = pipelineDataOwnerId($user);
    $stmt = getDB()->prepare("SELECT data_json FROM pipeline_data WHERE user_id = ?");
    $stmt->execute([$pipelineOwnerId]);
    $row = $stmt->fetch();
    ok($row ? json_decode($row['data_json'], true) : new stdClass());
}

if (($method === 'PUT' || $method === 'POST') && $path === '/pipeline') {
    $user = requireDashboardUser();
    if (!hasModuleAccess($user['account_id'], 'ai_innovation_pipeline')) {
        err('90-Day AI Innovation Pipeline module is not enabled for this account', 403);
    }
    $body = jsonBody();
    if (!is_array($body)) {
        err('Invalid data');
    }

    ensurePipelineDataSchema();
    $json = json_encode($body, JSON_UNESCAPED_UNICODE);
    $db = getDB();
    $pipelineOwnerId = pipelineDataOwnerId($user);
    $db->prepare("
        INSERT INTO pipeline_data (user_id, data_json) VALUES (?, ?)
        ON DUPLICATE KEY UPDATE data_json = VALUES(data_json), updated_at = NOW()
    ")->execute([$pipelineOwnerId, $json]);

    if (isset($body['ideas']) && is_array($body['ideas'])) {
        $db->prepare("DELETE FROM ideas WHERE user_id = ?")->execute([$pipelineOwnerId]);
        $ins = $db->prepare("
            INSERT INTO ideas (user_id, idx, name, description, strategic, outcome, capabilities, cost, risk, timeframe, dept, horizon)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        foreach ($body['ideas'] as $i => $idea) {
            $ins->execute([
                $pipelineOwnerId,
                $i,
                $idea['name'] ?? '',
                $idea['desc'] ?? null,
                $idea['strategic'] ?? null,
                $idea['outcome'] ?? null,
                $idea['capabilities'] ?? null,
                $idea['cost'] ?? null,
                $idea['risk'] ?? null,
                $idea['timeframe'] ?? null,
                $idea['dept'] ?? null,
                $idea['when'] ?? 'now',
            ]);
        }
    }

    ok();
}

if ($method === 'GET' && $path === '/module-data') {
    $user = requireDashboardUser();
    $moduleKey = trim((string)($_GET['module_key'] ?? ''));
    if ($moduleKey === '') {
        err('Module key is required');
    }
    if (!hasModuleAccess($user['account_id'], $moduleKey)) {
        err('This module is not enabled for this account', 403);
    }

    ensureModuleDataSchema();
    $stmt = getDB()->prepare("SELECT data_json FROM module_data WHERE account_id = ? AND module_key = ? LIMIT 1");
    $stmt->execute([$user['account_id'], $moduleKey]);
    $row = $stmt->fetch();
    $data = $row ? (json_decode($row['data_json'], true) ?: []) : [];
    if ($moduleKey === 'responsible_ai_governance') {
        $data = normalizeResponsibleAiData($data);
    }
    ok($row ? $data : new stdClass());
}

if (($method === 'PUT' || $method === 'POST') && $path === '/module-data') {
    $user = requireDashboardUser();
    $body = jsonBody();
    $moduleKey = trim((string)($body['module_key'] ?? ''));
    if ($moduleKey === '') {
        err('Module key is required');
    }
    if (!hasModuleAccess($user['account_id'], $moduleKey)) {
        err('This module is not enabled for this account', 403);
    }
    $dataBody = $body['data'] ?? [];
    if (!is_array($dataBody)) {
        err('Invalid module data');
    }
    if ($moduleKey === 'responsible_ai_governance') {
        $dataBody = normalizeResponsibleAiData($dataBody);
    }

    ensureModuleDataSchema();
    $json = json_encode($dataBody, JSON_UNESCAPED_UNICODE);
    getDB()->prepare("
        INSERT INTO module_data (account_id, module_key, data_json) VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE data_json = VALUES(data_json), updated_at = NOW()
    ")->execute([$user['account_id'], $moduleKey, $json]);
    ok();
}

if ($method === 'GET' && $path === '/shared-data') {
    $user = requireDashboardUser();
    ensureModuleDataSchema();
    $stmt = getDB()->prepare("SELECT data_json FROM account_shared_data WHERE account_id = ? LIMIT 1");
    $stmt->execute([$user['account_id']]);
    $row = $stmt->fetch();
    ok($row ? json_decode($row['data_json'], true) : new stdClass());
}

if (($method === 'PUT' || $method === 'POST') && $path === '/shared-data') {
    $user = requireDashboardUser();
    $body = jsonBody();
    if (!is_array($body)) {
        err('Invalid shared data');
    }
    ensureModuleDataSchema();
    $json = json_encode($body, JSON_UNESCAPED_UNICODE);
    getDB()->prepare("
        INSERT INTO account_shared_data (account_id, data_json) VALUES (?, ?)
        ON DUPLICATE KEY UPDATE data_json = VALUES(data_json), updated_at = NOW()
    ")->execute([$user['account_id'], $json]);
    ok();
}

// ============================================================
// TEAM MANAGEMENT FUNCTIONS
// ============================================================

function getAllTeams(string $accountId): array {
    $stmt = getDB()->prepare("
        SELECT t.id, t.name, t.description, t.created_by, t.created_at,
               COUNT(tm.user_id) as member_count,
               GROUP_CONCAT(tm.user_id) as member_ids
        FROM teams t
        LEFT JOIN team_members tm ON tm.team_id = t.id
        WHERE t.account_id = ?
        GROUP BY t.id
        ORDER BY t.created_at DESC
    ");
    $stmt->execute([$accountId]);
    return $stmt->fetchAll() ?: [];
}

function getTeamById(string $teamId): ?array {
    $stmt = getDB()->prepare("
        SELECT t.id, t.account_id, t.name, t.description, t.created_by, t.created_at
        FROM teams t
        WHERE t.id = ?
        LIMIT 1
    ");
    $stmt->execute([$teamId]);
    return $stmt->fetch() ?: null;
}

function getTeamMembers(string $teamId): array {
    $stmt = getDB()->prepare("
        SELECT u.id, u.name, u.email, u.initials, u.color, u.role, tm.role as team_role, tm.joined_at
        FROM team_members tm
        JOIN users u ON u.id = tm.user_id
        WHERE tm.team_id = ?
        ORDER BY tm.joined_at ASC
    ");
    $stmt->execute([$teamId]);
    return $stmt->fetchAll() ?: [];
}

function userIsTeamMember(string $userId, string $teamId): bool {
    $stmt = getDB()->prepare("
        SELECT id FROM team_members
        WHERE user_id = ? AND team_id = ?
        LIMIT 1
    ");
    $stmt->execute([$userId, $teamId]);
    return !!$stmt->fetch();
}

// ============================================================
// TEAM MANAGEMENT ENDPOINTS
// ============================================================

if ($method === 'GET' && $path === '/teams') {
    $user = requireDashboardUser();
    $teams = getAllTeams($user['account_id']);
    ok($teams);
}

if ($method === 'POST' && $path === '/teams') {
    $user = requireDashboardUser();
    $body = jsonBody();
    $name = trim($body['name'] ?? '');
    $description = trim($body['description'] ?? '');

    if ($name === '') {
        err('Team name is required');
    }

    $teamId = makeId('team_');
    
    getDB()->prepare("
        INSERT INTO teams (id, account_id, name, description, created_by)
        VALUES (?, ?, ?, ?, ?)
    ")->execute([$teamId, $user['account_id'], $name, $description ?: null, $user['id']]);

    // Add creator as team member
    $memberId = makeId('tm_');
    getDB()->prepare("
        INSERT INTO team_members (id, team_id, user_id, role)
        VALUES (?, ?, ?, 'lead')
    ")->execute([$memberId, $teamId, $user['id']]);

    ok([
        'id' => $teamId,
        'account_id' => $user['account_id'],
        'name' => $name,
        'description' => $description ?: null,
        'created_by' => $user['id'],
        'created_at' => date('Y-m-d H:i:s'),
        'members' => [userPayload($user)]
    ]);
}

if ($method === 'DELETE' && $path === '/teams') {
    $user = requireDashboardUser();
    $body = jsonBody();
    $teamId = trim((string)($body['team_id'] ?? ''));

    if ($teamId === '') {
        err('team_id is required');
    }

    $team = getTeamById($teamId);
    if (!$team) {
        err('Team not found', 404);
    }
    if ($team['account_id'] !== $user['account_id']) {
        err('Unauthorized', 403);
    }
    if ($team['created_by'] !== $user['id']) {
        err('Only team creator can delete teams', 403);
    }

    getDB()->prepare("DELETE FROM teams WHERE id = ?")->execute([$teamId]);
    ok();
}

if ($method === 'GET' && $path === '/teams/members') {
    $user = requireDashboardUser();
    $teamId = $_GET['team_id'] ?? '';

    if ($teamId === '') {
        err('team_id is required');
    }

    $team = getTeamById($teamId);
    if (!$team) {
        err('Team not found', 404);
    }
    if ($team['account_id'] !== $user['account_id']) {
        err('Unauthorized', 403);
    }

    $members = getTeamMembers($teamId);
    ok($members);
}

if ($method === 'POST' && $path === '/teams/members') {
    $user = requireDashboardUser();
    $body = jsonBody();
    $teamId = trim((string)($body['team_id'] ?? ''));
    $userId = trim((string)($body['user_id'] ?? ''));

    if ($teamId === '' || $userId === '') {
        err('team_id and user_id are required');
    }

    $team = getTeamById($teamId);
    if (!$team) {
        err('Team not found', 404);
    }
    if ($team['account_id'] !== $user['account_id']) {
        err('Unauthorized', 403);
    }

    // Verify user belongs to same account
    $checkUser = getDB()->prepare("SELECT id FROM users WHERE id = ? AND account_id = ?");
    $checkUser->execute([$userId, $user['account_id']]);
    if (!$checkUser->fetch()) {
        err('User must belong to the same account', 403);
    }

    // Check if already a member
    $checkMember = getDB()->prepare("SELECT id FROM team_members WHERE team_id = ? AND user_id = ?");
    $checkMember->execute([$teamId, $userId]);
    if ($checkMember->fetch()) {
        err('User is already a team member', 409);
    }

    $memberId = makeId('tm_');
    getDB()->prepare("
        INSERT INTO team_members (id, team_id, user_id, role)
        VALUES (?, ?, ?, 'member')
    ")->execute([$memberId, $teamId, $userId]);

    ok([
        'message' => 'User added to team',
        'members' => getTeamMembers($teamId)
    ]);
}

if ($method === 'DELETE' && $path === '/teams/members') {
    $user = requireDashboardUser();
    $body = jsonBody();
    $teamId = trim((string)($body['team_id'] ?? ''));
    $userId = trim((string)($body['user_id'] ?? ''));

    if ($teamId === '' || $userId === '') {
        err('team_id and user_id are required');
    }

    $team = getTeamById($teamId);
    if (!$team) {
        err('Team not found', 404);
    }
    if ($team['account_id'] !== $user['account_id']) {
        err('Unauthorized', 403);
    }

    // Verify the user exists in team
    $member = getDB()->prepare("SELECT id, role FROM team_members WHERE team_id = ? AND user_id = ?");
    $member->execute([$teamId, $userId]);
    $memberRow = $member->fetch();
    if (!$memberRow) {
        err('User is not a team member', 404);
    }

    // Prevent removing team lead
    if ($memberRow['role'] === 'lead') {
        err('Cannot remove team lead', 403);
    }

    getDB()->prepare("DELETE FROM team_members WHERE team_id = ? AND user_id = ?")->execute([$teamId, $userId]);
    ok([
        'message' => 'User removed from team',
        'members' => getTeamMembers($teamId)
    ]);
}

if ($method === 'GET' && $path === '/messages') {
    $user = requireDashboardUser();
    $channel = $_GET['channel'] ?? 'general';
    
    // Verify team access if channel is team-based
    if (str_starts_with($channel, 'team-')) {
        $teamId = substr($channel, 5);
        $team = getTeamById($teamId);
        if (!$team) {
            err('Team not found', 404);
        }
        if ($team['account_id'] !== $user['account_id']) {
            err('Unauthorized', 403);
        }
        if (!userIsTeamMember($user['id'], $teamId)) {
            err('You are not a member of this team', 403);
        }
    }
    
    $stmt = getDB()->prepare("
        SELECT m.id, m.channel, m.user_id, m.message, m.created_at,
               u.name AS user_name, u.initials, u.color, u.role
        FROM chat_messages m
        JOIN users u ON u.id = m.user_id
        WHERE m.channel = ? AND u.account_id = ?
        ORDER BY m.created_at ASC
        LIMIT 100
    ");
    $stmt->execute([$channel, $user['account_id']]);
    ok($stmt->fetchAll());
}

if ($method === 'POST' && $path === '/messages') {
    $user = requireDashboardUser();
    $body = jsonBody();
    $channel = $body['channel'] ?? 'general';
    $message = trim($body['message'] ?? '');
    if ($message === '') {
        err('message required');
    }

    // Verify team access if channel is team-based
    if (str_starts_with($channel, 'team-')) {
        $teamId = substr($channel, 5);
        $team = getTeamById($teamId);
        if (!$team) {
            err('Team not found', 404);
        }
        if ($team['account_id'] !== $user['account_id']) {
            err('Unauthorized', 403);
        }
        if (!userIsTeamMember($user['id'], $teamId)) {
            err('You are not a member of this team', 403);
        }
    }

    $db = getDB();
    $db->prepare("INSERT INTO chat_messages (channel, user_id, message) VALUES (?, ?, ?)")
        ->execute([$channel, $user['id'], $message]);
    $id = $db->lastInsertId();

    $stmt = $db->prepare("
        SELECT m.id, m.channel, m.user_id, m.message, m.created_at,
               u.name AS user_name, u.initials, u.color, u.role
        FROM chat_messages m
        JOIN users u ON u.id = m.user_id
        WHERE m.id = ?
    ");
    $stmt->execute([$id]);
    ok($stmt->fetch());
}

if ($method === 'GET' && $path === '/assignments') {
    $user = requireDashboardUser();
    $taskId = $_GET['task_id'] ?? null;
    if (!$taskId) {
        err('task_id required');
    }

    $stmt = getDB()->prepare("
        SELECT ta.assignee_id, u.name, u.initials, u.color, u.role
        FROM task_assignments ta
        JOIN users u ON u.id = ta.assignee_id
        WHERE ta.task_id = ? AND ta.owner_id = ?
    ");
    $stmt->execute([$taskId, $user['id']]);
    ok($stmt->fetchAll());
}

if ($method === 'POST' && $path === '/assignments') {
    $user = requireDashboardUser();
    $body = jsonBody();
    $taskId = $body['task_id'] ?? null;
    $uid = $body['assignee_id'] ?? null;
    if (!$taskId || !$uid) {
        err('task_id and assignee_id required');
    }

    $check = getDB()->prepare("SELECT id FROM users WHERE id = ? AND account_id = ?");
    $check->execute([$uid, $user['account_id']]);
    if (!$check->fetch()) {
        err('Assignee must belong to the same account', 403);
    }

    getDB()->prepare("
        INSERT IGNORE INTO task_assignments (task_id, owner_id, assignee_id) VALUES (?, ?, ?)
    ")->execute([$taskId, $user['id'], $uid]);
    ok();
}

if ($method === 'DELETE' && $path === '/assignments') {
    $user = requireDashboardUser();
    $body = jsonBody();
    $taskId = $body['task_id'] ?? null;
    $uid = $body['assignee_id'] ?? null;
    if (!$taskId || !$uid) {
        err('task_id and assignee_id required');
    }

    getDB()->prepare("
        DELETE FROM task_assignments WHERE task_id = ? AND owner_id = ? AND assignee_id = ?
    ")->execute([$taskId, $user['id'], $uid]);
    ok();
}

http_response_code(404);
echo json_encode(['ok' => false, 'error' => 'Endpoint not found']);

} catch (Throwable $e) {
    handleApiThrowable($e, $method ?? null, $path ?? null);
}
