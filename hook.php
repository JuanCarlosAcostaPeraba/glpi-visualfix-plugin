<?php

/**
 * Install hook
 *
 * @return boolean
 */
function plugin_visualfix_install()
{
    return true;
}

/**
 * Uninstall hook
 *
 * @return boolean
 */
function plugin_visualfix_uninstall()
{
    return true;
}

/**
 * Kanban filters hook - Placeholder to prevent cache errors
 *
 * @param string $itemtype
 * @return array
 */
function plugin_visualfix_kanban_filters($itemtype)
{
    // Return empty to avoid duplication with Tag plugin
    return [];
}
