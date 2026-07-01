<?php
/*
Plugin Name: GBGold Dashboard Sync Engine
Plugin URI: https://infogbgold.my
Description: Enjin penyelarasan automatik dari GitHub ke WordPress untuk Dashboard GBGold.
Version: 1.2.0
Author: Antigravity AI
Author URI: https://deepmind.google
License: GPL2
*/

if (!defined('ABSPATH')) {
    exit;
}

// Dengar isyarat webhook
add_action('init', 'gbgold_webhook_listener');

// Daftar Shortcode
add_shortcode('infogbgold_dashboard', 'gbgold_dashboard_shortcode_render');

function gbgold_dashboard_shortcode_render() {
    $url = plugin_dir_url(__FILE__) . 'dashboard/index.html?v=' . time();
    return '<iframe src="' . esc_url($url) . '" width="100%" height="1250px" style="border:none; border-radius:16px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); margin-bottom: 24px;"></iframe>';
}

function gbgold_webhook_listener() {
    if (!isset($_GET['gbgold_webhook']) || $_GET['gbgold_webhook'] != '1') {
        return;
    }

    $key = isset($_GET['key']) ? sanitize_text_field($_GET['key']) : '';
    $secure_key = 'gbgold-sync-2026';

    if ($key !== $secure_key) {
        status_header(403);
        header('Content-Type: application/json');
        echo json_encode(array("success" => false, "message" => "Akses ditolak."));
        exit;
    }

    // Had kadar (1 kali setiap 60 saat)
    $last_sync = get_transient('gbgold_last_sync');
    if ($last_sync) {
        status_header(429);
        header('Content-Type: application/json');
        echo json_encode(array("success" => false, "message" => "Sila tunggu 60 saat."));
        exit;
    }
    set_transient('gbgold_last_sync', time(), 60);

    // Jalankan sync terus (tanpa background process untuk elak masalah)
    $result = gbgold_execute_sync();

    status_header(200);
    header('Content-Type: application/json');
    echo json_encode($result);
    exit;
}

function gbgold_execute_sync() {
    $repo_owner = 'mohdnoorrizan-azure';
    $repo_name  = 'gbgold-data';
    $branch     = 'main';
    $github_token = ''; // Kosong jika repo PUBLIC

    // Senarai fail yang perlu dimuat turun (BUKAN data.json)
    $files = array('index.html', 'styles.css', 'app.js', 'save_data.php');

    $target_dir = plugin_dir_path(__FILE__) . 'dashboard/';

    // Bina folder jika belum wujud
    if (!file_exists($target_dir)) {
        wp_mkdir_p($target_dir);
    }

    $success_count = 0;
    $errors = array();

    foreach ($files as $file) {
        // Muat turun fail secara individu dari GitHub Raw
        $raw_url = "https://raw.githubusercontent.com/{$repo_owner}/{$repo_name}/{$branch}/{$file}";

        $args = array(
            'timeout' => 60,
            'headers' => array(
                'User-Agent' => 'WordPress GBGold Sync'
            )
        );

        if (!empty($github_token)) {
            $args['headers']['Authorization'] = 'token ' . $github_token;
        }

        $response = wp_remote_get($raw_url, $args);

        if (is_wp_error($response)) {
            $errors[] = $file . ': ' . $response->get_error_message();
            error_log("GBGold Sync Error [{$file}]: " . $response->get_error_message());
            continue;
        }

        $http_code = wp_remote_retrieve_response_code($response);
        if ($http_code !== 200) {
            $errors[] = $file . ': HTTP ' . $http_code;
            error_log("GBGold Sync Error [{$file}]: HTTP {$http_code}");
            continue;
        }

        $content = wp_remote_retrieve_body($response);
        $result = @file_put_contents($target_dir . $file, $content);

        if ($result !== false) {
            $success_count++;
            error_log("GBGold Sync: {$file} berjaya disalin.");
        } else {
            $errors[] = $file . ': Gagal menulis fail';
            error_log("GBGold Sync Error: Gagal menulis {$file}");
        }
    }

    // Kosongkan cache
    if (class_exists('LiteSpeed_Cache_API') && method_exists('LiteSpeed_Cache_API', 'purge_all')) {
        LiteSpeed_Cache_API::purge_all();
    }
    if (function_exists('opcache_reset')) {
        @opcache_reset();
    }

    if ($success_count === count($files)) {
        error_log("GBGold Sync: Penyelarasan selesai! {$success_count} fail berjaya.");
        return array(
            "success" => true,
            "message" => "Penyelarasan selesai! {$success_count} fail berjaya dimuat turun."
        );
    } else {
        $msg = "{$success_count}/" . count($files) . " fail berjaya. Ralat: " . implode(', ', $errors);
        error_log("GBGold Sync: " . $msg);
        return array(
            "success" => false,
            "message" => $msg
        );
    }
}
