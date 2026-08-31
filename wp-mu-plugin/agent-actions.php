<?php
/**
 * Plugin Name: Agent Actions (AI predlogi)
 * Description: CPT za predloge AI agenta — nabiralnik odobritev v dashboardu.
 *
 * NAMESTITEV: kopiraj to datoteko v WordPress:
 *   wp-content/mu-plugins/agent-actions.php
 * (mapo mu-plugins po potrebi ustvari). mu-plugini se naložijo samodejno.
 */

add_action('init', function () {
    register_post_type('agent_action', [
        'label'        => 'AI predlogi',
        'public'       => false,
        'show_ui'      => true,
        'show_in_rest' => true,           // dostopno prek /wp-json/wp/v2/agent_action
        'supports'     => ['title', 'custom-fields'],
    ]);

    foreach (['kind', 'endpoint', 'payload', 'summary', 'status', 'result', 'decided_by'] as $key) {
        register_post_meta('agent_action', $key, [
            'type'          => 'string',
            'single'        => true,
            'show_in_rest'  => true,
            'auth_callback' => function () {
                return current_user_can('edit_posts');
            },
        ]);
    }
});
