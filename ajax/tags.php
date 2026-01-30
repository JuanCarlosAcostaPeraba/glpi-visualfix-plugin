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

// Enable error reporting for this AJAX request to catch fatals
ini_set('display_errors', 1);
error_reporting(E_ALL);

try {
    Session::checkLoginUser();

    if (!class_exists('PluginTagTag')) {
        throw new Exception('Class PluginTagTag not found. Is the "tag" plugin installed and active?');
    }

    $searchText = $_GET['searchText'] ?? '';
    $page = (int) ($_GET['page'] ?? 1);
    $page_limit = 20;

    $tag = new PluginTagTag();
    $table = $tag->getTable();

    $criteria = [
        'SELECT' => ['id', 'name as text'],
        'FROM' => $table,
        'WHERE' => [
            'is_active' => 1
        ],
        'ORDER' => 'name ASC',
        'START' => ($page - 1) * $page_limit,
        'LIMIT' => $page_limit
    ];

    if (!empty($searchText)) {
        $criteria['WHERE']['name'] = ['LIKE', '%' . $searchText . '%'];
    }

    $iterator = $DB->request($criteria);
    $results = [];
    foreach ($iterator as $data) {
        $results[] = $data;
    }

    // Manual count to be safe with different DB versions
    $count_criteria = [
        'SELECT' => ['COUNT(*) as cpt'],
        'FROM' => $table,
        'WHERE' => [
            'is_active' => 1
        ]
    ];
    if (!empty($searchText)) {
        $count_criteria['WHERE']['name'] = ['LIKE', '%' . $searchText . '%'];
    }

    $count_iterator = $DB->request($count_criteria);
    $total_count = 0;
    if ($count_row = $count_iterator->current()) {
        $total_count = $count_row['cpt'];
    }

    $has_more = ($page * $page_limit) < $total_count;

    echo json_encode([
        'results' => $results,
        'pagination' => ['more' => $has_more]
    ]);

} catch (\Throwable $e) {
    header("HTTP/1.1 500 Internal Server Error");
    echo json_encode([
        'error' => $e->getMessage(),
        'file' => $e->getFile(),
        'line' => $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
}
