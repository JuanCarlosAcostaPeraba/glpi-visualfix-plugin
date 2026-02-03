<?php
include("../../../inc/includes.php");
$options = Search::getOptions('Project');
foreach ($options as $id => $opt) {
    if (isset($opt['name']) && (stripos($opt['name'], 'tag') !== false || stripos($opt['name'], 'etiqueta') !== false)) {
        echo "ID: $id | Name: " . $opt['name'] . "\n";
    }
}
