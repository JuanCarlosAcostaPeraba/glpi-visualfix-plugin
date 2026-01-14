<?php

use Glpi\Plugin\Hooks;

/**
 * Init the plugin of the plugin.
 *
 * @return void
 */
function plugin_init_visualfix() {
   global $PLUGIN_HOOKS;

   $PLUGIN_HOOKS['csrf_compliant']['visualfix'] = true;

   if (Plugin::isPluginActive('visualfix')) {
      // Add CSS to the central interface
      $PLUGIN_HOOKS[Hooks::ADD_CSS]['visualfix'][] = 'css/visualfix.css';
   }
}

/**
 * Get the name and the version of the plugin.
 *
 * @return array
 */
function plugin_version_visualfix() {
   return [
      'name'           => 'Visual Fix',
      'version'        => '1.0.0',
      'author'         => 'Juan Carlos Acosta Peraba',
      'license'        => 'GPLv2+',
      'homepage'       => 'https://github.com/JuanCarlosAcostaPeraba/glpi-visualfix-plugin',
      'requirements'   => [
         'glpi' => [
            'min' => '11.0.0',
         ]
      ]
   ];
}

/**
 * Check prerequisites for the plugin.
 *
 * @return boolean
 */
function plugin_visualfix_check_prerequisites() {
   return true;
}

/**
 * Check configuration for the plugin.
 *
 * @param boolean $verbose Verbose mode
 *
 * @return boolean
 */
function plugin_visualfix_check_config($verbose = false) {
   if (true) { // No specific config for now
      return true;
   }
   if ($verbose) {
      echo "Installed / not configured";
   }
   return false;
}
