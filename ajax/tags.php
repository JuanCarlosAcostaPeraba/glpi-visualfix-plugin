<?php

// Check if GLPI is being included correctly
$ajax_include = true;
$relative_path = "../../../inc/includes.php";
$abs_path = realpath(__DIR__ . "/" . $relative_path);

if (!$abs_path || !file_exists($abs_path)) {
    header("HTTP/1.1 500 Internal Server Error");
    header("Content-Type: application/json; charset=UTF-8");
    echo json_encode([
        'error' => 'GLPI includes.php not found',
        'searched' => $abs_path ?: (__DIR__ . "/" . $relative_path),
        'dir' => __DIR__
    ]);
    exit;
}

include($abs_path);

header("Content-Type: application/json; charset=UTF-8");
Html::header_nocache();

// Custom error handler to catch everything and return as JSON
function customErrorHandler($errno, $errstr, $errfile, $errline)
{
    if (!(error_reporting() & $errno))
        return false;
    header("HTTP/1.1 500 Internal Server Error");
    echo json_encode([
        'error_type' => 'PHP Error',
        'message' => $errstr,
        'file' => $errfile,
        'line' => $errline
    ]);
    exit;
}
set_error_handler("customErrorHandler");

// Custom exception handler
set_exception_handler(function ($e) {
    header("HTTP/1.1 500 Internal Server Error");
    echo json_encode([
        'error_type' => 'Exception',
        'message' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => explode("\n", $e->getTraceAsString())
    ]);
    exit;
});

try {
    global $DB;

    if (!class_exists('Session')) {
        throw new Exception('Class "Session" not found. Check GLPI core.');
    }

    Session::checkLoginUser();

    if (!class_exists('PluginTagTag')) {
        throw new Exception('Class "PluginTagTag" not found. Check if the "tag" plugin is active.');
    }

    $searchText = $_GET['searchText'] ?? '';
    if ($searchText === 'undefined') {
        $searchText = '';
    }
    $page = (int) ($_GET['page'] ?? 1);
    $page_limit = 20;

    $tag = new PluginTagTag();
    $table = $tag->getTable();

    $where = [
        'is_active' => 1
    ];

    if (!empty($searchText)) {
        $where['name'] = ['LIKE', '%' . $searchText . '%'];
    }

    // Standard identification/entity restriction if applicable
    if ($tag->isEntityAssign()) {
        $entities_criteria = getEntitiesRestrictCriteria($table, '', '', true);
        if (is_array($entities_criteria) && count($entities_criteria) > 0) {
            $where[] = current($entities_criteria);
        }
    }

    $query = [
        'SELECT' => ['id', 'name as text', 'color'],
        'FROM' => $table,
        'WHERE' => $where,
        'ORDER' => 'name ASC',
        'START' => ($page - 1) * $page_limit,
        'LIMIT' => $page_limit
    ];

    $iterator = $DB->request($query);

    $results = [];
    foreach ($iterator as $data) {
        $results[] = $data;
    }

    $total_count = countElementsInTable($table, $where);
    $has_more = ($page * $page_limit) < $total_count;

    echo json_encode([
        'results' => $results,
        'pagination' => ['more' => $has_more],
        'debug' => [
            'where' => $where,
            'count' => $total_count,
            'query' => $query
        ]
    ]);

} catch (\Throwable $e) {
    header("HTTP/1.1 500 Internal Server Error");
    echo json_encode([
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => explode("\n", $e->getTraceAsString())
    ]);
}
