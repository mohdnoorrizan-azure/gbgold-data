<?php
/*
Plugin Name: GBGold Dashboard Sync Engine
Plugin URI: https://infogbgold.my
Description: Enjin penyelarasan automatik dari GitHub ke WordPress untuk Dashboard GBGold.
Version: 1.1.0
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
        return; // Bukan webhook request, abaikan
    }

    $key = isset($_GET['key']) ? sanitize_text_field($_GET['key']) : '';
    $secure_key = 'gbgold-sync-2026';

    if ($key !== $secure_key) {
        status_header(403);
        header('Content-Type: application/json');
        echo json_encode(array("success" => false, "message" => "Akses ditolak. Kunci keselamatan salah."));
        exit;
    }

    // Had kadar penyelarasan (1 kali setiap 60 saat)
    $last_sync = get_transient('gbgold_last_sync');
    if ($last_sync) {
        status_header(429);
        header('Content-Type: application/json');
        echo json_encode(array("success" => false, "message" => "Had laju dicapai. Sila tunggu 60 saat."));
        exit;
    }
    set_transient('gbgold_last_sync', time(), 60);

    // Hantar maklum balas 200 OK serta-merta
    status_header(200);
    header('Content-Type: application/json');
    echo json_encode(array("success" => true, "message" => "Isyarat diterima. Memulakan penyelarasan..."));

    // Tutup sambungan dan jalankan sync di latar belakang
    if (function_exists('fastcgi_finish_request')) {
        fastcgi_finish_request();
    }

    // Jalankan proses penyelarasan
    gbgold_execute_sync();
    exit;
}

function gbgold_execute_sync() {
    $repo_owner = 'mohdnoorrizan-azure';
    $repo_name  = 'gbgold-data';
    $branch     = 'main';

    // GITHUB TOKEN (Kosong jika repo PUBLIC)
    $github_token = '';

    $url = "https://api.github.com/repos/{$repo_owner}/{$repo_name}/zipball/{$branch}";

    $args = array(
        'timeout'  => 300,
        'headers'  => array(
            'User-Agent' => 'WordPress GBGold Sync Engine',
            'Accept'     => 'application/vnd.github+json'
        )
    );

    if (!empty($github_token)) {
        $args['headers']['Authorization'] = 'token ' . $github_token;
    }

    $response = wp_remote_get($url, $args);

    if (is_wp_error($response)) {
        error_log("GBGold Sync Error: " . $response->get_error_message());
        return;
    }

    $http_code = wp_remote_retrieve_response_code($response);
    if ($http_code !== 200) {
        error_log("GBGold Sync Error: GitHub returned HTTP " . $http_code);
        return;
    }

    $zip_content = wp_remote_retrieve_body($response);

    // Simpan ke fail sementara
    $tmp_file = wp_tempnam('gbgold_sync_');
    if (!$tmp_file) {
        error_log("GBGold Sync Error: Gagal membuat fail sementara.");
        return;
    }

    file_put_contents($tmp_file, $zip_content);

    // Ekstrak fail zip
    require_once(ABSPATH . 'wp-admin/includes/file.php');
    WP_Filesystem();

    $target_dir = plugin_dir_path(__FILE__) . 'dashboard/';

    if (!file_exists($target_dir)) {
        wp_mkdir_p($target_dir);
    }

    $tmp_extract_dir = $target_dir . 'tmp_extract/';
    $unzipfile = unzip_file($tmp_file, $tmp_extract_dir);
    @unlink($tmp_file);

    if (is_wp_error($unzipfile)) {
        error_log("GBGold Sync Error: " . $unzipfile->get_error_message());
        gbgold_recursive_rmdir($tmp_extract_dir);
        return;
    }

    // GitHub membungkus dalam folder dinamik
    $extracted_folders = glob($tmp_extract_dir . '*', GLOB_ONLYDIR);
    if (empty($extracted_folders)) {
        error_log("GBGold Sync Error: Folder hasil ekstrak tidak dijumpai.");
        gbgold_recursive_rmdir($tmp_extract_dir);
        return;
    }

    $source_dir = $extracted_folders[0] . '/';

    // Hanya salin fail kod (BUKAN data.json)
    $files_to_copy = array('index.html', 'styles.css', 'app.js', 'save_data.php');

    foreach ($files_to_copy as $file) {
        $src = $source_dir . $file;
        $dst = $target_dir . $file;

        if (file_exists($src)) {
            @copy($src, $dst);
            error_log("GBGold Sync: {$file} berjaya disalin.");
        }
    }

    // Padam folder sementara
    gbgold_recursive_rmdir($tmp_extract_dir);

    // Kosongkan cache
    if (class_exists('LiteSpeed_Cache_API') && method_exists('LiteSpeed_Cache_API', 'purge_all')) {
        LiteSpeed_Cache_API::purge_all();
    }
    if (function_exists('opcache_reset')) {
        @opcache_reset();
    }

    error_log("GBGold Sync: Penyelarasan selesai sepenuhnya!");
}

function gbgold_recursive_rmdir($dir) {
    if (!is_dir($dir)) {
        return;
    }
    $objects = scandir($dir);
    foreach ($objects as $object) {
        if ($object === '.' || $object === '..') {
            continue;
        }
        $path = $dir . '/' . $object;
        if (is_dir($path) && !is_link($path)) {
            gbgold_recursive_rmdir($path);
        } else {
            @unlink($path);
        }
    }
    @rmdir($dir);
}
